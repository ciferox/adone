const {
    is
} = adone;
const ws = adone.stream.pull.ws;
const WebSocket = require("ws");
const url = require("url");
const http = require("http");
const https = require("https");

const EventEmitter = require("events").EventEmitter;

module.exports = function (opts, onConnection) {
    const emitter = new EventEmitter();
    var server;
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

    var server = opts.server ||
    (opts.key && opts.cert ? https.createServer(opts) : http.createServer());

    const wsServer = new WebSocket.Server({
        server,
        perMessageDeflate: false,
        verifyClient: opts.verifyClient
    });

    proxy(server, "listening");
    proxy(server, "request");
    proxy(server, "close");

    wsServer.on("connection", (socket) => {
        const stream = ws.duplex(socket);
        stream.remoteAddress = socket.upgradeReq.socket.remoteAddress;
        emitter.emit("connection", stream);
    });

    emitter.listen = function (addr, onListening) {
        if (onListening) {
            emitter.once("listening", onListening);

        }
        server.listen(addr.port || addr);
        return emitter;
    };

    emitter.close = function (onClose) {
        server.close(onClose);
        wsServer.close();
        return emitter;
    };

    emitter.address = server.address.bind(server);
    return emitter;
};

