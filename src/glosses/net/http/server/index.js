const { is, x, std, EventEmitter, net: { http } } = adone;

adone.lazify({
    Context: "./context",
    Request: "./request",
    Response: "./response",
    util: "./utils",
    helper: () => adone.lazify({
        compose: "./helpers/compose",
        status: "./helpers/statuses",
        Accepts: "./helpers/accepts",
        parseURL: "./helpers/parse_url",
        isFresh: "./helpers/is_fresh",
        contentType: "./helpers/content_type",
        Negotiator: "./helpers/negotiator",
        mediaTyper: "./helpers/media_typer",
        typeIs: "./helpers/type_is",
        onFinished: "./helpers/on_finished",
        isFinished: "./helpers/is_finished",
        vary: "./helpers/vary",
        escapeHTML: "./helpers/escape_html",
        contentDisposition: "./helpers/content_disposition",
        assert: "./helpers/assert",
        resolvePath: "./helpers/resolve_path",
        send: "./helpers/send",
        IncomingForm: "./helpers/incoming_form",
        Cookies: "./helpers/cookies",
        pathToRegexp: "./helpers/path_to_regexp",
        getRawBody: "./helpers/raw_body",
        basicAuth: "./helpers/basic_auth"
    }, null, require),
    middleware: () => adone.lazify({
        serve: "./middlewares/serve",
        favicon: "./middlewares/favicon",
        logger: "./middlewares/logger",
        session: "./middlewares/session",
        views: "./middlewares/views",
        router: "./middlewares/router",
        body: "./middlewares/body",
        mount: "./middlewares/mount",
        basicAuth: "./middlewares/basic_auth",
        rewrite: "./middlewares/rewrite"
    }, null, require)

    // middleware: () => adone.lazify({
    //     router: "./http/middlewares/router",
    //     renderer: ["./http/middlewares/renderer", (mod) => adone.lazify({
    //         Engine: ["./http/middlewares/renderer/engine", (mod) => {
    //             mod.default.compile = mod.compile;
    //             mod.default.render = mod.render;
    //             return mod.default;
    //         }]
    //     }, mod.default, require)],
    //     cookies: "./http/middlewares/cookies",
    //     body: ["./http/middlewares/body", (mod) => adone.lazify({
    //         buffer: "./http/middlewares/body/buffer",
    //         json: "./http/middlewares/body/json",
    //         multipart: "./http/middlewares/body/multipart",
    //         text: "./http/middlewares/body/text",
    //         urlencoded: "./http/middlewares/body/urlencoded"
    //     }, mod.default, require)],
    //     session: ["./http/middlewares/session", (mod) => {
    //         mod.default.Store = mod.Store;
    //         return mod.default;
    //     }],
    //     static: "./http/middlewares/static",
    //     favicon: "./http/middlewares/favicon",
    //     logger: "./http/middlewares/logger",
    //     useragent: "./http/middlewares/useragent",
    //     geoip: "./http/middlewares/geoip",
    //     rewrite: "./http/middlewares/rewrite"
    // })
}, exports, require);

export class Server extends EventEmitter {
    constructor() {
        super();

        this.server = null;
        this._sockets = [];
        this.proxy = false;
        this.middlewares = [];
    }

    bind(options = {}, listenCallback) {
        const callback = this.callback();
        if (is.plainObject(options.secure)) {
            this.server = std.https.createServer(options.secure, callback);
        } else {
            this.server = std.http.createServer(callback);
        }
        
        this.server.on("connection", (socket) => {
            this._addSocket(socket);
            socket.on("error", (/*err*/) => {
                this._removeSocket(socket);
            }).on("close", () => {
                this._removeSocket(socket);
            });        
        });

        const port = is.number(options.port) ? options.port : (is.string(options.port) ? options.port : 0);
        const host = options.host;
        let backlog;
        if (is.number(options.backlog)) {
            backlog = options.backlog;
        } else {
            backlog = 511;
        }
        return this.server.listen(port, host, backlog, listenCallback);
    }

    callback() {
        const fn = http.server.helper.compose(this.middlewares);

        if (!this.listeners("error").length) {
            this.on("error", this.onerror);
        }

        return (req, res) => {
            res.statusCode = 404;
            const ctx = this.createContext(req, res);
            const onerror = (err) => ctx.onerror(err);
            const handleResponse = () => Server.respond(ctx);
            http.server.helper.onFinished(res, onerror);
            return fn(ctx).then(handleResponse).catch(onerror);
        };
    }

    unbind() {
        if (!is.null(this.server)) {
            // Force close all active connections
            for (const socket of this._sockets) {
                socket.end();
            }
            return new Promise((resolve) => {
                this.server.close(resolve);
            });
        }
    }

    use(middleware) {
        if (!is.function(middleware)) {
            throw new x.InvalidArgument("Middleware must be a function");
        }
        this.middlewares.push(middleware);
        return this;
    }

    createContext(req, res) {
        const request = new adone.net.http.server.Request(this, req);
        const response = new adone.net.http.server.Response(this, res);
        request.response = response;
        response.request = request;
        const context = new adone.net.http.server.Context(this, request, response);
        request.ctx = response.ctx = context;
        return context;
    }

    

    onerror(err) {
        if (!is.error(err)) {
            throw new x.IllegalState(`non-error thrown: ${err}`);
        }

        if (err.status === 404 || err.expose) {
            return;
        }
        if (this.silent) {
            return;
        }

        const msg = err.stack || err.toString();
        console.error();
        console.error(msg.replace(/^/gm, "  "));
        console.error();
    }

    _addSocket(socket) {
        this._sockets.push(socket);
    }

    _removeSocket(socket) {
        const i = this._sockets.indexOf(socket);
        if (i > -1) {
            this._sockets.splice(i, 1);
        }
    }

    static respond(ctx) {
        if (ctx.respond === false) {
            return;
        }

        const res = ctx.res;
        if (!ctx.writable) {
            return;
        }

        let body = ctx.body;
        const code = ctx.status;

        // ignore body
        if (http.server.helper.status.isEmptyBody(code)) {
            // strip headers
            ctx.body = null;
            return res.end();
        }

        if (ctx.method === "HEAD") {
            if (!res.headersSent && body && !is.string(body) && !is.function(body.pipe) && !is.buffer(body)) {
                ctx.length = Buffer.byteLength(JSON.stringify(body));
            }
            return res.end();
        }

        // status body
        if (is.nil(body)) {
            body = ctx.message || String(code);
            if (!res.headersSent) {
                ctx.type = "text";
                ctx.length = Buffer.byteLength(body);
            }
            return res.end(body);
        }

        // responses
        if (is.buffer(body)) {
            return res.end(body);
        }
        if (is.string(body)) {
            return res.end(body);
        }
        if (is.stream(body)) {
            return body.pipe(res);
        }

        // body: json
        body = JSON.stringify(body);
        if (!res.headersSent) {
            ctx.length = Buffer.byteLength(body);
        }
        res.end(body);
    }
}
