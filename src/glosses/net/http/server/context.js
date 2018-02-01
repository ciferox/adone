const {
    is,
    net: { http },
    exception,
    util
} = adone;

const {
    server: { helper: { assert, status, Cookies } }
} = http;

export default class Context {
    constructor(server, request, response) {
        this.server = server;
        this.request = request;
        this.response = response;
        this.req = request.req;
        this.res = response.res;
        this.originalUrl = this.request.originalUrl;
        this.state = {};
        this.accept = request.accept;
        this.cookies = new Cookies(this.req, this.res, {
            keys: this.server.keys,
            secure: request.secure
        });
    }

    throw(statusCode, message, properties) {
        throw http.exception.create(statusCode, message, properties);
    }

    onerror(err) {
        // don't do anything if there is no error.
        // this allows you to pass `this.onerror`
        // to node-style callbacks.
        if (is.nil(err)) {
            return;
        }

        if (!(err instanceof Error)) {
            err = new exception.Exception(adone.std.util.format("Non-error thrown: %j", err));
        }

        let headerSent = false;
        if (this.headerSent || !this.writable) {
            headerSent = err.headerSent = true;
        }

        // delegate
        this.server.emit("error", err, this);

        // nothing we can do here other
        // than delegate to the app-level
        // handler and log.
        if (headerSent) {
            return;
        }

        const { res } = this;

        // first unset all headers
        const names = res.getHeaderNames();
        for (let i = 0; i < names.length; ++i) {
            res.removeHeader(names[i]);
        }

        // then set those specified
        this.set(err.headers);

        // force text/plain
        this.type = "text";

        // ENOENT support
        if (err.code === "ENOENT") {
            err.status = 404;
        }

        // default to 500
        if (!is.number(err.status) || !status.codes.has(err.status)) {
            err.status = 500;
        }

        // respond
        const code = status.getMessageByCode(err.status);
        const msg = err.expose ? err.message : code;
        this.status = err.status;
        this.length = Buffer.byteLength(msg);
        this.res.end(msg);
    }
}

Context.prototype.assert = assert;

// Response delegation
util.delegate(Context.prototype, "response")
    .method("attachment")
    .method("redirect")
    .method("remove")
    .method("vary")
    .method("set")
    .method("append")
    .method("flushHeaders")
    .access("status")
    .access("message")
    .access("body")
    .access("length")
    .access("type")
    .access("lastModified")
    .access("etag")
    .getter("headerSent")
    .getter("writable");

// Request delegation
util.delegate(Context.prototype, "request")
    .method("acceptsLanguages")
    .method("acceptsEncodings")
    .method("acceptsCharsets")
    .method("accepts")
    .method("get")
    .method("is")
    .access("querystring")
    .access("idempotent")
    .access("socket")
    .access("search")
    .access("method")
    .access("query")
    .access("path")
    .access("url")
    .getter("origin")
    .getter("href")
    .getter("subdomains")
    .getter("protocol")
    .getter("host")
    .getter("hostname")
    .getter("URL")
    .getter("header")
    .getter("headers")
    .getter("secure")
    .getter("stale")
    .getter("fresh")
    .getter("ips")
    .getter("ip");
