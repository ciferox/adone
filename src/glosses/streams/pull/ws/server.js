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
        this.opts = opts || {};

        is.function(onConnection) && this.on("connection", onConnection);

        this.server = this.opts.server || (this.opts.key && this.opts.cert ? https.createServer(this.opts) : http.createServer());
        this.server.on("listening", () => this.emit("listening"));
        this.server.on("request", (req, res) => this.emit("request", req, res));
        this.server.on("close", () => this.emit("close"));

        this.wsServer = null;
    }

    listen(addr, callback) {
        const errorHandler = (err) => {
            is.function(callback) && callback(err);
        };

        this.server.on("error", errorHandler);
        this.server.listen(addr.port || addr, () => {
            this.server.removeListener("error", errorHandler);

            this.wsServer = new adone.net.ws.Server({
                server: this.server,
                perMessageDeflate: false,
                verifyClient: this.opts.verifyClient
            });

            this.wsServer.on("connection", (socket, req) => {
                const stream = duplex(socket);
                stream.remoteAddress = req.socket.remoteAddress;
                this.emit("connection", stream);
            });

            is.function(callback) && callback();
        });

        return this;
    }

    close(onClose) {
        setImmediate(() => {
            if (!is.null(this.wsServer)) {
                this.wsServer.close(() => {
                    this.server.close(onClose);
                });
            }
        });
        return this;
    }

    address() {
        return this.server.address();
    }
}
