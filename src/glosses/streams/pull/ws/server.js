const {
    is,
    event: { EventEmitter },
    stream: { pull },
    std: {
        http,
        https
    }
} = adone;

const {
    ws: {
        duplex
    }
} = pull;

export default function (opts, onConnection) {
    const emitter = new EventEmitter();
    if (is.function(opts)) {
        onConnection = opts;
        opts = null;
    }
    opts = opts || {};

    if (onConnection) {
        emitter.on("connection", onConnection);

    }

    const proxy = (server, event) => {
        return server.on(event, (...args) => {
            args.unshift(event);
            emitter.emit.apply(emitter, args);
        });
    };

    const server = opts.server || (opts.key && opts.cert ? https.createServer(opts) : http.createServer());

    const wsServer = new adone.net.ws.Server({
        server,
        perMessageDeflate: false,
        verifyClient: opts.verifyClient
    });

    proxy(server, "listening");
    proxy(server, "request");
    proxy(server, "close");

    wsServer.on("connection", (socket, req) => {
        const stream = duplex(socket);
        stream.remoteAddress = req.socket.remoteAddress;
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
}
