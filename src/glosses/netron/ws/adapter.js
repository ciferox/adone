const {
    is,
    x
} = adone;

export default class Adapter extends adone.netron.Adapter {
    constructor(options) {
        super(Object.assign({
            backlog: 511
        }, options));
        this._wss = null;
    }

    async bind(netron) {
        this.netron = netron;

        const options = this.options;
        if (options.secure) {
            let cert;
            let key;
            if (is.buffer(options.cert)) {
                cert = options.cert;
            } else if (is.string(options.cert)) {
                cert = adone.std.fs.readFileSync(options.cert);
            } else {
                throw new x.NotValid("parameter 'options.cert' is not valid (should be buffer or string)");
            }

            if (is.buffer(options.key)) {
                key = options.key;
            } else if (is.string(options.key)) {
                key = adone.std.fs.readFileSync(options.key);
            } else {
                throw new x.NotValid("parameter 'options.key' is not valid (should be buffer or string)");
            }

            this.server = adone.std.https.createServer({ cert, key });
        } else {
            this.server = adone.std.http.createServer();
        }

        const [port, host] = adone.net.util.normalizeAddr(options.port, options.host, 4040);
        await new Promise((resolve, reject) => {
            this.server.on("error", (e) => {
                const unixSocket = is.string(port);
                if (e.code === "EADDRINUSE") {
                    if (unixSocket) {
                        const clientSocket = new adone.std.net.Socket();
                        clientSocket.on("error", (e2) => {
                            if (e2.code === "ECONNREFUSED" || e2.code === "ENOENT") {
                                try {
                                    adone.std.fs.unlinkSync(port);
                                } catch (e) {
                                    //
                                }
                                this.server.listen(port, host, options.backlog, resolve);
                            }
                        });
                        clientSocket.connect({ path: port }, () => {
                            clientSocket.end();
                            reject(new x.Bind(`address '${port}' already in use`));
                        });
                    } else {
                        reject(new x.Bind(`address '${host}:${port}' already in use`));
                    }
                } else {
                    try {
                        unixSocket && adone.std.fs.unlinkSync(port);
                    } catch (e) {
                        //
                    }
                    this.server.listen(port, host, options.backlog, resolve);
                }
            });
            this.server.listen(port, host, options.backlog, resolve);
        });

        const connHandler = netron.options.сonnectionHandler;

        this._wss = new adone.net.ws.Server({ server: this.server });
        this._wss.on("connection", (ws) => {
            const peer = new adone.netron.ws.Peer({
                netron,
                socket: ws,
                packetHandler: netron._processPacket,
                handlerThisArg: netron,
                protocol: netron.options.protocol,
                defaultPort: adone.netron.DEFAULT_PORT,
                responseTimeout: netron.options.responseTimeout
            });
            const gateId = options.id;
            if (!is.undefined(gateId)) {
                peer.options.gateId = gateId;
            }
            netron._emitPeerEvent("peer create", peer);
            connHandler(peer).then(() => {
                if (peer.isConnected()) {
                    ws.onerror = (errEvent) => {
                        peer.emit("error", new x.Runtime(errEvent.data));
                    };
                    ws.onclose = () => {
                        peer.emit("disconnect");
                    };
                    ws.onmessage = (msgEvent) => {
                        peer._onMessage(msgEvent.data);
                    };
                }
            });
        });
    }

    async disconnect() {
        if (!is.null(this._wss)) {
            return new Promise((resolve) => {
                this._wss.close(resolve);
            });
        }
    }

    async unbind() {
        if (!is.null(this.server)) {
            return new Promise((resolve) => {
                this.server.close(() => {
                    this.server = null;
                    resolve();
                });
            });
        }
    }
}
