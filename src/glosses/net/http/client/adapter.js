const { is } = adone;

const imports = adone.lazify({
    createError: "./create_error",
    enhanceError: "./enhance_error",
    followRedirects: "./follow_redirects",
    settle: "./settle"
}, null, require);


/**
 * Build a URL by appending params to the end
 *
 * @param {string} url The base of the url (e.g., http://www.google.com)
 * @param {object} [params] The params to be appended
 * @returns {string} The formatted url
 */
function buildURL(url, params, paramsSerializer) {
    if (!params) {
        return url;
    }

    let serializedParams;
    if (paramsSerializer) {
        serializedParams = paramsSerializer(params);
    } else {
        serializedParams = adone.std.querystring.encode(params);
    }

    if (serializedParams) {
        url += (url.indexOf("?") === -1 ? "?" : "&") + serializedParams;
    }

    return url;
}


export default function adapter(options) {
    return new Promise((resolve, reject) => {
        let data = options.data;
        const headers = options.headers;
        let timer;
        let aborted = false;

        if (!is.string(headers["User-Agent"]) && !is.string(headers["user-agent"])) {
            headers["User-Agent"] = `Adone/${adone.package.version}`;
        }

        if (data && !is.stream(data)) {
            if (is.arrayBuffer(data)) {
                data = new Buffer(new Uint8Array(data));
            } else if (is.string(data)) {
                data = new Buffer(data, "utf-8");
            } else {
                return reject(imports.createError("Data after transformation must be a string, an ArrayBuffer, or a Stream", options));
            }

            // Add Content-Length header if data exists
            headers["Content-Length"] = data.length;
        } else if (data === null || data === undefined) {
            delete headers["Content-Type"];
        }

        // HTTP basic authentication
        let auth = undefined;
        if (options.auth) {
            auth = `${options.auth.username || ""}:${options.auth.password || ""}`;
        }

        // Parse url
        const parsedUrl = adone.std.url.parse(options.url);
        const protocol = parsedUrl.protocol || "http:";

        if (!auth && parsedUrl.auth) {
            const urlAuth = parsedUrl.auth.split(":");
            auth = `${urlAuth[0] || ""}:${urlAuth[1] || ""}`;
        }

        if (auth) {
            delete headers.Authorization;
        }

        const isHttps = protocol === "https:";
        const agent = isHttps ? options.httpsAgent : options.httpAgent;

        const nodeOptions = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port,
            path: buildURL(parsedUrl.path, options.params, options.paramsSerializer).replace(/^\?/, ""),
            method: options.method,
            headers,
            agent,
            auth
        };

        if (isHttps) {
            nodeOptions.rejectUnauthorized = is.boolean(options.rejectUnauthorized) ? options.rejectUnauthorized : true;
        }

        let proxy = options.proxy;
        if (is.nil(proxy)) {
            const proxyEnv = `${protocol.slice(0, -1)}_proxy`;
            const proxyUrl = process.env[proxyEnv] || process.env[proxyEnv.toUpperCase()];
            if (is.string(proxyUrl)) {
                const parsedProxyUrl = adone.std.url.parse(proxyUrl);
                proxy = {
                    host: parsedProxyUrl.hostname,
                    port: parsedProxyUrl.port
                };

                if (parsedProxyUrl.auth) {
                    const proxyUrlAuth = parsedProxyUrl.auth.split(":");
                    proxy.auth = {
                        username: proxyUrlAuth[0],
                        password: proxyUrlAuth[1]
                    };
                }
            }
        }

        if (proxy) {
            nodeOptions.hostname = proxy.host;
            nodeOptions.host = proxy.host;
            nodeOptions.headers.host = parsedUrl.hostname + (parsedUrl.port ? `:${parsedUrl.port}` : "");
            nodeOptions.port = proxy.port;
            nodeOptions.path = `${protocol}//${parsedUrl.hostname}${parsedUrl.port ? `:${parsedUrl.port}` : ""}${nodeOptions.path}`;

            // Basic proxy authorization
            if (proxy.auth) {
                const base64 = new Buffer(`${proxy.auth.username}:${proxy.auth.password}`, "utf8").toString("base64");
                nodeOptions.headers["Proxy-Authorization"] = `Basic ${base64}`;
            }
        }

        let transport;
        if (options.maxRedirects === 0) {
            transport = isHttps ? adone.std.https : adone.std.http;
        } else {
            nodeOptions.maxRedirects = options.maxRedirects;
            transport = isHttps ? imports.followRedirects.https : imports.followRedirects.http;
        }

        const req = transport.request(nodeOptions, (res) => {
            if (aborted) {
                return;
            }

            // Response has been received so kill timer that handles request timeout
            clearTimeout(timer);
            timer = null;

            // uncompress the response body transparently if required
            let stream = res;
            switch (res.headers["content-encoding"]) {
                /*eslint default-case:0*/
                case "gzip":
                case "compress":
                case "deflate":
                    // add the unzipper to the body stream processing pipeline
                    stream = stream.pipe(adone.std.zlib.createUnzip());

                    // remove the content-encoding in order to not confuse downstream operations
                    delete res.headers["content-encoding"];
                    break;
            }

            const response = {
                status: res.statusCode,
                statusText: res.statusMessage,
                headers: res.headers,
                options,
                request: req
            };

            if (options.responseType === "stream") {
                response.data = stream;
                imports.settle(resolve, reject, response);
            } else {
                const responseBuffer = [];
                stream.on("data", function handleStreamData(chunk) {
                    responseBuffer.push(chunk);

                    // make sure the content length is not over the maxContentLength if specified
                    if (options.maxContentLength > -1 && Buffer.concat(responseBuffer).length > options.maxContentLength) {
                        reject(imports.createError(`maxContentLength size of ${options.maxContentLength} exceeded`, options));
                    }
                });

                stream.on("error", function handleStreamError(err) {
                    if (aborted) {
                        return;
                    }
                    reject(imports.enhanceError(err, options));
                });

                stream.on("end", function handleStreamEnd() {
                    let responseData = Buffer.concat(responseBuffer);
                    if (options.responseType !== "arraybuffer") {
                        responseData = responseData.toString("utf8");
                    }

                    response.data = responseData;
                    imports.settle(resolve, reject, response);
                });
            }
        });

        req.on("error", (err) => {
            if (!aborted) {
                reject(imports.enhanceError(err, options));
            }
        });

        if (options.timeout && !timer) {
            timer = setTimeout(() => {
                req.abort();
                reject(imports.createError(`timeout of ${options.timeout}ms exceeded`, options, "ECONNABORTED"));
                aborted = true;
            }, options.timeout);
        }

        if (options.cancelToken) {
            options.cancelToken.promise.then((cancel) => {
                if (!aborted) {
                    req.abort();
                    reject(cancel);
                    aborted = true;
                }
            });
        }

        // if (typeof options.onDownloadProgress === "function") {
        //     request.addEventListener("progress", options.onDownloadProgress);
        // }

        let uploadProgress;
        if (is.function(options.onUploadProgress)) {
            uploadProgress = options.onUploadProgress;
        } else {
            uploadProgress = adone.noop;
        }

        const eventData = {
            lengthComputable: true,
            loaded: 0,
            total: headers["Content-Length"] || 0
        };

        if (is.nil(data)) {
            req.end(data);
            uploadProgress(eventData);
            return;
        } else if (!is.stream(data)) {
            if (data.length <= adone.stream.buffer.DEFAULT_INITIAL_SIZE) {
                req.end(data);
                eventData.loaded = eventData.total = data.length;
                uploadProgress(eventData);
                return;
            }
            const stream = new adone.stream.buffer.ReadableStream();
            stream.put(data);
            stream.stop();
            data = stream;
            eventData.total = data.length;
        } else {
            eventData.lengthComputable = false;
        }

        const counter = new adone.stream.CountingStream();

        counter.on("data", () => {
            eventData.loaded = counter.count;
            uploadProgress(eventData);
        });

        data.pipe(counter).pipe(req);
    });
}
