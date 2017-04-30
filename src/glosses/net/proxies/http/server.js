const { is, x, net: { http: { server: { helper } } } } = adone;

const hopByHopHeaders = new Set([
    "connection",
    "keep-alive",
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

    pipe(dest, { end = true } = {}) {
        const { body } = this;
        if (is.buffer(body) || is.string(body)) {
            if (end) {
                dest.end(body);
            } else {
                dest.write(body);
            }
        } else if (is.readableStream(body)) {
            body.pipe(dest, { end });
        } else if (end) {
            dest.end();
        }
        return dest;
    }
}

class FakeHTTPResponse {
    constructor(status, headers, body) {
        this.status = status;
        this.headers = headers;
        this.body = body;
    }

    pipe(dest, { end = true } = {}) {
        const { body } = this;
        if (is.buffer(body) || is.string(body)) {
            if (end) {
                dest.end(body);
            } else {
                dest.write(body);
            }
        } else if (is.readableStream(body)) {
            body.pipe(dest, { end });
        } else if (end) {
            dest.end();
        }
        return dest;
    }
}

class HTTPContext {
    constructor(req, res, parent = null) {
        this.parent = parent;
        this.localRequest = new LocalRequest(this, req);
        this.localResponse = new LocalResponse(this, res);
        this.remoteRequest = null;
        this.remoteResponse = null;
    }

    async makeRemoteRequest({ deleteHopByHopHeaders = true } = {}) {
        if (deleteHopByHopHeaders) {
            this.localRequest.deleteHopByHopHeaders();
        }
        const options = {
            host: this.localRequest.hostname,
            port: this.localRequest.port,
            path: this.localRequest.path,
            method: this.localRequest.method,
            headers: this.localRequest.headers,
            rejectUnauthorized: true // optional?
        };
        const _module = this.localRequest.secure ? adone.std.https : adone.std.http;
        const localBody = this.localRequest.body;
        const response = await new Promise((resolve, reject) => {
            const request = _module.request(options)
                .on("response", resolve)
                .on("aborted", reject)
                .on("error", reject);

            if (is.readableStream(localBody)) {
                localBody.pipe(request);
            } else if (is.buffer(localBody) || is.string(localBody)) {
                request.end(localBody);
            } else {
                request.end();
            }
        });
        return this.remoteResponse = new RemoteResponse(this, response);
    }

    writeLocalResponseHead() {
        this.localResponse.writeHead(this.remoteResponse.status, this.remoteResponse.headers);
    }

    async writeLocalResponseBody() {
        const { remoteResponse } = this;
        await new Promise((resolve, reject) => {
            remoteResponse.pipe(this.localResponse.res)
                .once("finish", resolve)
                .once("error", reject);
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
        this.remoteResponse = new FakeHTTPResponse(status, headers, body);
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
        const [localSocketError, remoteSocketError] = await done;
        if (localSocketError) {
            throw localSocketError;
        }
        if (remoteSocketError) {
            throw remoteSocketError;
        }
    }
}

StreamingContext.prototype.type = "stream";

class HTTPUpgradeContext {
    constructor(parent, req, localSocket, head, processContext) {
        this.parent = parent;
        this.localSocket = localSocket;
        this.remoteResponse = null;
        this._head = head;
        this.localRequest = new LocalRequest(this, req);
        this.processContext = processContext;
    }

    get protocol() {
        return this.localRequest.headers.upgrade.toLowerCase();
    }

    async connect() {
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
            context.clientAddress = this.parent.localSocket.remoteAddress;
            context.clientPort = this.parent.localSocket.remotePort;
            this.processContext(context);
        });
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
                const [host, port] = this.localRequest.url.split(":");
                const remoteSocket = adone.std.net.connect(port, host);
                await new Promise((resolve, reject) => {
                    remoteSocket
                        .on("connect", resolve)
                        .on("error", reject);
                }).then(resolveConnect, (err) => {
                    rejectConnect(err);
                    return Promise.reject(err);
                });
                await this.sendEstablished();
                return remoteSocket;
            }, this._head);
            this.processContext(context);
        });
    }

    async _handleHTTPS() {
        const { key, cert } = this.https.rootCA;
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
                resolve();   // it calls multiple times, does it matter?
                this.processContext(context);
            };

            intercepter
                .on("request", requestHandler)
                .on("clientError", reject);
            if (this.handleUpgrade) {
                intercepter.on("upgrade", (request, socket, head) => {
                    const context = new HTTPUpgradeContext(this, request, socket, head, this.processContext);
                    this.processContext(context);
                });
            }
            let port = intercepter.address();
            if (is.object(port)) {
                port = port.port;
            }
            const localSocket = adone.std.net.connect(port, () => {
                this.sendEstablished();
                localSocket.pipe(this.localSocket).pipe(localSocket);
            });
            localSocket.once("error", () => {
                localSocket.destroy();
                this.localSocket.destroy();
            });
            this.localSocket.once("error", () => {
                localSocket.destroy();
                this.localSocket.destroy();
            });
            localSocket.on("close", () => {
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
                this.processContext(new HTTPUpgradeContext(this, request, socket, head, this.processContext));
            }).once("clientError", reject);
            //
            const localSocket = adone.std.net.connect(port, () => {
                localSocket.pipe(this.localSocket).pipe(localSocket);
            });
            localSocket.once("error", () => {
                localSocket.destroy();
                this.localSocket.destroy();
            });
            this.localSocket.once("error", () => {
                localSocket.destroy();
                this.localSocket.destroy();
            });
            localSocket.on("close", () => {
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
        await this._handleHTTPS();
    }
}

HTTPConnectContext.prototype.type = "connect";

export default class Server {
    constructor({ https = null, getInternalPort = null } = {}) {
        this.server = new adone.std.http.Server();
        this.middlewares = [];
        const composed = adone.net.http.server.helper.compose(this.middlewares);
        const processContext = (context) => composed(context);
        this.server
            .on("request", (req, res) => {
                processContext(new HTTPContext(req, res));
            })
            .on("connect", (req, socket, head) => {
                processContext(new HTTPConnectContext(req, socket, head, processContext, https, getInternalPort));
            });
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
}
