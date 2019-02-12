const {
    is,
    net
} = adone;

export default class Server extends adone.event.Emitter {
    constructor(options = {}) {
        super();
        this.options = Object.assign({
            backlog: 511,
            protocol: "tcp:",
            defaultPort: 1024
        }, options);
        this.server = null;
        this._sockets = [];
        this._peerFactory = this.options.peerFactory;
        if (!is.function(this._peerFactory)) {
            this._peerFactory = (socket, param) => new net.Socket(Object.assign({ socket }, param));
        }
        const onNewConn = this.options.сonnectionHandler;
        if (is.function(onNewConn)) {
            this.onNewConnection = onNewConn;
        }
    }

    address() {
        if (!is.null(this.server) && is.nil(this._address)) {
            const addr = this.server.address();
            let protocol = this.options.protocol;
            if (!protocol.endsWith(":")) {
                protocol += ":";
            }
            if (is.string(addr)) {
                this._address = { port: addr, address: null, family: null };
                this._address.full = net.util.humanizeAddr(protocol, addr);
            } else {
                this._address = { port: addr.port, address: addr.address, family: addr.family };
                this._address.full = net.util.humanizeAddr(protocol, addr.port, addr.address);
            }
            this._address.protocol = protocol;
        }
        return this._address;
    }

    bind(options = {}) {
        if (is.null(this.server)) {
            [options.port, options.host] = adone.net.util.normalizeAddr(options.port, options.host, this.options.defaultPort);

            const onConnect = (nodeSocket) => {
                const socket = this._peerFactory(nodeSocket, this);
                this.onNewConnection(socket).then(() => {
                    if (socket.isConnected()) {
                        socket.setPacketHandler();
                        this._addSocket(socket);
                        nodeSocket.on("error", (err) => {
                            socket.emit("socket error", err);
                            this._removeSocket(socket);
                            if (adone.net.util.ignoredErrors.includes(err.code)) {
                                return socket.emit("ignored error", err);
                            }
                            socket.emit("error", err);
                        }).on("close", () => {
                            this._removeSocket(socket);
                            socket.emit("disconnect");
                        });
                        socket.emit("connect");
                        this.emit("connection", socket);
                    }
                }).catch((err) => {
                    nodeSocket.end();
                    nodeSocket.destroy();
                    adone.logError(err.message);
                });
            };

            if (options.useTls) {
                options.requestCert = Boolean(options.requestCert);
                options.rejectUnauthorized = Boolean(options.rejectUnauthorized);
                this.server = adone.std.tls.createServer(options, onConnect);
            } else {
                this.server = adone.std.net.createServer(onConnect);
            }

            this.server.on("listening", () => this.emit("bind"));

            const backlog = this.options.backlog;
            return new Promise((resolve, reject) => {
                this.server.on("error", (e) => {
                    const unixSocket = is.string(options.port);
                    if (e.code === "EADDRINUSE") {
                        if (unixSocket) {
                            const clientSocket = new adone.std.net.Socket();
                            clientSocket.on("error", (e2) => {
                                if (e2.code === "ECONNREFUSED" || e2.code === "ENOENT") {
                                    try {
                                        adone.std.fs.unlinkSync(options.port);
                                    } catch (e) {
                                        //
                                    }
                                    this.server.listen(options.port, options.host, backlog, resolve);
                                }
                            });
                            clientSocket.connect({ path: options.port }, () => {
                                clientSocket.end();
                                reject(new adone.error.BindException(`address '${options.port}' already in use`));
                            });
                        } else {
                            reject(new adone.error.BindException(`address '${options.host}:${options.port}' already in use`));
                        }
                    } else {
                        try {
                            unixSocket && adone.std.fs.unlinkSync(options.port);
                        } catch (e) {
                            //
                        }
                        this.server.listen(options.port, options.host, backlog, resolve);
                    }
                });
                this.server.listen(options.port, options.host, backlog, resolve);
            });
        }
        throw new adone.error.BindException(`already bound on address ${this.address().full}`);
    }

    disconnect() {
        this._sockets.forEach((socket) => {
            socket.disconnect();
        });
        return this.unbind();
    }

    unbind() {
        return new Promise((resolve, reject) => {
            if (!is.null(this.server)) {
                this.server.on("close", () => this.emit("unbind"));
                this.server.close((err) => {
                    if (err) {
                        return reject(err);
                    }
                    this.server = null;
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }

    async onNewConnection(socket) {
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

    ref() {
        if (!this.server) {
            this.once("connect", () => this.ref());
        } else {
            this.server.ref();
        }
    }

    unref() {
        if (!this.server) {
            this.once("connect", () => this.unref());
        } else {
            this.server.unref();
        }
    }
}
