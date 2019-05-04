import { buildURL } from "../helpers";

const {
    is,
    error: x,
    http,
    util
} = adone;

const __ = adone.getPrivate(http.client);

const isHttps = /https:?/;

export default async function adapter(config) {
    let data = config.data;
    const headers = config.headers;

    if (!is.string(headers["User-Agent"]) && !is.string(headers["user-agent"])) {
        headers["User-Agent"] = `Adone/${adone.package.version}`;
    }

    const { responseEncoding = "utf8" } = config;

    if (!util.iconv.encodingExists(responseEncoding)) {
        throw new x.InvalidArgument(`Invalid responseEncoding: ${config.responseEncoding}`);
    }

    if (config.formData) {
        const form = new http.client.FormData();
        const appendFormValue = function (key, value) {
            if (value && value.hasOwnProperty("value") && value.hasOwnProperty("options")) {
                form.append(key, value.value, value.options);
            } else {
                form.append(key, value);
            }
        };
        for (const formKey in config.formData) {
            if (config.formData.hasOwnProperty(formKey)) {
                const formValue = config.formData[formKey];
                if (is.array(formValue)) {
                    for (let j = 0; j < formValue.length; j++) {
                        appendFormValue(formKey, formValue[j]);
                    }
                } else {
                    appendFormValue(formKey, formValue);
                }
            }
        }
        // replace the data stream???
        data = form;

        headers["Content-Type"] = `multipart/form-data; boundary=${form.getBoundary()}`;

        const contentLength = await new Promise((resolve, reject) => {
            form.getLength((err, len) => {
                err ? reject(err) : resolve(len);
            });
        });

        headers["Content-Length"] = contentLength;
    }

    if (data && !is.stream(data)) {
        if (is.buffer(data)) {
            // Nothing to do...
        } else if (is.arrayBuffer(data)) {
            data = Buffer.from(new Uint8Array(data));
        } else if (is.string(data)) {
            data = Buffer.from(data, "utf-8");
        } else {
            throw __.createError("Data after transformation must be a string, an ArrayBuffer, a Buffer, or a Stream'", config);
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
    // console.log(adone.inspect(config.url));
    const parsedUrl = adone.std.url.parse(config.url);
    const protocol = parsedUrl.protocol || "http:";

    if (!auth && parsedUrl.auth) {
        const urlAuth = parsedUrl.auth.split(":");
        auth = `${urlAuth[0] || ""}:${urlAuth[1] || ""}`;
    }

    if (auth) {
        delete headers.Authorization;
    }

    const isHttpsRequest = isHttps.test(protocol);
    const agent = isHttpsRequest ? config.httpsAgent : config.httpAgent;

    const nodeOptions = {
        path: buildURL(parsedUrl.path, config.params, config.paramsSerializer).replace(/^\?/, ""),
        method: config.method.toUpperCase(),
        headers,
        agent,
        auth
    };

    if (config.socketPath) {
        nodeOptions.socketPath = config.socketPath;
    } else {
        nodeOptions.hostname = parsedUrl.hostname;
        nodeOptions.port = parsedUrl.port;
    }

    if (isHttps) {
        nodeOptions.rejectUnauthorized = is.boolean(config.rejectUnauthorized) ? config.rejectUnauthorized : true;
    }

    let proxy = config.proxy;
    if (!proxy && proxy !== false) {
        const proxyEnv = `${protocol.slice(0, -1)}_proxy`;
        const proxyUrl = process.env[proxyEnv] || process.env[proxyEnv.toUpperCase()];
        if (proxyUrl) {
            const parsedProxyUrl = adone.std.url.parse(proxyUrl);
            const noProxyEnv = process.env.no_proxy || process.env.NO_PROXY;
            let shouldProxy = true;

            if (noProxyEnv) {
                const noProxy = noProxyEnv.split(",").map(function trim(s) {
                    return s.trim();
                });

                shouldProxy = !noProxy.some(function proxyMatch(proxyElement) {
                    if (!proxyElement) {
                        return false;
                    }
                    if (proxyElement === "*") {
                        return true;
                    }
                    if (proxyElement[0] === "." &&
                        parsedUrl.hostname.substr(parsedUrl.hostname.length - proxyElement.length) === proxyElement &&
                        proxyElement.match(/\./g).length === parsedUrl.hostname.match(/\./g).length) {
                        return true;
                    }

                    return parsedUrl.hostname === proxyElement;
                });
            }


            if (shouldProxy) {
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
    const isHttpsProxy = isHttpsRequest && (proxy ? isHttps.test(proxy.protocol) : true);
    if (config.transport) {
        transport = config.transport;
    } else if (config.maxRedirects === 0) {
        transport = isHttpsProxy ? adone.std.https : adone.std.http;
    } else {
        if (config.maxRedirects) {
            nodeOptions.maxRedirects = config.maxRedirects;
        }
        transport = isHttpsProxy ? http.followRedirects.https : http.followRedirects.http;
    }

    if (config.maxContentLength && config.maxContentLength > -1) {
        nodeOptions.maxBodyLength = config.maxContentLength;
    }

    return new Promise(function dispatchHttpRequest(resolvePromise, rejectPromise) {
        let timer;
        const resolve = function resolve(value) {
            clearTimeout(timer);
            resolvePromise(value);
        };
        const reject = function reject(value) {
            clearTimeout(timer);
            rejectPromise(value);
        };

        const req = transport.request(nodeOptions, (res) => {
            if (req.aborted) {
                return;
            }

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
                    const { responseType } = config;

                    if (responseType === "json" || responseType === "string") {
                        responseData = util.iconv.decode(responseData, responseEncoding);
                    }

                    response.data = responseData;

                    __.settle(resolve, reject, response);
                });
            }
        });

        req.on("error", (err) => {
            reject(__.enhanceError(err, config, null, req));
        });

        if (config.timeout) {
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

        if (is.nil(data)) {
            req.end(data);
            return;
        } else if (!is.stream(data)) {
            if (data.length <= adone.stream.buffer.DEFAULT_INITIAL_SIZE) {
                req.end(data);
                return;
            }
            const stream = new adone.stream.buffer.ReadableStream();
            stream.put(data);
            stream.stop();
            data = stream;   
        }

        data.on("error", (err) => {
            reject(__.enhanceError(err, config, null, req));
        }).pipe(req);
    });
}
