import BaseContext from "./base";

const {
    is,
    error,
    net: {
        proxy: {
            http: { tunnel }
        },
        http: {
            server: { helper }
        }
    }
} = adone;

const hopByHopHeaders = new Set([
    "connection",
    "keep-alive",
    "proxy-connection", // hm
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailers",
    "transfer-encoding",
    "upgrade"
]);

export class LocalRequest {
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
            port = Number(port); // incorrect number?
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
        throw new error.InvalidArgumentException("request body must be a buffer, string or readable stream");
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

export class LocalResponse {
    constructor(context, res) {
        this.context = context;
        this.res = res;
    }

    writeHead(status, headers) {
        return this.res.writeHead(status, headers);
    }
}

export class RemoteResponse {
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

export class FakeHTTPResponse extends RemoteResponse {
    constructor(context, status, headers, body) {
        super(context, {});
        this._status = status;
        this._headers = headers;
        this._body = body;
    }
}

export default class HTTPContext extends BaseContext {
    constructor(req, res, parent = null) {
        super("http");
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
