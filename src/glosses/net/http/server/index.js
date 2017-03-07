import adone from "adone";
import Context from "./context";
import Request from "./request";
import Response from "./response";
const { is, x, net: { http }, std } = adone;

export default class Server extends adone.EventEmitter {
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
        const fn = http.helper.compose(this.middlewares);

        if (!this.listeners("error").length) {
            this.on("error", this.onerror);
        }

        const handleRequest = (req, res) => {
            res.statusCode = 404;
            const ctx = this.createContext(req, res);
            const onerror = (err) => ctx.onerror(err);
            const handleResponse = () => Server.respond(ctx);
            http.helper.onFinished(res, onerror);
            fn(ctx).then(handleResponse).catch(onerror);
        };

        return handleRequest;
    }

    createContext(req, res) {
        const request = new Request(this, req);
        const response = new Response(this, res);
        request.response = response;
        response.request = request;
        const context = new Context(this, request, response);
        request.ctx = response.ctx = context;
        // context.originalUrl = request.originalUrl = req.url;
        // context.cookies = new Cookies(req, res, {
        //     keys: this.keys,
        //     secure: request.secure
        // });
        // request.ip = request.ips[0] || req.socket.remoteAddress || "";
        // context.accept = request.accept = accepts(req);
        // context.state = {};
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
        if (http.helper.status.isEmptyBody(code)) {
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

Server.Context = Context;
Server.Request = Request;
Server.Response = Response;

Server.middleware = adone.lazify({
    serve: "./middlewares/serve",
    favicon: "./middlewares/favicon"
}, null, require);
