const {
    is, x,
    net: {
        mime: { contentType },
        http: {
            server: {
                helper: {
                    status, onFinished, vary, escapeHTML, contentDisposition, typeIs
                }
            }
        }
    },
    std: { path }
} = adone;

const EMPTY = Symbol("empty");

export default class Response {
    constructor(server, res) {
        this.server = server;
        this.res = res;
        this.ctx = null;
        this._checkedContinue = false;
    }

    get socket() {
        return this.ctx.req.socket;
    }

    get header() {
        return this.res.getHeaders();
    }

    get headers() {
        // header alias
        return this.header;
    }

    get status() {
        return this.res.statusCode;
    }

    set status(code) {
        if (this.res.headersSent) {
            throw new x.IllegalState("headers have already been sent");
        }
        if (!is.number(code)) {
            throw new x.InvalidArgument("status code must be a number");
        }
        this.res.statusMessage = status.getMessageByCode(code);
        this._explicitStatus = true;
        this.res.statusCode = code;
        if (this.body && status.isEmptyBody(code)) {
            this.body = null;
        }
    }

    get message() {
        return this.res.statusMessage || status.codes.get(this.status);
    }

    set message(msg) {
        this.res.statusMessage = msg;
    }

    get body() {
        return this._body;
    }

    set body(val) {
        const original = this._body;
        this._body = val;

        if (this.res.headersSent) {
            return;
        }

        // no content
        if (is.nil(val)) {
            if (!status.isEmptyBody(this.status)) {
                this.status = 204;
            }
            this.remove("Content-Type");
            this.remove("Content-Length");
            this.remove("Transfer-Encoding");
            return;
        }

        // set the status
        if (!this._explicitStatus) {
            this.status = 200;
        }

        // set the content-type only if not yet set
        const setType = !this.header["content-type"];

        // string
        if (is.string(val)) {
            if (setType) {
                this.type = /^\s*</.test(val) ? "html" : "text";
            }
            this.length = Buffer.byteLength(val);
            return;
        }

        // buffer
        if (is.buffer(val)) {
            if (setType) {
                this.type = "bin";
            }
            this.length = val.length;
            return;
        }

        // stream
        if (is.stream(val)) {
            onFinished(this.res, () => {
                if (val.destroy) {
                    val.destroy();
                }
            });
            val.on("error", (err) => this.ctx.onerror(err));

            // overwriting
            if (!is.nil(original) && original !== val) {
                this.remove("Content-Length");
            }

            if (setType) {
                this.type = "bin";
            }
            return;
        }

        // json
        this.remove("Content-Length");
        this.type = "json";
    }

    set length(n) {
        this.set("Content-Length", n);
    }

    get length() {
        const len = this.header["content-length"];
        const body = this.body;

        if (is.nil(len)) {
            if (!body) {
                return;
            }
            if (is.string(body)) {
                return Buffer.byteLength(body);
            }
            if (is.buffer(body)) {
                return body.length;
            }
            if (body && !is.function(body.pipe)) {
                // json
                return Buffer.byteLength(JSON.stringify(body));
            }
            return;
        }

        return Number(len);
    }

    get headerSent() {
        return this.res.headersSent;
    }

    vary(field) {
        vary(this.res, field);
    }

    // Perform a 302 redirect to `url`.
    // The string "back" is special-cased to provide Referrer support,
    // when Referrer is not present `alt` or "/" is used.
    redirect(url, alt) {
        // location
        if (url === "back") {
            url = this.ctx.get("Referrer") || alt || "/";
        }
        this.set("Location", url);

        // status
        if (!status.isRedirect(this.status)) {
            this.status = 302;
        }

        // html
        if (this.ctx.accepts("html")) {
            url = escapeHTML(url);
            this.type = "text/html; charset=utf-8";
            this.body = `Redirecting to <a href="${url}">${url}</a>.`;
            return;
        }

        // text
        this.type = "text/plain; charset=utf-8";
        this.body = `Redirecting to ${url}.`;
    }

    // Set Content-Disposition header to "attachment" with optional `filename`.
    attachment(filename) {
        if (filename) {
            this.type = path.extname(filename);
        }
        this.set("Content-Disposition", contentDisposition(filename));
    }

    set type(type) {
        type = contentType(type);
        if (type) {
            this.set("Content-Type", type);
        } else {
            this.remove("Content-Type");
        }
    }

    set lastModified(val) {
        if (is.string(val)) {
            val = new Date(val);
        }
        this.set("Last-Modified", val.toUTCString());
    }

    get lastModified() {
        const date = this.get("last-modified");
        if (date) {
            return new Date(date);
        }
    }

    set etag(val) {
        if (!/^(W\/)?"/.test(val)) {
            val = `"${val}"`;
        }
        this.set("ETag", val);
    }

    get etag() {
        return this.get("ETag");
    }

    get type() {
        const type = this.get("Content-Type");
        if (!type) {
            return "";
        }
        return type.split(";")[0];
    }

    is(...types) {
        const { type } = this;
        if (types.length === 0) {
            return type || false;
        }
        if (is.array(types[0])) {
            types = types[0];
        }
        return typeIs(type, types);
    }

    // Return response header
    get(field) {
        return this.header[field.toLowerCase()] || "";
    }

    // Set header `field` to `val`, or pass an object of header fields.
    set(field, val = EMPTY) {
        if (val === EMPTY) {
            for (const key in field) {
                this.set(key, field[key]);
            }
            return;
        }
        val = is.array(val) ? val.map(String) : String(val);
        this.res.setHeader(field, val);
    }

    // Append additional header `field` with value `val`.
    append(field, val) {
        const prev = this.get(field);

        if (prev) {
            val = is.array(prev) ? prev.concat(val) : [prev].concat(val);
        }

        return this.set(field, val);
    }

    // Remove header `field`.
    remove(field) {
        this.res.removeHeader(field);
    }

    get writable() {
        if (this.res.finished) {
            return false;
        }

        const socket = this.res.socket;
        // There are already pending outgoing res, but still writable
        // https://github.com/nodejs/node/blob/v4.4.7/lib/_http_server.js#L486
        if (!socket) {
            return true;
        }
        return socket.writable;
    }

    flushHeaders() {
        this.res.flushHeaders();
    }

    writeContinue() {
        if (!this._checkedContinue && this.request.req.checkContinue) {
            this.res.writeContinue();
            this._checkedContinue = true;
        }
        return this;
    }
}
