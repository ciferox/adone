const { is, x } = adone;

export default class Adapter extends adone.netron.Adapter {
    constructor(options) {
        options.backlog = options.backlog || 511;
        super(options);
        this._wss = null;
    }

    async bind(netron) {
        this.netron = netron;

        const option = this.option;
        if (option.secure) {
            let cert;
            let key;
            if (is.buffer(option.cert)) {
                cert = option.cert;
            } else if (is.string(option.cert)) {
                cert = adone.std.fs.readFileSync(option.cert);
            } else {
                throw new x.NotValid("parameter 'option.cert' is not valid (should be buffer or string)");
            }

            if (is.buffer(option.key)) {
                key = option.key;
            } else if (is.string(option.key)) {
                key = adone.std.fs.readFileSync(option.key);
            } else {
                throw new x.NotValid("parameter 'option.key' is not valid (should be buffer or string)");
            }

            this.server = adone.std.https.createServer({ cert, key });
        } else {
            this.server = adone.std.http.createServer();
        }

        const [port, host] = adone.net.util.normalizeAddr(option.port, option.host, 4040);
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
                                } catch (e) { }
                                this.server.listen(port, host, option.backlog, resolve);
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
                    } catch (e) { }
                    this.server.listen(port, host, option.backlog, resolve);
                }
            });
            this.server.listen(port, host, option.backlog, resolve);
        });

        const connHandler = netron.option.сonnectionHandler;

        this._wss = new adone.net.ws.WebSocketServer({ server: this.server });
        this._wss.on("connection", (ws) => {
            const peer = new adone.netron.ws.Peer({
                netron,
                socket: ws,
                packetHandler: netron._processPacket,
                handlerThisArg: netron,
                protocol: netron.option.protocol,
                defaultPort: adone.netron.DEFAULT_PORT,
                responseTimeout: netron.option.responseTimeout
            });
            peer._type = adone.netron.PEER_TYPE.ACTIVE;
            const gateId = option.id;
            if (!is.undefined(gateId)) {
                peer.option.gateId = gateId;
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
                        peer._onMessage(msgEvent);
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
