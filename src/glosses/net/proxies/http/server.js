const { is, x, net: { proxy: { http: { tunnel } }, http: { server: { helper } } } } = adone;

const hopByHopHeaders = new Set([
    "connection",
    "keep-alive",
    "proxy-connection",  // hm
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailers",
    "transfer-encoding",
    "upgrade"
]);

class LocalRequest {
    constructor(context, req) {
        this.context = context;
        this.req = req;
        this._body = req;
        this._bodySinks = [];
    }

    get(field) {
        const { req } = this;
        const lowercasedField = field.toLowerCase();
        switch (lowercasedField) {
            case "referer":
            case "referrer": {
                return req.headers.referrer || req.headers.referer || "";
            }
            default: {
                return req.headers[lowercasedField] || "";
            }
        }
    }

    get url() {
        return this.req.url;
    }

    get origin() {
        return `${this.protocol}://${this.host}`;
    }

    get href() {
        if (/^https?:\/\//i.test(this.url)) {
            return this.url;
        }
        return `${this.origin}${this.url}`;
    }

    get header() {
        return this.req.headers;
    }

    get headers() {
        return this.req.headers;
    }

    get host() {
        // const { server: { proxy } } = this;
        // let host = proxy && this.get("X-Forwarded-Host");
        // host = host || this.get("Host");
        const host = this.get("Host");
        if (!host) {
            return "";
        }
        return host.split(/\s*,\s*/)[0];
    }

    get hostname() {
        const { host } = this;
        if (!host) {
            return "";
        }
        return host.split(":")[0];
    }

    get socket() {
        return this.req.socket;
    }

    get protocol() {
        if (this.socket.encrypted) {
            return "https";
        }
        const proto = this.get("X-Forwarded-Proto") || "http";
        return proto.split(/\s*,\s*/)[0];
    }

    get secure() {
        return this.protocol === "https";
    }

    get port() {
        const { host } = this;
        let [, port = null] = host.split(":");
        if (is.null(port)) {
            port = this.secure ? 443 : 80;
        } else {
            port = Number(port);  // incorrect number?
        }
        return port;
    }

    // koa's request returns pathname, hm
    get path() {
        return helper.parseURL(this.req).path;
    }

    get method() {
        return this.req.method;
    }

    deleteHopByHopHeaders() {
        const { headers } = this;
        for (const h of hopByHopHeaders) {
            delete headers[h];
        }
    }

    get body() {
        return this._body;
    }

    set body(value) {
        if (is.buffer(value) || is.readableStream(value) || is.string(value)) {
            this._body = value;
        }
        throw new x.InvalidArgument("request body must be a buffer, string or readable stream");
    }

    get httpVersion() {
        return this.req.httpVersion;
    }

    addBodySink(sink, opts = {}) {
        this._bodySinks.push([sink, opts]);
    }

    writeBody() {
        const { body } = this;
        if (is.buffer(body) || is.string(body)) {
            for (const [sink, opts] of this._bodySinks) {
                opts.end !== false ? sink.end(body) : sink.write(body);
            }
        } else if (is.readableStream(body)) {
            for (const [sink, opts] of this._bodySinks) {
                body.pipe(sink, opts);
            }
        } else {
            for (const [sink, opts] of this._bodySinks) {
                if (opts.end !== false) {
                    sink.end();
                }
            }
        }
    }
}

class LocalResponse {
    constructor(context, res) {
        this.context = context;
        this.res = res;
    }

    writeHead(status, headers) {
        return this.res.writeHead(status, headers);
    }
}

class RemoteResponse {
    constructor(context, res) {
        this.context = context;
        this.res = res;

        this._status = res.statusCode;
        this._headers = res.headers;
        this._body = res;
        this._bodySinks = [];
    }

    get status() {
        return this._status;
    }

    set status(value) {
        this._status = value;
    }

    get headers() {
        return this._headers;
    }

    set headers(value) {
        this._headers = value;
    }

    get body() {
        return this._body;
    }

    set body(value) {
        this._body = value;
    }

    writeBody() {
        const { body } = this;
        if (is.buffer(body) || is.string(body)) {
            for (const [sink, opts] of this._bodySinks) {
                opts.end !== false ? sink.end(body) : sink.write(body);
            }
        } else if (is.readableStream(body)) {
            for (const [sink, opts] of this._bodySinks) {
                body.pipe(sink, opts);
            }
        } else {
            for (const [sink, opts] of this._bodySinks) {
                if (opts.end !== false) {
                    sink.end();
                }
            }
        }
    }

    addBodySink(sink, opts = {}) {
        this._bodySinks.push([sink, opts]);
    }

    get mime() {
        const contentType = this.headers["content-type"];
        if (!contentType) {
            return null;
        }
        return contentType.split(";")[0];
    }
}

class FakeHTTPResponse extends RemoteResponse {
    constructor(context, status, headers, body) {
        super(context, {});
        this._status = status;
        this._headers = headers;
        this._body = body;
    }
}

class HTTPContext {
    constructor(req, res, parent = null) {
        this.parent = parent;
        this.localRequest = new LocalRequest(this, req);
        this.localResponse = new LocalResponse(this, res);
        this.remoteRequest = null;
        this.remoteResponse = null;
        this._clientAddress = req.socket.remoteAddress;
        this._clientPort = req.socket.remotePort;
        this._proxy = null;
        this._requestBodySinks = [];
        this._responseBodySinks = [];
    }

    get proxy() {
        return this._proxy;
    }

    set proxy(value) {
        this._proxy = value;
    }

    get clientAddress() {
        return this._clientAddress;
    }

    set clientAddress(value) {
        this._clientAddress = value;
    }

    get clientPort() {
        return this._clientPort;
    }

    set clientPort(value) {
        return this._clientPort = value;
    }

    async makeRemoteRequest({ deleteHopByHopHeaders = true } = {}) {
        if (deleteHopByHopHeaders) {
            this.localRequest.deleteHopByHopHeaders();
        }
        const { proxy } = this;
        const options = {
            host: proxy ? proxy.host : this.localRequest.hostname,
            port: proxy ? proxy.port : this.localRequest.port,
            path: this.localRequest.path,
            method: this.localRequest.method,
            headers: this.localRequest.headers,
            rejectUnauthorized: false // optional?
        };

        if (proxy && this.localRequest.secure) {
            options.host = this.localRequest.hostname;
            options.port = this.localRequest.port;
            options.path = this.localRequest.path;
            const tunnelOptions = {
                proxy: {
                    host: proxy.host,
                    port: proxy.port,
                    headers: {
                        host: `${this.localRequest.hostname}:${this.localRequest.port}`
                    }
                },
                protocol: this.localRequest.protocol,
                method: this.localRequest.method,
                headers: this.localRequest.headers,
                rejectUnauthorized: false
            };
            options.agent = tunnel[this.localRequest.protocol][proxy.protocol](tunnelOptions);
        }
        const _module = this.localRequest.secure ? adone.std.https : adone.std.http;
        const response = await new Promise((resolve, reject) => {
            const request = _module.request(options)
                .on("response", resolve)
                .on("aborted", reject)
                .on("error", reject);

            this.localRequest.addBodySink(request);
            for (const [sink, opts] of this._requestBodySinks) {
                this.localRequest.addBodySink(sink, opts);
            }
            this.localRequest.writeBody();
        });
        this.remoteResponse = new RemoteResponse(this, response);
        for (const [sink, opts] of this._responseBodySinks) {
            this.remoteResponse.addBodySink(sink, opts);
        }
        this._responseBodySinks.length = 0;
        return this.remoteResponse;
    }

    writeLocalResponseHead() {
        this.localResponse.writeHead(this.remoteResponse.status, this.remoteResponse.headers);
    }

    async writeLocalResponseBody() {
        const { remoteResponse } = this;
        await new Promise((resolve, reject) => {
            this.localResponse.res
                .once("finish", resolve)
                .once("error", reject);
            for (const [sink, opts] of this._responseBodySinks) {
                remoteResponse.addBodySink(sink, opts);
            }
            remoteResponse.addBodySink(this.localResponse.res);
            remoteResponse.writeBody();
        });
    }

    async writeLocalResponse() {
        this.writeLocalResponseHead();
        await this.writeLocalResponseBody();
    }

    // just a helper
    async connect() {
        await this.makeRemoteRequest();
        await this.writeLocalResponse();
    }

    fakeResponse({ status = 200, headers = {}, body = "OK" } = {}) {
        this.remoteResponse = new FakeHTTPResponse(this, status, headers, body);
    }

    saveRequestBody(sink, opts = {}) {
        this._requestBodySinks.push([sink, opts]);
    }

    saveResponseBody(sink, opts = {}) {
        this._responseBodySinks.push([sink, opts]);
    }
}

HTTPContext.prototype.type = "http";

class StreamingContext {
    constructor(parent, localSocket, getRemoteSocket, head = null) {
        this.parent = parent;
        this.localSocket = localSocket;
        this.remoteSocket = null;
        this._head = head;
        this._getRemoteSocket = getRemoteSocket;
        // default sockets timeouts
        this._localSocketTimeout = 30000;
        this._remoteSocketTimeout = 30000;

        this._clientAddress = localSocket.remoteAddress;
        this._clientPort = localSocket.remotePort;
        this._localAddress = localSocket.localAddress;
        this._localPort = localSocket.localPort;
        this._remoteAddress = null;
        this._remotePort = null;
        this._incomingSinks = [];
        this._outgoingSinks = [];
    }

    get clientAddress() {
        return this._clientAddress;
    }

    set clientAddress(value) {
        this._clientAddress = value;
    }

    get clientPort() {
        return this._clientPort;
    }

    set clientPort(value) {
        this._clientPort = value;
    }

    get localAddress() {
        return this._localAddress;
    }

    get localPort() {
        return this._localPort;
    }

    get remoteAddress() {
        return this._remoteAddress;
    }

    get remotePort() {
        return this._remotePort;
    }

    set localSocketTimeout(value) {
        this._localSocketTimeout = value;
    }

    get localSocketTimeout() {
        return this._localSocketTimeout;
    }

    set remoteSocketTimeout(value) {
        this._remoteSocketTimeout = value;
    }

    get remoteSocketTimeout() {
        return this._remoteSocketTimeout;
    }

    async connect() {
        this.remoteSocket = await this._getRemoteSocket();
        this._remoteAddress = this.remoteSocket.remoteAddress;
        this._remotePort = this.remoteSocket.remotePort;
        const remoteRes = new Promise((resolve) => {
            this.remoteSocket
                .once("error", (err) => {
                    this.localSocket.destroy();
                    resolve(err);
                })
                .once("finish", resolve);
        });
        const localRes = new Promise((resolve) => {
            this.localSocket
                .once("error", (err) => {
                    this.remoteSocket.destroy();
                    resolve(err);
                })
                .once("finish", resolve);
        });
        const done = Promise.all([localRes, remoteRes]);
        const { localSocketTimeout, remoteSocketTimeout } = this;
        if (localSocketTimeout) {
            this.localSocket
                .setTimeout(localSocketTimeout)
                .once("timeout", () => {
                    this.remoteSocket.end();
                });
        }
        if (remoteSocketTimeout) {
            this.remoteSocket
                .setTimeout(remoteSocketTimeout)
                .once("timeout", () => {
                    this.localSocket.end();
                });
        }
        if (this._head && this._head.length) {
            this.remoteSocket.write(this._head);
        }
        this.localSocket.pipe(this.remoteSocket).pipe(this.localSocket);
        for (const [sink, opts] of this._incomingSinks) {
            this.remoteSocket.pipe(sink, opts);
        }
        for (const [sink, opts] of this._outgoingSinks) {
            this.localSocket.pipe(sink, opts);
        }
        const [localSocketError, remoteSocketError] = await done;
        if (localSocketError) {
            throw localSocketError;
        }
        if (remoteSocketError) {
            throw remoteSocketError;
        }
    }

    saveIncoming(sink, opts = {}) {
        this._incomingSinks.push([sink, opts]);
    }

    saveOutgoing(sink, opts = {}) {
        this._outgoingSinks.push([sink, opts]);
    }
}

StreamingContext.prototype.type = "stream";

class WSSessionContext {
    constructor(parent, localRequest, getSockets) {
        this.parent = parent;
        this.localRequest = localRequest;
        this.getSockets = getSockets;

        this.local = null;
        this.remote = null;

        this.incomingTransforms = [(context, next) => {
            const { data, flags } = context;
            context.data = flags.binary ? Buffer.from(data) : data;
            context.flags = {
                mask: flags.masked,
                binary: flags.binary
            };
            if ("fin" in flags) {
                context.flags.fin = flags.fin;
            }
            return next();
        }, ({ data, flags }) => {
            // send the message to the local socket
            return new Promise((resolve, reject) => {
                this.local.send(data, flags, (err) => {
                    err ? reject(err) : resolve();
                });
            });
        }];
        this.outgoingTransforms = [(context, next) => {
            const { data, flags } = context;
            context.data = flags.binary ? Buffer.from(data) : data;
            context.flags = {
                mask: flags.masked,
                binary: flags.binary
            };
            if ("fin" in flags) {
                context.flags.fin = flags.fin;
            }
            return next();
        }, ({ data, flags }) => {
            return new Promise((resolve, reject) => {
                this.remote.send(data, flags, (err) => {
                    err ? reject(err) : resolve();
                });
            });
        }];

        this._incomingComposed = adone.net.http.server.helper.compose(this.incomingTransforms);
        this._incoming = (data, flags) => {
            this._incomingComposed({ data, flags }).catch(adone.noop);
        };

        this._outgoingComposed = adone.net.http.server.helper.compose(this.outgoingTransforms);
        this._outgoing = (data, flags) => {
            this._outgoingComposed({ data, flags }).catch(adone.noop);  // swallow all the errors
        };

        this.localCloseCode = null;
        this.remoteCloseCode = null;
        this._clientAddress = null;
        this._clientPort = null;
    }

    get clientAddress() {
        return this._clientAddress;
    }

    set clientAddress(value) {
        this._clientAddress = value;
    }

    get clientPort() {
        return this._clientPort;
    }

    set clientPort(value) {
        return this._clientPort = value;
    }

    incoming(callback) {
        const a = this.incomingTransforms;
        a.push(callback);
        const l = a.length;
        [a[l - 1], a[l - 2]] = [a[l - 2], a[l - 1]];  // keep the sending mw at the end
        return this;
    }

    outgoing(callback) {
        const a = this.outgoingTransforms;
        a.push(callback);
        const l = a.length;
        [a[l - 1], a[l - 2]] = [a[l - 2], a[l - 1]];  // keep the sending mw at the end
        return this;
    }

    async connect() {
        const [local, remote] = await this.getSockets();
        this.local = local;
        this.remote = remote;
        remote.on("message", this._incoming);
        local.on("message", this._outgoing);

        remote.on("close", () => {
            local.close();
        });
        local.on("close", () => {
            remote.close();
        });
        let remoteRes = new Promise((resolve) => {
            remote
                .on("close", resolve)
                .on("error", (err) => {
                    err.message = `Local: ${err.message}`;
                    resolve(err);
                });
        });
        let localRes = new Promise((resolve) => {
            local
                .on("close", resolve)
                .on("error", (err) => {
                    err.message = `Remote: ${err.message}`;
                    resolve(err);
                });
        });
        local.resume();
        remote.resume();
        [localRes, remoteRes] = await Promise.all([localRes, remoteRes]);
        if (!adone.is.number(localRes)) {
            remote.close();
            throw localRes;
        } else {
            this.localCloseCode = localRes;
        }

        if (!adone.is.number(remoteRes)) {
            local.close();
            throw remoteRes;
        } else {
            this.remoteCloseCode = remoteRes;
        }
    }
}

WSSessionContext.prototype.type = "websocket";

class HTTPUpgradeContext {
    constructor(parent, req, localSocket, head, processContext) {
        this.parent = parent;
        this.localSocket = localSocket;
        this.remoteResponse = null;
        this._head = head;
        this.localRequest = new LocalRequest(this, req);
        this.processContext = processContext;
        this.__handleWebsocket = false;
        this._clientAddress = this.parent.clientAddress;
        this._clientPort = this.parent.clientAddress;
        this._proxy = null;
    }

    get proxy() {
        return this._proxy;
    }

    set proxy(value) {
        this._proxy = value;
    }

    get clientAddress() {
        return this._clientAddress;
    }

    set clientAddress(value) {
        this._clientAddress = value;
    }

    get clientPort() {
        return this._clientPort;
    }

    set clientPort(value) {
        return this._clientPort = value;
    }

    get handleWebsocket() {
        return this.__handleWebsocket;
    }

    set handleWebsocket(value) {
        this.__handleWebsocket = value;
    }

    get protocol() {
        return this.localRequest.headers.upgrade.toLowerCase();
    }

    async _handleWebsocket() {
        let finishUpgrade;
        const finishPromise = new Promise((resolve, reject) => {
            finishUpgrade = (err) => {
                err ? reject(err) : resolve(err);
            };
        });
        const context = new WSSessionContext(this, this.localRequest, async () => {
            // if this part fails then finish the upgrade and re-throw the error
            try {
                const { localSocket, localRequest } = this;
                const abortConnection = (code, message) => {
                    if (localSocket.writable) {
                        message = message || adone.std.http.STATUS_CODES[code];
                        localSocket.write([
                            `HTTP/1.1 ${code} ${adone.std.http.STATUS_CODES[code]}`,
                            "Connection: close",
                            "Content-type: text/html",
                            `Content-Length: ${Buffer.byteLength(message)}`,
                            "",
                            message
                        ].join("\r\n"));
                        this.response.status = code;
                        this.response.headers = {
                            connection: "close",
                            "content-type": "text/html",
                            "content-length": Buffer.byteLength(message)
                        };
                        this.response.body = message;
                    }
                    localSocket.destroy();
                    throw new Error("Aborted: ${code} ${message}");
                };
                if (!localRequest.headers["sec-websocket-key"]) {
                    abortConnection(400);
                }
                const version = Number(localRequest.headers["sec-websocket-version"]);
                if (version !== 8 && version !== 13) {
                    abortConnection(400);
                }
                const protocols = localRequest.headers["sec-websocket-protocol"];
                const protocol = protocols && protocols.split(/, */)[0];
                // const origin = version !== 13 ? request.headers["sec-websocket-origin"] : request.headers["origin"];
                const extensionsOffer = adone.net.ws.exts.parse(localRequest.headers["sec-websocket-extensions"]);
                const key = adone.std.crypto.createHash("sha1")
                    .update(`${localRequest.headers["sec-websocket-key"]}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`, "binary")
                    .digest("base64");
                const headers = [
                    "HTTP/1.1 101 Switching Protocols",
                    "Upgrade: websocket",
                    "Connection: Upgrade",
                    `Sec-WebSocket-Accept: ${key}`
                ];
                if (protocol) {
                    headers.push(`Sec-WebSocket-Protocol: ${protocol}`);
                }
                // per-message-deflate?
                localSocket.setTimeout(0);
                localSocket.setNoDelay(true);
                // what if write fails?
                localSocket.write(headers.concat("", "").join("\r\n"));
                finishUpgrade();
                this.remoteResponse = new FakeHTTPResponse(this);
                this.remoteResponse.status = 101;
                this.remoteResponse.headers = {
                    upgrade: "websocket",
                    connection: "Upgrade",
                    "sec-websocket-accept": key
                };
                if (protocol) {
                    this.remoteResponse.headers["sec-websocket-protocol"] = protocol;
                }
                const remote = await new Promise((resolve, reject) => {
                    const { host } = this.localRequest.headers;
                    const url = `${this.localRequest.secure ? "wss" : "ws"}://${host}${this.localRequest.url}`;
                    const options = {
                        perMessageDeflate: "permessage-deflate" in extensionsOffer
                    };
                    const { proxy } = this;
                    if (proxy) {
                        const tunnelOptions = {
                            proxy: {
                                host: proxy.host,
                                port: proxy.port,
                                headers: {
                                    host: `${this.localRequest.hostname}:${this.localRequest.port}`
                                }
                            },
                            protocol: this.localRequest.protocol,
                            method: this.localRequest.method,
                            headers: this.localRequest.headers,
                            rejectUnauthorized: false  // ?
                        };
                        options.agent = tunnel[this.localRequest.protocol][proxy.protocol](tunnelOptions);
                    }
                    const socket = new adone.net.ws.WebSocket(url, options);
                    socket.on("error", reject);
                    socket.on("open", () => {
                        socket.removeListener("error", reject);
                        socket.pause();
                        resolve(socket);
                    });
                });
                const local = new adone.net.ws.WebSocket([localRequest.req, localSocket], {
                    protocolVersion: version,
                    protocol,
                    perMessageDeflate: "permessage-deflate" in extensionsOffer
                });
                local.pause();
                finishUpgrade();
                return [local, remote];
            } catch (err) {
                finishUpgrade(err);
                throw err;
            }
        });
        context.clientAddress = this.clientAddress;
        context.clientPort = this.clientPort;
        this.processContext(context);
        await finishPromise;
    }

    async _handleStreaming() {
        await new Promise((resolveUpgrade, rejectUpgrade) => {
            const context = new StreamingContext(this, this.localSocket, async () => {
                // no hop-by-hop ?
                const options = {
                    host: this.localRequest.hostname,
                    port: this.localRequest.port,
                    path: this.localRequest.path,
                    method: this.localRequest.method,
                    headers: this.localRequest.headers,
                    rejectUnauthorized: true // optional?
                };
                const { proxy } = this;
                if (proxy) {
                    const tunnelOptions = {
                        proxy: {
                            host: proxy.host,
                            port: proxy.port,
                            headers: {
                                host: `${this.localRequest.hostname}:${this.localRequest.port}`
                            }
                        },
                        protocol: this.localRequest.protocol,
                        method: this.localRequest.method,
                        headers: this.localRequest.headers,
                        rejectUnauthorized: false // ?
                    };
                    options.agent = tunnel[this.localRequest.protocol][proxy.protocol](tunnelOptions);
                }
                const _module = this.localRequest.secure ? adone.std.https : adone.std.http;
                try {
                    const [res, socket] = await new Promise((resolve, reject) => {
                        _module.request(options)
                            .once("upgrade", (res, socket) => resolve([res, socket]))
                            .once("aborted", reject)
                            .once("error", reject)
                            .end();  // this._head?
                    });
                    this.remoteResponse = new RemoteResponse(this, res);
                    const { rawHeaders, statusCode, httpVersion } = res;
                    let headers = [];
                    for (let i = 0, n = rawHeaders.length; i < n; i += 2) {
                        headers.push(`${rawHeaders[i]}: ${rawHeaders[i + 1]}`);
                    }
                    headers = `${headers.join("\r\n")}\r\n\r\n`;
                    this.localSocket.write(`HTTP/${httpVersion} ${statusCode} ${adone.std.http.STATUS_CODES[statusCode]}\r\n${headers}`);
                    this.remoteResponse.body = "";
                    resolveUpgrade();
                    return socket;
                } catch (err) {
                    rejectUpgrade(err);
                    throw err;
                }
            }, this._head);
            context.localSocketTimeout = null;
            context.remoteSocketTimeout = null;
            context.clientAddress = this.clientAddress;
            context.clientPort = this.clientPort;
            this.processContext(context);
        });
    }

    async connect() {
        if (this.handleWebsocket && this.protocol === "websocket") {
            return this._handleWebsocket();
        }
        return this._handleStreaming();
    }
}

HTTPUpgradeContext.prototype.type = "upgrade";

class HTTPConnectContext {
    constructor(req, socket, head, processContext, https, getInternalPort) {
        this.localRequest = new LocalRequest(this, req);
        this._head = head;
        this.localSocket = socket;
        this.remoteSocket = null;
        this.processContext = processContext;
        this._decryptHTTPS = false;
        this.__handleUpgrade = false;
        this.https = https;
        this.getInternalPort = getInternalPort;
        this._established = false;
        this._clientAddress = socket.remoteAddress;
        this._clientPort = socket.remotePort;
        this._proxy = null;
    }

    get proxy() {
        return this._proxy;
    }

    set proxy(value) {
        this._proxy = value;
    }

    get clientAddress() {
        return this._clientAddress;
    }

    set clientAddress(value) {
        this._clientAddress = value;
    }

    get clientPort() {
        return this._clientPort;
    }

    set clientPort(value) {
        return this._clientPort = value;
    }

    get decryptHTTPS() {
        return this._decryptHTTPS;
    }

    set decryptHTTPS(value) {
        this._decryptHTTPS = value;
    }

    get handleUpgrade() {
        return this.__handleUpgrade;
    }

    set handleUpgrade(value) {
        this.__handleUpgrade = value;
    }

    sendEstablished() {
        if (this._established) {
            return;
        }
        this._established = true;
        this.localSocket.write(`HTTP/${this.localRequest.httpVersion} 200 OK\r\n\r\n`);
    }

    _handleStreaming() {
        return new Promise((resolveConnect, rejectConnect) => {
            const context = new StreamingContext(this, this.localSocket, async () => {
                const { proxy } = this;
                let remoteSocket;
                if (proxy) {
                    remoteSocket = await new Promise((resolve, reject) => {
                        adone.std.http.request({
                            host: proxy.host,
                            port: proxy.port,
                            method: "CONNECT",
                            path: this.localRequest.url
                        })
                            .once("connect", (res, socket) => {
                                if (res.statusCode !== 200) {
                                    reject(new x.IllegalState(`Cannot establish a connection with the proxy, statusCode = ${res.statusCode}`));
                                } else {
                                    resolve(socket);
                                }
                            })
                            .once("aborted", reject)
                            .end();
                    }).then((socket) => {
                        resolveConnect();
                        return socket;
                    }, (err) => {
                        rejectConnect(err);
                        return Promise.reject(err);
                    });
                } else {
                    const [host, port] = this.localRequest.url.split(":");
                    remoteSocket = adone.std.net.connect(port, host);
                    await new Promise((resolve, reject) => {
                        remoteSocket
                            .on("connect", resolve)
                            .on("error", reject);
                    }).then(resolveConnect, (err) => {
                        rejectConnect(err);
                        return Promise.reject(err);
                    });
                }
                await this.sendEstablished();
                return remoteSocket;
            }, this._head);
            context.clientAddress = this.clientAddress;
            context.clientPort = this.clientPort;
            this.processContext(context);
        });
    }

    async _handleHTTPS() {
        const { key, cert } = await this.https.getInternalCert();
        const intercepter = new adone.std.https.Server({
            key,
            cert,
            SNICallback: (serverName, callback) => {
                this.https.getCertificate(serverName)
                    .then(({ key, cert }) => {
                        return adone.std.tls.createSecureContext({ key, cert });
                    }).then((ctx) => {
                        callback(null, ctx);
                    }, callback);
            }
        });
        const internalPort = await this.getInternalPort("https");
        await new Promise((resolve, reject) => {
            intercepter.listen(internalPort, () => {
                intercepter.removeListener("error", reject);
                resolve();
            }).once("error", reject);
        });
        await new Promise((resolve, reject) => {
            const requestHandler = (request, response) => {
                intercepter.removeListener("clientError", reject);
                intercepter.removeListener("error", reject);
                const context = new HTTPContext(request, response, this);
                context.clientAddress = this.clientAddress;
                context.clientPort = this.clientPort;
                resolve();   // it calls multiple times, does it matter?
                this.processContext(context);
            };

            intercepter
                .on("request", requestHandler)
                .on("clientError", reject);
            if (this.handleUpgrade) {
                intercepter.on("upgrade", (request, socket, head) => {
                    const context = new HTTPUpgradeContext(this, request, socket, head, this.processContext);
                    context.clientAddress = this.clientAddress;
                    context.clientPort = this.clientPort;
                    resolve();  // it calls multiple times, does it matter?
                    this.processContext(context);
                });
            }
            let port = intercepter.address();
            if (is.object(port)) {
                port = port.port;
            }
            const internalSocket = adone.std.net.connect(port, () => {
                this.sendEstablished();
                internalSocket.pipe(this.localSocket).pipe(internalSocket);
            });
            internalSocket.once("error", () => {
                internalSocket.destroy();
                this.localSocket.destroy();
            });
            this.localSocket.once("error", () => {
                internalSocket.destroy();
                this.localSocket.destroy();
            });
            internalSocket.on("close", () => {
                intercepter.close();
            });
        });
    }

    async _handleUpgrade() {
        const intercepter = new adone.std.http.Server();
        const internalAddress = await this.getInternalPort("upgrade");
        await new Promise((resolve, reject) => {
            intercepter.listen(internalAddress, () => {
                intercepter.removeListener("error", reject);
                resolve();
            }).once("error", reject);
        });
        let port = intercepter.address();
        if (is.object(port)) {
            port = port.port;
        }
        await new Promise((resolve, reject) => {
            intercepter.once("upgrade", (request, socket, head) => {
                intercepter.removeListener("clientError", reject);
                const context = new HTTPUpgradeContext(this, request, socket, head, this.processContext);
                context.clientAddress = this.clientAddress;
                context.clientPort = this.clientPort;
                resolve();
                this.processContext(context);
            }).once("clientError", reject);
            //
            const internalSocket = adone.std.net.connect(port, () => {
                internalSocket.pipe(this.localSocket).pipe(internalSocket);
            });
            internalSocket.once("error", () => {
                internalSocket.destroy();
                this.localSocket.destroy();
            });
            this.localSocket.once("error", () => {
                internalSocket.destroy();
                this.localSocket.destroy();
            });
            internalSocket.on("close", () => {
                intercepter.close();
            });
        });
    }

    async connect() {
        if (!this.decryptHTTPS && !this.handleUpgrade) {
            return this._handleStreaming();
        }
        if (this.handleUpgrade) {
            // read the first chunk to understand if it is an update request
            const chunk = await new Promise((resolve, reject) => {
                this.sendEstablished();  // we will never receive the first chunk without this
                this.localSocket.once("data", (chunk) => {
                    this.localSocket.pause();
                    this.localSocket.removeListener("error", reject);
                    resolve(chunk);
                }).once("error", reject);
            });
            this.localSocket.unshift(chunk);

            if (/upgrade\s*:/i.test(chunk.toString())) {
                return this._handleUpgrade();
            }
        }
        if (this.decryptHTTPS) {
            return this._handleHTTPS();
        }
        return this._handleStreaming();
    }
}

HTTPConnectContext.prototype.type = "connect";

export default class Server {
    constructor({ https = null, getInternalPort = null } = {}) {
        this.server = new adone.std.http.Server();
        this.middlewares = [];
        const composed = adone.net.http.server.helper.compose(this.middlewares);
        const processContext = (context) => composed(context);
        this.authenticate = adone.truly;
        this.server
            .on("request", async (req, res) => {
                const authenticated = await this.authenticate(req, "request");
                if (!authenticated) {
                    res.writeHead(407);
                    res.end();
                    return;
                }
                processContext(new HTTPContext(req, res));
            })
            .on("connect", async (req, socket, head) => {
                const authenticated = await this.authenticate(req, "connect");
                if (!authenticated) {
                    socket.destroy();
                    return;
                }
                processContext(new HTTPConnectContext(req, socket, head, processContext, https, getInternalPort));
            });
    }

    authenticate() {

    }

    use(middleware) {
        if (!is.function(middleware)) {
            throw new x.InvalidArgument("middleware must be a function");
        }
        this.middlewares.push(middleware);
        return this;
    }

    async listen(port, host) {
        await new Promise((resolve) => {
            this.server.listen(port, host, resolve);
        });
    }

    address() {
        return this.server.address();
    }

    async close() {
        await new Promise((resolve) => {
            this.server.close(resolve);
        });
    }
}
