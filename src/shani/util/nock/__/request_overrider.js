const {
    is,
    std: {
        stream
    },
    compressor: {
        deflate,
        gz
    },
    util,
    shani: {
        util: { nock }
    }
} = adone;

const __ = adone.private(nock);

const {
    util: _util,
    ClientRequest,
    IncomingMessage
} = __;

const nockFilteredScope = Symbol.for("adone.shani.util.nock.nockFilterScope");
const nockScopeHost = Symbol.for("adone.shani.util.nock.nockScopeHost");

const getHeader = (request, name) => {
    if (!request._headers) {
        return;
    }

    const key = name.toLowerCase();

    return request.getHeader ? request.getHeader(key) : request._headers[key];
};

const setHeader = (request, name, value) => {
    const key = name.toLowerCase();

    request._headers = request._headers || {};
    request._headerNames = request._headerNames || {};
    request._removedHeader = request._removedHeader || {};

    if (request.setHeader) {
        request.setHeader(key, value);
    } else {
        request._headers[key] = value;
        request._headerNames[key] = name;
    }

    if (name === "expect" && value === "100-continue") {
        setImmediate(() => {
            request.emit("continue");
        });
    }
};

//  Sets request headers of the given request. This is needed during both matching phase
//  (in case header filters were specified) and mocking phase (to correctly pass mocked
//  request headers).
const setRequestHeaders = (req, options, interceptor) => {
    //  If a filtered scope is being used we have to use scope's host
    //  in the header, otherwise 'host' header won't match.
    //  NOTE: We use lower-case header field names throught Nock.
    const HOST_HEADER = "host";
    if (interceptor[nockFilteredScope] && interceptor[nockScopeHost]) {
        if (options && options.headers) {
            options.headers[HOST_HEADER] = interceptor[nockScopeHost];
        }
        setHeader(req, HOST_HEADER, interceptor[nockScopeHost]);
    } else {
        //  For all other cases, we always add host header equal to the
        //  requested host unless it was already defined.
        if (options.host && !getHeader(req, HOST_HEADER)) {
            let hostHeader = options.host;

            if (options.port === 80 || options.port === 443) {
                hostHeader = hostHeader.split(":")[0];
            }

            setHeader(req, HOST_HEADER, hostHeader);
        }
    }

};

export default function requestOverrider(req, options, interceptors, remove, cb) {
    let response;
    if (IncomingMessage) {
        response = new IncomingMessage(new adone.std.events.EventEmitter());
    } else {
        response = new stream.Readable();
        response._read = function () { };
    }

    const requestBodyBuffers = [];
    let aborted;

    let ended;
    let headers;

    //  We may be changing the options object and we don't want those
    //  changes affecting the user so we use a clone of the object.
    options = util.clone(options) || {};

    response.req = req;

    if (options.headers) {
        //  We use lower-case header field names throught Nock.
        options.headers = _util.headersFieldNamesToLowerCase(options.headers);

        headers = options.headers;
        for (const [key, val] of Object.entries(headers)) {
            setHeader(req, key, val);
        }
    }

    /// options.auth
    if (options.auth && (!options.headers || !options.headers.authorization)) {
        setHeader(req, "Authorization", `Basic ${(Buffer.from(options.auth)).toString("base64")}`);
    }

    if (!req.connection) {
        req.connection = new adone.std.events.EventEmitter();
    }

    req.path = options.path;

    options.getHeader = function (name) {
        return getHeader(req, name);
    };

    req.socket = response.socket = new __.Socket({ proto: options.proto });

    const emitError = (error) => {
        process.nextTick(() => {
            req.emit("error", error);
        });
    };

    const end = function (cb) {
        ended = true;
        let requestBody;
        let responseBody;
        let responseBuffers;
        let interceptor;

        let continued = false;

        //  When request body is a binary buffer we internally use in its hexadecimal representation.
        const requestBodyBuffer = _util.mergeChunks(requestBodyBuffers);
        const isBinaryRequestBodyBuffer = _util.isBinaryBuffer(requestBodyBuffer);
        if (isBinaryRequestBodyBuffer) {
            requestBody = requestBodyBuffer.toString("hex");
        } else {
            requestBody = requestBodyBuffer.toString("utf8");
        }

        /// put back the path into options
        /// because bad behaving agents like superagent
        /// like to change request.path in mid-flight.
        options.path = req.path;

        // fixes #976
        options.protocol = `${options.proto}:`;

        interceptors.forEach((interceptor) => {
            //  For correct matching we need to have correct request headers - if these were specified.
            setRequestHeaders(req, options, interceptor);
        });

        interceptor = interceptors.find((interceptor) => {
            return interceptor.match(options, requestBody);
        });

        if (!interceptor) {
            __.globalEmitter.emit("no match", req, options, requestBody);
            // Try to find a hostname match
            interceptor = interceptors.find((interceptor) => {
                return interceptor.match(options, requestBody, true);
            });
            if (interceptor && req instanceof ClientRequest) {
                if (interceptor.options.allowUnmocked) {
                    const newReq = new ClientRequest(options, cb);
                    adone.event.Emitter.propagateEvents(newReq, req, [
                        "abort",
                        "connect",
                        "continue",
                        "response",
                        "socket",
                        "timeout",
                        "upgrade",
                        "close",
                        "drain",
                        "error",
                        "finish",
                        "pipe",
                        "unpipe"
                    ]);
                    //  We send the raw buffer as we received it, not as we interpreted it.
                    newReq.end(requestBodyBuffer);
                    return;
                }
            }

            const err = new Error(`Nock: No match for request ${_util.stringifyRequest(options, requestBody)}`);
            err.statusCode = err.status = 404;
            emitError(err);
            return;
        }

        //  We again set request headers, now for our matched interceptor.
        setRequestHeaders(req, options, interceptor);
        interceptor.req = req;
        req.headers = req.getHeaders ? req.getHeaders() : req._headers;

        interceptor.scope.emit("request", req, interceptor);

        if (!is.undefined(interceptor.errorMessage)) {
            interceptor.interceptionCounter++;
            remove(interceptor);
            interceptor.discard();

            let error;
            if (is.object(interceptor.errorMessage)) {
                error = interceptor.errorMessage;
            } else {
                error = new Error(interceptor.errorMessage);
            }
            setTimeout(emitError, interceptor.getTotalDelay(), error);
            return;
        }
        response.statusCode = Number(interceptor.statusCode) || 200;

        // Clone headers/rawHeaders to not override them when evaluating later
        response.headers = { ...interceptor.headers };
        response.rawHeaders = (interceptor.rawHeaders || []).slice();

        const continueWithResponseBody = (err, responseBody) => {
            if (continued) {
                return;
            }
            continued = true;

            if (err) {
                response.statusCode = 500;
                responseBody = err.stack;
            }

            //  Transform the response body if it exists (it may not exist
            //  if we have `responseBuffers` instead)

            if (responseBody) {
                if (is.array(responseBody) &&
                    responseBody.length >= 2 &&
                    responseBody.length <= 3 &&
                    is.number(responseBody[0])) {
                    response.statusCode = Number(responseBody[0]);
                    if (!response.headers) {
                        response.headers = {};
                    }
                    Object.assign(response.headers, responseBody[2]);
                    responseBody = responseBody[1];

                    response.rawHeaders = response.rawHeaders || [];
                    Object.keys(response.headers).forEach((key) => {
                        response.rawHeaders.push(key, response.headers[key]);
                    });
                }

                if (interceptor.delayInMs) {
                    // Because setTimeout is called immediately in DelayedBody(), so we
                    // need count in the delayConnectionInMs.
                    responseBody = new __.DelayedBody(interceptor.getTotalDelay(), responseBody);
                }

                if (is.stream(responseBody)) {
                    responseBody.pause();
                    responseBody.on("data", (d) => {
                        response.push(d);
                    });
                    responseBody.on("end", () => {
                        response.push(null);
                    });
                    responseBody.on("error", (err) => {
                        response.emit("error", err);
                    });
                } else if (responseBody && !is.buffer(responseBody)) {
                    if (is.string(responseBody)) {
                        responseBody = Buffer.from(responseBody);
                    } else {
                        responseBody = JSON.stringify(responseBody);
                        response.headers["content-type"] = "application/json";
                    }
                }
            }

            interceptor.interceptionCounter++;
            remove(interceptor);
            interceptor.discard();

            if (aborted) {
                return;
            }

            /// response.client.authorized = true
            /// fixes https://github.com/pgte/nock/issues/158
            response.client = Object.assign(response.client || {}, {
                authorized: true
            });

            // Account for updates to Node.js response interface
            // cf https://github.com/request/request/pull/1615
            response.socket = Object.assign(response.socket || {}, {
                authorized: true
            });

            // Evaluate functional headers.
            const evaluatedHeaders = {};
            Object.keys(response.headers).forEach((key) => {
                const value = response.headers[key];

                if (is.function(value)) {
                    response.headers[key] = evaluatedHeaders[key] = value(req, response, responseBody);
                }
            });

            for (let rawHeaderIndex = 0; rawHeaderIndex < response.rawHeaders.length; rawHeaderIndex += 2) {
                const key = response.rawHeaders[rawHeaderIndex];
                const value = response.rawHeaders[rawHeaderIndex + 1];
                if (is.function(value)) {
                    response.rawHeaders[rawHeaderIndex + 1] = evaluatedHeaders[key.toLowerCase()];
                }
            }


            process.nextTick(() => {
                if (aborted) {
                    return;
                }

                if (interceptor.socketDelayInMs && interceptor.socketDelayInMs > 0) {
                    req.socket.applyDelay(interceptor.socketDelayInMs);
                }

                const _respond = () => {
                    if (aborted) {
                        return;
                    }


                    if (is.function(cb)) {
                        cb(response);
                    }

                    if (aborted) {
                        emitError(new Error("Request aborted"));
                    } else {
                        req.emit("response", response);
                    }

                    if (is.stream(responseBody)) {
                        responseBody.resume();
                    } else {
                        responseBuffers = responseBuffers || [];
                        if (!is.undefined(responseBody)) {
                            responseBuffers.push(responseBody);
                        }

                        // Stream the response chunks one at a time.
                        setImmediate(function emitChunk() {
                            const chunk = responseBuffers.shift();

                            if (chunk) {
                                response.push(chunk);
                                setImmediate(emitChunk);
                            } else {
                                response.push(null);
                                interceptor.scope.emit("replied", req, interceptor);
                            }
                        });
                    }
                };

                if (interceptor.delayConnectionInMs && interceptor.delayConnectionInMs > 0) {
                    setTimeout(_respond, interceptor.delayConnectionInMs);
                } else {
                    _respond();
                }
            });
        };

        if (is.function(interceptor.body)) {
            if (requestBody && _util.isJSONContent(options.headers)) {
                if (requestBody && _util.contentEncoding(options.headers, "gzip")) {
                    requestBody = String(gz.decompressSync(Buffer.from(requestBody, "hex")), "hex");
                } else if (requestBody && _util.contentEncoding(options.headers, "deflate")) {
                    requestBody = String(deflate.decompressSync(Buffer.from(requestBody, "hex")), "hex");
                }

                requestBody = JSON.parse(requestBody);
            }

            // In case we are waiting for a callback
            if (interceptor.body.length === 3) {
                return interceptor.body(options.path, requestBody || "", continueWithResponseBody);
            }

            responseBody = interceptor.body(options.path, requestBody) || "";

        } else {

            //  If the content is encoded we know that the response body *must* be an array
            //  of response buffers which should be mocked one by one.
            //  (otherwise decompressions after the first one fails as unzip expects to receive
            //  buffer by buffer and not one single merged buffer)
            if (_util.isContentEncoded(response.headers) && !is.stream(interceptor.body)) {

                if (interceptor.delayInMs) {
                    emitError(new Error("Response delay is currently not supported with content-encoded responses."));
                    return;
                }

                let buffers = interceptor.body;
                if (!is.array(buffers)) {
                    buffers = [buffers];
                }

                responseBuffers = buffers.map((buffer) => {
                    return Buffer.from(buffer, "hex");
                });

            } else {

                responseBody = interceptor.body;

                //  If the request was binary then we assume that the response will be binary as well.
                //  In that case we send the response as a Buffer object as that's what the client will expect.
                if (isBinaryRequestBodyBuffer && is.string(responseBody)) {
                    //  Try to create the buffer from the interceptor's body response as hex.
                    try {
                        responseBody = Buffer.from(responseBody, "hex");
                    } catch (err) {
                        //
                    }

                    // Creating buffers does not necessarily throw errors, check for difference in size
                    if (!responseBody || (interceptor.body.length > 0 && responseBody.length === 0)) {
                        //  We fallback on constructing buffer from utf8 representation of the body.
                        responseBody = Buffer.from(interceptor.body, "utf8");
                    }
                }
            }
        }

        return continueWithResponseBody(null, responseBody);
    };

    req.write = function (buffer, encoding, callback) {
        if (!aborted) {
            if (buffer) {
                if (!is.buffer(buffer)) {
                    buffer = Buffer.from(buffer, encoding);
                }
                requestBodyBuffers.push(buffer);
            }
            if (is.function(callback)) {
                callback();
            }
        } else {
            emitError(new Error("Request aborted"));
        }

        setImmediate(() => {
            req.emit("drain");
        });

        return false;
    };

    req.end = function (buffer, encoding, callback) {
        if (!aborted && !ended) {
            req.write(buffer, encoding, () => {
                if (is.function(callback)) {
                    callback();
                }
                end(cb);
                req.emit("finish");
                req.emit("end");
            });
        }
        if (aborted) {
            emitError(new Error("Request aborted"));
        }
    };

    req.flushHeaders = function () {
        if (!aborted && !ended) {
            end(cb);
        }
        if (aborted) {
            emitError(new Error("Request aborted"));
        }
    };

    req.abort = function () {
        if (aborted) {
            return;
        }
        aborted = true;
        if (!ended) {
            end();
        }
        const err = new Error();
        err.code = "aborted";
        response.emit("close", err);

        req.socket.destroy();

        req.emit("abort");

        const connResetError = new Error("socket hang up");
        connResetError.code = "ECONNRESET";
        emitError(connResetError);
    };

    // restify listens for a 'socket' event to
    // be emitted before calling end(), which causes
    // nock to hang with restify. The following logic
    // fakes the socket behavior for restify,
    // Fixes: https://github.com/pgte/nock/issues/79
    req.once = req.on = function (event, listener) {
        // emit a fake socket.
        if (event === "socket") {
            listener.call(req, req.socket);
            req.socket.emit("connect", req.socket);
            req.socket.emit("secureConnect", req.socket);
        }

        adone.std.events.EventEmitter.prototype.on.call(this, event, listener);
        return this;
    };
    req.once = req.on = function (event, listener) {
        // emit a fake socket.
        if (event === "socket") {
            listener.call(req, req.socket);
            req.socket.emit("connect", req.socket);
            req.socket.emit("secureConnect", req.socket);
        }

        adone.std.events.EventEmitter.prototype.on.call(this, event, listener);
        return this;
    };

    return req;
}
