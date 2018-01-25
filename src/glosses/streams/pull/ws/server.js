const {
    is,
    event,
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

export default class Server extends event.Emitter {
    constructor(opts, onConnection) {
        super();

        if (is.function(opts)) {
            onConnection = opts;
            opts = null;
        }
        opts = opts || {};

        is.function(onConnection) && this.on("connection", onConnection);

        this.server = opts.server || (opts.key && opts.cert ? https.createServer(opts) : http.createServer());

        this.server.on("listening", () => this.emit("listening"));
        this.server.on("request", (req, res) => this.emit("request", req, res));
        this.server.on("close", () => this.emit("close"));

        this.wsServer = new adone.net.ws.Server({
            server: this.server,
            perMessageDeflate: false,
            verifyClient: opts.verifyClient
        });

        this.wsServer.on("connection", (socket, req) => {
            const stream = duplex(socket);
            stream.remoteAddress = req.socket.remoteAddress;
            this.emit("connection", stream);
        });
    }

    listen(addr, callback) {
        is.function(callback) && this.once("listening", callback);
        this.server.listen(addr.port || addr);
        return this;
    }

    close(onClose) {
        this.wsServer.close(() => {
            this.server.close(onClose);
        });
        return this;
    }

    address() {
        return this.server.address();
    }
}
