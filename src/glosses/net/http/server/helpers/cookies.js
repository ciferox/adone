const {
    is,
    error,
    crypto: { Keygrip: { UrlSafe: Keygrip } },
    util
} = adone;

/**
 * RegExp to match field-content in RFC 7230 sec 3.2
 *
 * field-content = field-vchar [ 1*( SP / HTAB ) field-vchar ]
 * field-vchar   = VCHAR / obs-text
 * obs-text      = %x80-FF
 */
const fieldContentRegExp = /^[\u0009\u0020-\u007e\u0080-\u00ff]+$/;

// RegExp to match Same-Site cookie attribute value.
const sameSiteRegExp = /^(?:lax|strict)$/i;

class Cookie {
    constructor(name, value, attrs) {
        if (!fieldContentRegExp.test(name)) {
            throw new error.InvalidArgumentException("argument name is invalid");
        }

        if (value && !fieldContentRegExp.test(value)) {
            throw new error.InvalidArgumentException("argument value is invalid");
        }

        if (!value) {
            this.expires = new Date(0);
        }

        this.name = name;
        this.value = value || "";

        attrs = util.entries(attrs);
        for (let i = 0; i < attrs.length; ++i) {
            this[attrs[i][0]] = attrs[i][1];
        }

        if (this.path && !fieldContentRegExp.test(this.path)) {
            throw new error.InvalidArgumentException("option path is invalid");
        }

        if (this.domain && !fieldContentRegExp.test(this.domain)) {
            throw new error.InvalidArgumentException("option domain is invalid");
        }

        if (this.sameSite && this.sameSite !== true && !sameSiteRegExp.test(this.sameSite)) {
            throw new error.InvalidArgumentException("option sameSite is invalid");
        }
    }

    toString() {
        return `${this.name}=${this.value}`;
    }

    toHeader() {
        let header = this.toString();

        if (this.maxAge) {
            this.expires = new Date(Date.now() + this.maxAge);
        }

        if (this.path) {
            header += `; path=${this.path}`;
        }
        if (this.expires) {
            header += `; expires=${this.expires.toUTCString()}`;
        }
        if (this.domain) {
            header += `; domain=${this.domain}`;
        }
        if (this.sameSite) {
            header += `; samesite=${this.sameSite === true ? "strict" : this.sameSite.toLowerCase()}`;
        }
        if (this.secure) {
            header += "; secure";
        }
        if (this.httpOnly) {
            header += "; httponly";
        }

        return header;
    }
}

Cookie.prototype.path = "/";
Cookie.prototype.expires = undefined;
Cookie.prototype.domain = undefined;
Cookie.prototype.httpOnly = true;
Cookie.prototype.sameSite = false;
Cookie.prototype.secure = false;
Cookie.prototype.overwrite = false;

const cache = new Map();

const getPattern = (name) => {
    const existing = cache.get(name);
    if (existing) {
        return existing;
    }

    const pattern = new RegExp(`(?:^|;) *${name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&")}=([^;]*)`);
    cache.set(name, pattern);
    return pattern;
};

const pushCookie = (cookies, cookie) => {
    if (cookie.overwrite) {
        cookies = cookies.filter((c) => {
            return c.indexOf(`${cookie.name}=`) !== 0;
        });
    }
    cookies.push(cookie.toHeader());
    return cookies;
};


export default class Cookies {
    constructor(request, response, options) {
        this.secure = undefined;
        this.request = request;
        this.response = response;

        if (options) {
            this.keys = is.array(options.keys) ? new Keygrip(options.keys) : options.keys;
            this.secure = options.secure;
        }
    }

    get(name, opts) {
        const { request: { headers: { cookie: header } } } = this;
        if (!header) {
            return;
        }

        const match = header.match(getPattern(name));

        if (!match) {
            return;
        }
        const value = match[1];

        if (!opts) {
            return value;
        }

        const signed = is.undefined(opts.signed) ? Boolean(this.keys) : opts.signed;

        if (!signed) {
            return value;
        }

        if (!this.keys) {
            throw new error.IllegalStateException(".keys required for signed cookies");
        }

        const sigName = `${name}.sig`;
        const remote = this.get(sigName);

        if (!remote) {
            return;
        }

        const data = `${name}=${value}`;
        const index = this.keys.indexOf(data, remote);

        if (index > -1) {
            if (index > 0) {
                this.set(sigName, this.keys.sign(data), { signed: false });
            }
            return value;
        }
        this.set(sigName, null, { path: "/", signed: false });
    }

    set(name, value, opts) {
        const { response: res, request: req } = this;
        const secure = is.undefined(this.secure) ? req.protocol === "https" || req.connection.encrypted : Boolean(this.secure);

        if (!secure && opts && opts.secure) {
            throw new error.IllegalStateException("Cannot send secure cookie over unencrypted connection");
        }

        const cookie = new Cookie(name, value, opts);
        const signed = opts && !is.undefined(opts.signed) ? opts.signed : Boolean(this.keys);

        let headers = res.getHeader("Set-Cookie") || [];

        if (is.string(headers)) {
            headers = [headers];
        }


        cookie.secure = secure;
        if (opts && !is.undefined(opts.secure)) {
            cookie.secure = opts.secure;
        }

        headers = pushCookie(headers, cookie);

        if (opts && signed) {
            if (!this.keys) {
                throw new error.IllegalStateException(".keys required for signed cookies");
            }
            cookie.value = this.keys.sign(cookie.toString());
            cookie.name += ".sig";
            headers = pushCookie(headers, cookie);
        }

        res.setHeader("Set-Cookie", headers);
        return this;
    }
}

Cookies.Cookie = Cookie;
Cookies.cache = cache;
