adone.lazify({
    Context: "./context",
    Request: "./request",
    Response: "./response",
    helper: "./helpers",
    util: "./utils",
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

const {
    net: { http: { server: { helper: { compose, onFinished, status: { isEmptyBody } } } } },
    is, x, std, EventEmitter
} = adone;

export class Server extends EventEmitter {
    constructor() {
        super();

        this.proxy = false;
        this.middlewares = [];
    }

    listen(...args) {
        const server = std.http.createServer(this.callback());
        return server.listen(...args);
    }

    use(middleware) {
        if (!is.function(middleware)) {
            throw new x.InvalidArgument("Middleware must be a function");
        }
        this.middlewares.push(middleware);
        return this;
    }

    callback() {
        const fn = compose(this.middlewares);

        if (!this.listeners("error").length) {
            this.on("error", this.onerror);
        }

        const handleRequest = (req, res) => {
            res.statusCode = 404;
            const ctx = this.createContext(req, res);
            const onerror = (err) => ctx.onerror(err);
            const handleResponse = () => Server.respond(ctx);
            onFinished(res, onerror);
            return fn(ctx).then(handleResponse).catch(onerror);
        };

        return handleRequest;
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
        if (isEmptyBody(code)) {
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
