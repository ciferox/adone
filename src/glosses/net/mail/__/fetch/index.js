const {
    error,
    is,
    util,
    net: { mail: { __ } },
    std: { http, https, url, zlib, stream: { PassThrough } }
} = adone;

const MAX_REDIRECTS = 5;

export default function fetch(_url, options) {
    options = options || {};

    options.fetchRes = options.fetchRes || new PassThrough();
    options.cookies = options.cookies || new __.Cookies();
    options.redirects = options.redirects || 0;
    options.maxRedirects = is.nil(options.maxRedirects) ? MAX_REDIRECTS : options.maxRedirects;

    if (options.cookie) {
        for (const cookie of util.arrify(options.cookie)) {
            options.cookies.set(cookie, _url);
        }
        options.cookie = false;
    }

    const fetchRes = options.fetchRes;
    const parsed = url.parse(_url);
    let method = (options.method || "").toString().trim().toUpperCase() || "GET";
    let finished = false;
    let body;

    const handler = parsed.protocol === "https:" ? https : http;

    const headers = {
        "accept-encoding": "gzip,deflate",
        "user-agent": "adone/mail" // version
    };

    for (const [key, value] of util.entries(options.headers)) {
        headers[key.toLowerCase().trim()] = value;
    }

    if (options.userAgent) {
        headers["user-agent"] = options.userAgent;
    }

    if (parsed.auth) {
        headers.Authorization = `Basic ${Buffer.from(parsed.auth).toString("base64")}`;
    }

    const cookies = options.cookies.get(_url);

    if (cookies) {
        headers.cookie = cookies;
    }

    if (options.body) {
        if (options.contentType !== false) {
            headers["Content-Type"] = options.contentType || "application/x-www-form-urlencoded";
        }


        if (is.stream(options.body)) {
            // it's a stream
            headers["Transfer-Encoding"] = "chunked";
            body = options.body;
            body.on("error", (err) => {
                if (finished) {
                    return;
                }
                finished = true;
                err.type = "FETCH";
                err.sourceUrl = _url;
                fetchRes.emit("error", err);
            });
        } else {
            if (is.buffer(options.body)) {
                body = options.body;
            } else if (is.object(options.body)) {
                body = Buffer.from(Object.keys(options.body).map((key) => {
                    const value = options.body[key].toString().trim();
                    return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
                }).join("&"));
            } else {
                body = Buffer.from(options.body.toString().trim());
            }

            headers["Content-Type"] = options.contentType || "application/x-www-form-urlencoded";
            headers["Content-Length"] = body.length;
        }
        // if method is not provided, use POST instead of GET
        method = (options.method || "").toString().trim().toUpperCase() || "POST";
    }

    let req;
    const reqOptions = {
        method,
        host: parsed.hostname,
        path: parsed.path,
        port: parsed.port ? parsed.port : (parsed.protocol === "https:" ? 443 : 80),
        headers,
        rejectUnauthorized: false,
        agent: false
    };

    if (options.tls) {
        Object.assign(reqOptions, options.tls);
    }

    try {
        req = handler.request(reqOptions);
    } catch (E) {
        finished = true;
        setImmediate(() => {
            E.type = "FETCH";
            E.sourceUrl = _url;
            fetchRes.emit("error", E);
        });
        return fetchRes;
    }

    if (options.timeout) {
        req.setTimeout(options.timeout, () => {
            if (finished) {
                return;
            }
            finished = true;
            req.abort();
            const err = new error.Timeout("Request Timeout");
            err.type = "FETCH";
            err.sourceUrl = _url;
            fetchRes.emit("error", err);
        });
    }

    req.on("error", (err) => {
        if (finished) {
            return;
        }
        finished = true;
        err.type = "FETCH";
        err.sourceUrl = _url;
        fetchRes.emit("error", err);
    });

    req.on("response", (res) => {
        let inflate;

        if (finished) {
            return;
        }

        switch (res.headers["content-encoding"]) {
            case "gzip":
            case "deflate":
                inflate = zlib.createUnzip();
                break;
        }

        if (res.headers["set-cookie"]) {
            for (const cookie of util.arrify(res.headers["set-cookie"])) {
                options.cookies.set(cookie, _url);
            }
        }

        if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
            // redirect
            options.redirects++;
            if (options.redirects > options.maxRedirects) {
                finished = true;
                const err = new error.IllegalState("Maximum redirect count exceeded");
                err.type = "FETCH";
                err.sourceUrl = _url;
                fetchRes.emit("error", err);
                req.abort();
                return;
            }
            return fetch(url.resolve(_url, res.headers.location), options);
        }

        fetchRes.statusCode = res.statusCode;

        if (res.statusCode >= 300 && !options.allowErrorResponse) {
            finished = true;
            const err = new error.IllegalState(`Invalid status code ${res.statusCode}`);
            err.type = "FETCH";
            err.sourceUrl = _url;
            fetchRes.emit("error", err);
            req.abort();
            return;
        }

        res.on("error", (err) => {
            if (finished) {
                return;
            }
            finished = true;
            err.type = "FETCH";
            err.sourceUrl = _url;
            fetchRes.emit("error", err);
            req.abort();
        });

        if (inflate) {
            res.pipe(inflate).pipe(fetchRes);
            inflate.on("error", (err) => {
                if (finished) {
                    return;
                }
                finished = true;
                err.type = "FETCH";
                err.sourceUrl = _url;
                fetchRes.emit("error", err);
                req.abort();
            });
        } else {
            res.pipe(fetchRes);
        }
    });

    setImmediate(() => {
        if (body) {
            try {
                if (is.stream(body)) {
                    return body.pipe(req);
                }
                req.write(body);

            } catch (err) {
                finished = true;
                err.type = "FETCH";
                err.sourceUrl = _url;
                fetchRes.emit("error", err);
                return;
            }
        }
        req.end();
    });

    return fetchRes;
}
