const {
    GenesisPeer
} = adone.netron;

export default class Peer extends GenesisPeer {
    constructor(options = { }) {
        super(options);
        this.options.packetOwner = this;
        this._socket = new adone.net.Socket(this.options);
        this._socket.on("error", (err) => {
            this.emit("error", err);
        }).on("connect", () => {
            this.emit("connect");
        }).on("disconnect", () => {
            this.emit("disconnect");
        }).on("reconnect attempt", () => {
            this.emit("reconnect attempt");
        });
    }

    connect(options) {
        return this._socket.connect(options);
    }

    isConnected() {
        return this._socket.isConnected();
    }

    disconnect() {
        return this._socket.disconnect();
    }

    write(data) {
        return this._socket.write(data);
    }

    // only as proxies to real functions (just for sockets)
    setPacketHandler() {
        return this._socket.setPacketHandler();
    }

    getRemoteAddress() {
        return this._socket.getRemoteAddress();
    }

    ref() {
        this._socket.ref();
    }

    unref() {
        this._socket.unref();
    }
}
adone.tag.add(Peer, "NETRON_PEER");
