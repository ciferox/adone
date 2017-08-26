const { is, net } = adone;

export default class Socket extends adone.event.EventEmitter {
    constructor(options = { }) {
        super();
        this.options = new adone.configuration.Configuration();
        this.options.assign({
            protocol: "tcp:",
            defaultPort: 1024,
            retryTimeout: 100,
            retryMaxTimeout: 10000,
            reconnects: 3
        }, options);
        this._localAddr = null;
        this._remoteAddr = null;
        this.nodeSocket = this.options.socket;
        this._buf = null;
        this._handlerThisArg = this.options.handlerThisArg;
        this._packetOwner = this.options.packetOwner || this;
        const packetHandler = this.options.packetHandler;
        if (is.function(packetHandler)) {
            this.onPacketHandler = (() => packetHandler);
        }
    }

    getLocalAddress() {
        if (is.null(this._localAddr)) {
            const nodeSocket = this.nodeSocket;
            if (!is.nil(nodeSocket)) {
                const protocol = this.options.protocol;
                if (!is.nil(nodeSocket.localAddress) && is.number(nodeSocket.localPort)) {
                    this._localAddr = adone.o({ port: nodeSocket.localPort, address: nodeSocket.localAddress });
                    this._localAddr.full = net.util.humanizeAddr(protocol, nodeSocket.localPort, nodeSocket.localAddress);
                } else {
                    this._localAddr = adone.o({ port: "unixsocket", address: null });
                    this._localAddr.full = net.util.humanizeAddr(protocol, "unixsocket");
                }
                this._localAddr.protocol = protocol;
            }
        }
        return this._localAddr;
    }

    getRemoteAddress() {
        if (is.null(this._remoteAddr)) {
            const nodeSocket = this.nodeSocket;
            if (!is.nil(nodeSocket)) {
                let protocol = this.options.protocol;
                if (!protocol.endsWith(":")) {
                    protocol += ":";
                }
                if (!is.nil(nodeSocket.remoteAddress) && is.number(nodeSocket.remotePort)) {
                    this._remoteAddr = adone.o({ port: nodeSocket.remotePort, address: nodeSocket.remoteAddress, family: nodeSocket.remoteFamily });
                    this._remoteAddr.full = net.util.humanizeAddr(protocol, nodeSocket.remotePort, nodeSocket.remoteAddress);
                } else if (!is.nil(nodeSocket.server) && is.string(nodeSocket.server._pipeName)) {
                    this._remoteAddr = adone.o({ port: nodeSocket.server._pipeName, address: null, family: null });
                    this._remoteAddr.full = net.util.humanizeAddr(protocol, this._remoteAddr.port);
                } else {
                    this._remoteAddr = adone.o({ port: "unixsocket", address: null, family: null });
                    this._remoteAddr.full = net.util.humanizeAddr(protocol, "unixsocket");
                }
                this._remoteAddr.protocol = protocol;
            }
        }
        return this._remoteAddr;
    }

    isConnected() {
        return !is.nil(this.nodeSocket) && !this.nodeSocket.destroyed && !this.nodeSocket.connecting;
    }

    setPacketHandler(handler) {
        if (this.isConnected()) {
            if (is.null(this._buf)) {
                handler = handler || this.onPacketHandler();
                this._buf = new adone.ExBuffer(0);
                let lpsz = null;
                this.nodeSocket.on("data", (x) => {
                    const buffer = this._buf;
                    buffer.write(x, buffer.limit);
                    buffer.limit += x.length;

                    for ( ; ; ) {
                        if (buffer.remaining() <= 4) {
                            break;
                        }
                        let packetSize = lpsz;
                        if (is.null(packetSize)) {
                            lpsz = packetSize = buffer.readUInt32BE();
                            buffer.compact();
                        }
                        if (buffer.remaining() < packetSize) {
                            break;
                        }
                        const result = adone.data.mpak.tryDecode(buffer);
                        if (result) {
                            if (packetSize !== result.bytesConsumed) {
                                buffer.clear();
                                adone.error("invalid packet");
                                break;
                            }
                            buffer.compact();
                            handler.call(this._handlerThisArg, this._packetOwner, result.value);
                            lpsz = null;
                        }
                    }
                });
            }
        } else {
            throw new adone.x.IllegalState("Socket is not connected");
        }
    }

    connect(options = { }) {
        return new Promise((resolve, reject) => {
            [options.port, options.host] = adone.net.util.normalizeAddr(options.port, options.host, this.options.defaultPort);
            let connected = false;
            let attempts = 0;
            const reconnects = this.options.reconnects;
            let retry = this.options.retryTimeout;
            const max = this.options.retryMaxTimeout;
            let connectEvent;
            let nodeSocket;

            if (is.string(options.port)) {
                options.path = options.port;
                options.port = 0;
            }
            if (options.useTls) {
                nodeSocket = this.nodeSocket = adone.std.tls.connect(options);
                connectEvent = "secureConnect";
            } else {
                nodeSocket = this.nodeSocket = new adone.std.net.Socket();
                nodeSocket.connect(options);
                connectEvent = "connect";
            }

            nodeSocket.setNoDelay();
            nodeSocket.on("error", (err) => {
                this.emit("socket error", err);
                if (adone.net.util.ignoredErrors.includes(err.code)) {
                    return this.emit("ignored error", err);
                }
                this.emit("error", err);
                if (!connected) {
                    reject(new adone.x.Connect(err.message));
                }
            }).once(connectEvent, () => {
                connected = true;
                this.setPacketHandler();
                // Т. к. локальный и удалённый адреса можно получить только после успешного подключения сокета и до разрыва соединения,
                // то форсируем вызов методов, чтобы можно было получить информацию после закрытия соединения.
                this.getLocalAddress();
                this.getRemoteAddress();
                this.emit("connect");
                resolve();
            }).on("close", () => {
                if (connected) {
                    this.nodeSocket = null;
                    return this.emit("disconnect");
                }
                if (++attempts <= reconnects) {
                    setTimeout(() => {
                        this.emit("reconnect attempt");
                        nodeSocket.destroy();
                        nodeSocket.connect(options);
                        retry = Math.round(Math.min(max, retry * 1.5)) >>> 0;
                    }, retry);
                } else {
                    this.nodeSocket = null;
                    if (options.port === 0) {
                        reject(new adone.x.Connect(`Host ${net.util.humanizeAddr(this.options.protocol, options.path)} is unreachable`));
                    } else {
                        reject(new adone.x.Connect(`Host ${net.util.humanizeAddr(this.options.protocol, options.port, options.host)} is unreachable`));
                    }
                }
            });
        });
    }

    disconnect() {
        if (!is.nil(this.nodeSocket)) {
            this.nodeSocket.end();
            this.nodeSocket.destroy();
        }
        return Promise.resolve();
    }

    write(data) {
        return new Promise((resolve, reject) => {
            const nodeSocket = this.nodeSocket;
            if (!is.null(nodeSocket) && nodeSocket.writable) {
                const buf = new adone.ExBuffer().skip(4);
                const encoded = adone.data.mpak.serializer.encode(data, buf).flip();
                encoded.writeUInt32BE(encoded.remaining() - 4, 0);
                nodeSocket.write(encoded.toBuffer(), resolve);
            } else {
                reject(new adone.x.IllegalState("Socket is not writable"));
            }
        });
    }

    onPacketHandler() {
        return null;
    }

    ref() {
        if (!this.nodeSocket) {
            this.once("connect", () => this.ref());
        } else {
            this.nodeSocket.ref();
        }
    }

    unref() {
        if (!this.nodeSocket) {
            this.once("connect", () => this.unref());
        } else {
            this.nodeSocket.unref();
        }
    }
}
