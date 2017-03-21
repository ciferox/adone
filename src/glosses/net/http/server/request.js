
const {
    net: { http: { helper } },
    std: {
        net: { isIP },
        url: { format },
        querystring: qs
    },
    is
} = adone;

const { parseURL, isFresh, contentType, Accepts, typeIs } = helper;
const idempotentMethods = new Set(["GET", "HEAD", "PUT", "DELETE", "OPTIONS", "TRACE"]);

export default class Request {
    constructor(server, req) {
        this.server = server;
        this.req = req;
        this.originalUrl = req.url;
        this.ctx = null;
        this._querycache = null;
        this.accept = new Accepts(req);
        this.ip = this.ips[0] || req.socket.remoteAddress || "";
    }

    get header() {
        return this.req.headers;
    }

    get headers() {
        // header alias
        return this.header;
    }

    get url() {
        return this.req.url;
    }

    set url(val) {
        this.req.url = val;
    }

    get origin() {
        return `${this.protocol}://${this.host}`;
    }

    get href() {
        if (/^https?:\/\//i.test(this.originalUrl)) {
            return this.originalUrl;
        }
        return `${this.origin}${this.originalUrl}`;
    }

    get method() {
        return this.req.method;
    }

    set method(val) {
        this.req.method = val;
    }

    get path() {
        return helper.parseURL(this.req).pathname;
    }

    set path(val) {
        const url = parseURL(this.req);
        if (url.pathname === val) {
            return;
        }
        url.pathname = val;
        url.path = null;

        this.url = format(url);
    }

    get query() {
        const str = this.querystring;
        if (!this._querycache) {
            this._querycache = new Map();
        }
        if (!this._querycache.has(str)) {
            const parsed = qs.parse(str);
            this._querycache.set(str, parsed);
            return parsed;
        }
        return this._querycache.get(str);
    }

    set query(obj) {
        this.querystring = qs.stringify(obj);
    }

    get querystring() {
        if (!this.req) {
            return "";
        }

        return parseURL(this.req).query || "";
    }

    set querystring(val) {
        const url = parseURL(this.req);
        if (url.search === `?${val}`) {
            return;
        }

        url.search = val;
        url.path = null;

        this.url = format(url);
    }

    get search() {
        if (!this.querystring) {
            return "";
        }
        return `?${this.querystring}`;
    }

    set search(str) {
        this.querystring = str;
    }

    get host() {
        const { server: { proxy } } = this;
        let host = proxy && this.get("X-Forwarded-Host");
        host = host || this.get("Host");
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

    // Check if the request is fresh, aka Last-Modified and/or the ETag still match.
    get fresh() {
        const { method, ctx: { status } } = this;

        // GET or HEAD for weak freshness validation only
        if (method !== "GET" && method !== "HEAD") {
            return false;
        }

        // 2xx or 304 as per rfc2616 14.26
        if ((status >= 200 && status < 300) || status === 304) {
            return isFresh(this.header, this.ctx.response.header);
        }

        return false;
    }

    // Check if the request is stale, aka "Last-Modified" and / or the "ETag" for the resource has changed.
    get stale() {
        return !this.fresh;
    }

    get idempotent() {
        return idempotentMethods.has(this.method);
    }

    get socket() {
        return this.req.socket;
    }

    get charset() {
        let type = this.get("Content-Type");
        if (!type) {
            return "";
        }

        try {
            type = contentType.parse(type);
        } catch (e) {
            return "";
        }

        return type.parameters.charset || "";
    }

    get length() {
        const len = this.get("Content-Length");
        if (len === "") {
            return;
        }
        return Number(len);
    }


    // Return the protocol string "http" or "https" when requested with TLS.
    // When the proxy setting is enabled the "X-Forwarded-Proto" header field will be trusted.
    // If you're running behind a reverse proxy that supplies https for you this may be enabled.
    get protocol() {
        const { server: { proxy } } = this;
        if (this.socket.encrypted) {
            return "https";
        }
        if (!proxy) {
            return "http";
        }
        const proto = this.get("X-Forwarded-Proto") || "http";
        return proto.split(/\s*,\s*/)[0];
    }

    get secure() {
        return this.protocol === "https";
    }

    // When using a proxy, parse the "X-Forwarded-For" ip address list.
    // For example if the value were "client, proxy1, proxy2"
    // you would receive the array `["client", "proxy1", "proxy2"]`
    // where "proxy2" is the furthest down-stream.
    get ips() {
        const { server: { proxy } } = this;
        const val = this.get("X-Forwarded-For");
        return proxy && val ? val.split(/\s*,\s*/) : [];
    }

    get subdomains() {
        const { server: { subdomainOffset } } = this;
        const { hostname } = this;
        if (!hostname || isIP(hostname)) {
            return [];
        }
        return hostname.split(".").reverse().slice(subdomainOffset);
    }

    accepts(...args) {
        return this.accept.types(...args);
    }

    acceptsEncodings(...args) {
        return this.accept.encodings(...args);
    }

    acceptsCharsets(...args) {
        return this.accept.charsets(...args);
    }

    acceptsLanguages(...args) {
        return this.accept.languages(...args);
    }

    is(...types) {
        if (types.length === 0) {
            return typeIs.request(this.req);
        }
        if (is.array(types[0])) {
            types = types[0];
        }
        return typeIs.request(this.req, types);
    }

    get type() {
        const type = this.get("Content-Type");
        if (!type) {
            return "";
        }
        return type.split(";")[0];  // get rid of parameters
    }

    // Return request header.
    //
    // The `Referrer` header field is special-cased,
    // both `Referrer` and `Referer` are interchangeable.
    get(field) {
        const req = this.req;
        switch (field = field.toLowerCase()) {
            case "referer":
            case "referrer": {
                return req.headers.referrer || req.headers.referer || "";
            }
            default: {
                return req.headers[field] || "";
            }
        }
    }

    // body parsers

    text(limit = "100kb") {
        this.response.writeContinue();
        return helper.getRawBody(this.req, {
            limit,
            length: this.length,
            encoding: "utf8"
        });
    }

    _parseJSON(text) {
        if (this.server.jsonStrict !== false) {
            text = text.trim();
            const first = text[0];
            if (first !== "{" && first !== "[") {
                this.ctx.throw(400, "only json objects or arrays allowed");
            }
        }
        try {
            return JSON.parse(text);
        } catch (err) {
            this.ctx.throw(400, "invalid json received");
        }
    }

    json(limit) {
        if (!this.length) {
            return Promise.resolve();
        }
        return this.text(limit).then((text) => this._parseJSON(text));
    }

    _parseURLencoded(text) {
        const parse = (this.server.querystring || qs).parse;
        try {
            return parse(text);
        } catch (err) {
            this.ctx.throw(400, "invalid urlencoded received");
        }
    }

    urlencoded(limit) {
        if (!this.length) {
            return Promise.resolve();
        }
        return this.text(limit).then((text) => this._parseURLencoded(text));
    }

    buffer(limit) {
        this.response.writeContinue();
        return helper.getRawBody(this.req, {
            limit: limit || "1mb",
            length: this.length
        });
    }

    body(limit) {
        switch (this.is("urlencoded", "json")) {
            case "json": {
                return this.json(limit);
            }
            case "urlencoded": {
                return this.urlencoded(limit);
            }
            default: {
                return this.buffer(limit);
            }
        }
    }

    async multipart(options = {}) {
        const form = options.IncomingForm instanceof helper.IncomingForm
            ? options.IncomingForm
            : new helper.IncomingForm(options);

        const files = [];
        let fields = {};
        form.on("file", (name, value) => {
            files.push(value);
            fields[name] = fields[name] || [];
            fields[name].push(value);
        });

        let buff = "";
        form.on("field", (name, value) => {
            buff += `${name}=${value}&`;
        });

        const end = new Promise((resolve, reject) => {
            form.once("error", reject);
            form.once("aborted", reject);
            form.once("end", resolve);
        });
        form.parse(this.req);
        await end;

        const parseQs = (this.server.querystring || qs).parse;

        fields = buff && buff.length
            ? Object.assign({}, parseQs(buff.slice(0, -1)), fields)
            : fields;

        return { fields, files };
    }
}
