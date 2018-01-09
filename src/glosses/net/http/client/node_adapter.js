const {
    is,
    net: {
        http
    }
} = adone;

const __ = adone.private(http.client);

/**
 * Build a URL by appending params to the end
 *
 * @param {string} url The base of the url (e.g., http://www.google.com)
 * @param {object} [params] The params to be appended
 * @returns {string} The formatted url
 */
const buildURL = (url, params, paramsSerializer) => {
    if (!params) {
        return url;
    }

    let serializedParams;
    if (paramsSerializer) {
        serializedParams = paramsSerializer(params);
    } else {
        serializedParams = adone.util.querystring.stringify(params);
    }

    if (serializedParams) {
        url += (!url.includes("?") ? "?" : "&") + serializedParams;
    }

    return url;
};


export default function adapter(config) {
    return new Promise((resolve, reject) => {
        let data = config.data;
        const headers = config.headers;
        let timer;

        if (!is.string(headers["User-Agent"]) && !is.string(headers["user-agent"])) {
            headers["User-Agent"] = `Adone/${adone.package.version}`;
        }

        if (data && !is.stream(data)) {
            if (is.buffer(data)) {
                // Nothing to do...
            } else if (is.arrayBuffer(data)) {
                data = Buffer.from(new Uint8Array(data));
            } else if (is.string(data)) {
                data = Buffer.from(data, "utf-8");
            } else {
                return reject(__.createError("Data after transformation must be a string, an ArrayBuffer, a Buffer, or a Stream'", config));
            }

            // Add Content-Length header if data exists
            headers["Content-Length"] = data.length;
        } else if (is.nil(data)) {
            delete headers["Content-Type"];
        }

        // HTTP basic authentication
        let auth = undefined;
        if (config.auth) {
            auth = `${config.auth.username || ""}:${config.auth.password || ""}`;
        }

        // Parse url
        const parsedUrl = adone.std.url.parse(config.url);
        const protocol = parsedUrl.protocol || "http:";

        if (!auth && parsedUrl.auth) {
            const urlAuth = parsedUrl.auth.split(":");
            auth = `${urlAuth[0] || ""}:${urlAuth[1] || ""}`;
        }

        if (auth) {
            delete headers.Authorization;
        }

        const isHttps = protocol === "https:";
        const agent = isHttps ? config.httpsAgent : config.httpAgent;

        const nodeOptions = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port,
            path: buildURL(parsedUrl.path, config.params, config.paramsSerializer).replace(/^\?/, ""),
            method: config.method.toUpperCase(),
            headers,
            agent,
            auth
        };

        if (isHttps) {
            nodeOptions.rejectUnauthorized = is.boolean(config.rejectUnauthorized) ? config.rejectUnauthorized : true;
        }

        let proxy = config.proxy;
        if (!proxy && proxy !== false) {
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
                const base64 = Buffer.from(`${proxy.auth.username}:${proxy.auth.password}`, "utf8").toString("base64");
                nodeOptions.headers["Proxy-Authorization"] = `Basic ${base64}`;
            }
        }

        let transport;
        if (config.transport) {
            transport = config.transport;
        } else if (config.maxRedirects === 0) {
            transport = isHttps ? adone.std.https : adone.std.http;
        } else {
            nodeOptions.maxRedirects = config.maxRedirects;
            transport = isHttps ? http.followRedirects.https : http.followRedirects.http;
        }

        const req = transport.request(nodeOptions, (res) => {
            if (req.aborted) {
                return;
            }

            // Response has been received so kill timer that handles request timeout
            clearTimeout(timer);
            timer = null;

            // uncompress the response body transparently if required
            let stream = res;
            switch (res.headers["content-encoding"]) {
                case "gzip":
                case "compress":
                case "deflate":
                    // add the unzipper to the body stream processing pipeline
                    stream = stream.pipe(adone.std.zlib.createUnzip());

                    // remove the content-encoding in order to not confuse downstream operations
                    delete res.headers["content-encoding"];
                    break;
            }

            // return the last request in case of redirects
            const lastRequest = res.req || req;

            const response = {
                status: res.statusCode,
                statusText: res.statusMessage,
                headers: res.headers,
                config,
                request: lastRequest
            };

            if (config.responseType === "stream") {
                response.data = stream;
                __.settle(resolve, reject, response);
            } else {
                const responseBuffer = [];
                stream.on("data", function handleStreamData(chunk) {
                    responseBuffer.push(chunk);

                    // make sure the content length is not over the maxContentLength if specified
                    if (config.maxContentLength > -1 && Buffer.concat(responseBuffer).length > config.maxContentLength) {
                        reject(__.createError(`maxContentLength size of ${config.maxContentLength} exceeded`, config, null, lastRequest));
                    }
                });

                stream.on("error", function handleStreamError(err) {
                    if (req.aborted) {
                        return;
                    }
                    reject(__.enhanceError(err, config, null, lastRequest));
                });

                stream.on("end", function handleStreamEnd() {
                    let responseData = Buffer.concat(responseBuffer);
                    if (config.responseType !== "arraybuffer") {
                        responseData = responseData.toString("utf8");
                    }

                    response.data = responseData;
                    __.settle(resolve, reject, response);
                });
            }
        });

        req.on("error", (err) => {
            if (!req.aborted) {
                reject(__.enhanceError(err, config, null, req));
            }
        });

        if (config.timeout && !timer) {
            timer = setTimeout(() => {
                req.abort();
                reject(__.createError(`timeout of ${config.timeout}ms exceeded`, config, "ECONNABORTED", req));
            }, config.timeout);
        }

        if (config.cancelToken) {
            config.cancelToken.promise.then((cancel) => {
                if (!req.aborted) {
                    req.abort();
                    reject(cancel);
                }
            });
        }

        let uploadProgress;
        if (is.function(config.onUploadProgress)) {
            uploadProgress = config.onUploadProgress;
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
