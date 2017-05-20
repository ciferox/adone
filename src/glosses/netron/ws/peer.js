const { is, x, ExBuffer, netron: { GenesisPeer }, net, std } = adone;

export default class Peer extends GenesisPeer {
    constructor(options) {
        super(options);
        this.option.protocol = "ws+netron:";
        this._handlerThisArg = this.option.handlerThisArg;
        this._handler = this.option.packetHandler;
        this._ws = this.option.socket || null;
    }

    connect(options) {
        [options.port, options.host] = net.util.normalizeAddr(options.port, options.host, this.option.defaultPort);
        const addr = net.util.humanizeAddr((options.useTls ? "wss:" : "ws:"), options.port, options.host);

        if (is.nil(this._ws)) {
            return new Promise((resolve) => {
                const ws = this._ws = new net.ws.WebSocket(addr, "netron");
                ws.onopen = () => {
                    resolve();
                };
                ws.onclose = () => {
                    this.emit("disconnect");
                };
                ws.onerror = (errEvent) => {
                    this.emit("error", new x.Runtime(errEvent.data));
                };
                ws.onmessage = (msgEvent) => {
                    this._onMessage(msgEvent);
                };
            });
        }
    }

    isConnected() {
        return !is.null(this._ws) && this._ws.readyState === net.ws.WebSocket.OPEN;
    }

    disconnect() {
        this._ws.close();
        return Promise.resolve();
    }

    write(data) {
        return new Promise((resolve, reject) => {
            const buf = new ExBuffer().skip(4);
            const encoded = adone.data.mpak.serializer.encode(data, buf).flip();
            encoded.writeUInt32BE(encoded.remaining() - 4, 0);
            const ws = this._ws;
            if (!is.null(ws) && ws.readyState === net.ws.WebSocket.OPEN) {
                ws.send(encoded.toBuffer(), { binary: true, compress: false }, resolve);
            } else {
                reject(new x.IllegalState("socket is not writable"));
            }
        });
    }

    getRemoteAddress() {
        if (is.nil(this._remoteAddr) && !is.nil(this._ws)) {
            const socket = this._ws._socket;
            if (!is.nil(socket)) {
                let protocol = this.option.protocol;
                if (!protocol.endsWith(":")) {
                    protocol += ":";
                }
                if (!is.nil(socket.remoteAddress) && is.number(socket.remotePort)) {
                    this._remoteAddr = { port: socket.remotePort, address: socket.remoteAddress, family: socket.remoteFamily };
                    this._remoteAddr.full = net.util.humanizeAddr(protocol, socket.remotePort, socket.remoteAddress);
                } else if (!is.nil(socket.server) && is.string(socket.server._pipeName)) {
                    this._remoteAddr = { port: socket.server._pipeName, address: null, family: null };
                    this._remoteAddr.full = net.util.humanizeAddr(protocol, this._remoteAddr.port);
                } else {
                    this._remoteAddr = { port: "unixsocket", address: null, family: null };
                    this._remoteAddr.full = net.util.humanizeAddr(protocol, "unixsocket");
                }
                this._remoteAddr.protocol = protocol;
            } else {
                const url = this._ws.url;
                if (!is.nil(url)) {
                    const parsedUrl = std.url.parse(url);
                    this._remoteAddr = { port: parseInt(parsedUrl.port), address: parsedUrl.hostname, family: null };
                    this._remoteAddr.full = net.util.humanizeAddr(parsedUrl.protocol, this._remoteAddr.port, this._remoteAddr.address);
                    this._remoteAddr.protocol = parsedUrl.protocol;
                }
            }
        }
        return this._remoteAddr;
    }

    _onMessage(msgEvent) {
        const buffer = ExBuffer.wrap(msgEvent.data);
        const packetSize = buffer.readUInt32BE();
        buffer.compact();
        const result = adone.data.mpak.tryDecode(buffer);
        if (result) {
            if (packetSize === result.bytesConsumed) {
                this._handler.call(this._handlerThisArg, this, result.value);
            } else {
                adone.error("invalid packet");
            }
        }
    }
}
