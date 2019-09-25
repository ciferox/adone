const {
    is
} = adone;

const ws = require("./");
const WebSocket = require("ws");
const http = require("http");
const https = require("https");

const EventEmitter = require("events").EventEmitter;
module.exports = !WebSocket.Server ? null : function (opts, onConnection) {
    const emitter = new EventEmitter();

    if (is.function(opts)) {
        onConnection = opts;
        opts = null;
    }
    opts = opts || {};

    if (onConnection) {
        emitter.on("connection", onConnection);
    }

    function proxy(server, event) {
        return server.on(event, function () {
            const args = [].slice.call(arguments);
            args.unshift(event);
            emitter.emit.apply(emitter, args);
        });
    }

    const server = opts.server ||
        (opts.key && opts.cert ? https.createServer(opts) : http.createServer());

    const wsServer = new WebSocket.Server({
        server,
        perMessageDeflate: false,
        verifyClient: opts.verifyClient
    });

    proxy(server, "listening");
    proxy(server, "request");
    proxy(server, "close");

    wsServer.on("connection", (socket, req) => {
        const stream = ws(socket);
        stream.remoteAddress = req.socket.remoteAddress;
        emitter.emit("connection", stream, req);
    });

    emitter.listen = function (addr) {
        return new Promise((resolve) => {
            emitter.once("listening", () => resolve(emitter));
            server.listen(addr.port || addr);
        });
    };

    emitter.close = function () {
        return new Promise((resolve) => {
            server.close(resolve);
            wsServer.close();
        });
    };

    emitter.address = server.address.bind(server);
    return emitter;
};
