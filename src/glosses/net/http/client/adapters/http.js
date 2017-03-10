

const imports = adone.lazify({
    settle: "../core/settle",
    buildURL: "../helpers/build_url",
    createError: "../core/create_error",
    enhanceError: "../core/enhance_error",
    follow: "../helpers/follow_redirects"
}, null, require);

export default function httpAdapter(config) {
    return new Promise((resolve, reject) => {
        let data = config.data;
        const headers = config.headers;
        let timer;
        let aborted = false;

        // Set User-Agent (required by some servers)
        // Only set header if it hasn't been set in config
        // See https://github.com/mzabriskie/axios/issues/69
        if (!headers["User-Agent"] && !headers["user-agent"]) {
            headers["User-Agent"] = "arequest";
        }

        if (data && !adone.is.stream(data)) {
            if (adone.is.arrayBuffer(data)) {
                data = new Buffer(new Uint8Array(data));
            } else if (adone.is.string(data)) {
                data = new Buffer(data, "utf-8");
            } else {
                return reject(imports.createError(
                    "Data after transformation must be a string, an ArrayBuffer, or a Stream",
                    config
                ));
            }

            // Add Content-Length header if data exists
            headers["Content-Length"] = data.length;
        } else if (data === null || data === undefined) {
            delete headers["Content-Type"];
        }

        // HTTP basic authentication
        let auth = undefined;
        if (config.auth) {
            auth = `${config.auth.username || ""}:${config.auth.password || ""}`;
        }

        // Parse url
        const parsed = adone.std.url.parse(config.url);
        const protocol = parsed.protocol || "http:";

        if (!auth && parsed.auth) {
            const urlAuth = parsed.auth.split(":");
            auth = `${urlAuth[0] || ""}:${urlAuth[1] || ""}`;
        }

        if (auth) {
            delete headers.Authorization;
        }

        const isHttps = protocol === "https:";
        const agent = isHttps ? config.httpsAgent : config.httpAgent;

        const options = {
            hostname: parsed.hostname,
            port: parsed.port,
            path: imports.buildURL(parsed.path, config.params, config.paramsSerializer).replace(/^\?/, ""),
            method: config.method,
            headers,
            agent,
            auth
        };

        let proxy = config.proxy;
        if (!proxy) {
            const proxyEnv = `${protocol.slice(0, -1)}_proxy`;
            const proxyUrl = process.env[proxyEnv] || process.env[proxyEnv.toUpperCase()];
            if (proxyUrl) {
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
            options.hostname = proxy.host;
            options.host = proxy.host;
            options.headers.host = parsed.hostname + (parsed.port ? ":" + parsed.port : "");
            options.port = proxy.port;
            options.path = `${protocol}//${parsed.hostname}${parsed.port ? `:${parsed.port}` : ""}${options.path}`;

            // Basic proxy authorization
            if (proxy.auth) {
                const base64 = new Buffer(`${proxy.auth.username}:${proxy.auth.password}`, "utf8").toString("base64");
                options.headers["Proxy-Authorization"] = `Basic ${base64}`;
            }
        }

        let transport;
        if (config.maxRedirects === 0) {
            transport = isHttps ? adone.std.https : adone.std.http;
        } else {
            if (config.maxRedirects) {
                options.maxRedirects = config.maxRedirects;
            }
            transport = isHttps ? imports.follow.https : imports.follow.http;
        }

        // Create the request
        const req = transport.request(options, function handleResponse(res) {
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
                config,
                request: req
            };

            if (config.responseType === "stream") {
                response.data = stream;
                imports.settle(resolve, reject, response);
            } else {
                const responseBuffer = [];
                stream.on("data", function handleStreamData(chunk) {
                    responseBuffer.push(chunk);

                    // make sure the content length is not over the maxContentLength if specified
                    if (config.maxContentLength > -1 && Buffer.concat(responseBuffer).length > config.maxContentLength) {
                        reject(imports.createError(`maxContentLength size of ${config.maxContentLength} exceeded`, config));
                    }
                });

                stream.on("error", function handleStreamError(err) {
                    if (aborted) return;
                    reject(imports.enhanceError(err, config));
                });

                stream.on("end", function handleStreamEnd() {
                    let responseData = Buffer.concat(responseBuffer);
                    if (config.responseType !== "arraybuffer") {
                        responseData = responseData.toString("utf8");
                    }

                    response.data = responseData;
                    imports.settle(resolve, reject, response);
                });
            }
        });

        // Handle errors
        req.on("error", function handleRequestError(err) {
            if (aborted) {
                return;
            }
            reject(imports.enhanceError(err, config));
        });

        // Handle request timeout
        if (config.timeout && !timer) {
            timer = setTimeout(function handleRequestTimeout() {
                req.abort();
                reject(imports.createError(`timeout of ${config.timeout}ms exceeded`, config, "ECONNABORTED"));
                aborted = true;
            }, config.timeout);
        }

        if (config.cancelToken) {
            // Handle cancellation
            config.cancelToken.promise.then(function onCanceled(cancel) {
                if (aborted) {
                    return;
                }

                req.abort();
                reject(cancel);
                aborted = true;
            });
        }

        // Send the request
        if (adone.is.stream(data)) {
            data.pipe(req);
        } else {
            req.end(data);
        }
    });
}
