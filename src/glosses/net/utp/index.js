const timers = require("timers");
const utp = adone.nativeAddon(adone.std.path.join(__dirname, "native", "utp.node"));

const {
    is,
    noop,
    event,
    std: { net, dns }
} = adone;

adone.asNamespace(exports);

const UTP_ERRORS = [
    "UTP_ECONNREFUSED",
    "UTP_ECONNRESET",
    "UTP_ETIMEDOUT"
];

const IPV4_ONLY = new Error("Only IPv4 is supported currently. Open an issue for IPv6 support");
const unenroll = timers.unenroll || noop;
const active = timers._unrefActive || timers.active || noop;
const enroll = timers.enroll || noop;

const oncloseable = () => {
    UTP.client.close();
    UTP.client.on("error", noop);
    UTP.client = null;
};

class Connection extends adone.std.stream.Duplex {
    constructor(utp, socket) {
        super();

        this._utp = utp;
        this._socket = null;
        this._index = this._utp.connections.push(this) - 1;
        this._dataReq = null;
        this._batchReq = null;
        this._drain = null;
        this._ended = false;
        this._resolved = false;

        // set by timer
        this._idleTimeout = -1;
        this._idleNext = null;
        this._idlePrev = null;
        this._idleStart = 0;
        this._called = false;

        this.destroyed = false;
        this.on("finish", this._onend);

        if (socket) {
            this._onsocket(socket);
        }
    }

    _connect(port, ip) {
        if (this._utp) {
            this._onsocket(this._utp._handle.connect(port, ip || "127.0.0.1"));
        }
    }

    _onTimeout() {
        this.emit("timeout");
    }

    _resolveAndConnect(port, host) {
        const self = this;
        dns.lookup(host, (err, ip, family) => {
            if (self.destroyed) {
                return;
            }
            self._resolved = true;
            if (err) {
                return self.destroy(err);
            }
            if (family !== 4) {
                return self.destroy(IPV4_ONLY);
            }
            self._connect(port, ip);
        });
    }

    setTimeout(ms, ontimeout) {
        if (!ms) {
            unenroll(this);
            if (ontimeout) {
                this.removeListener("timeout", ontimeout);
            }
        } else if (!this.destroyed) {
            enroll(this, ms);
            active(this);
            if (ontimeout) {
                this.once("timeout", ontimeout);
            }
        }
        return this;
    }

    _onsocket(socket) {
        this._resolved = true;
        this._socket = socket;

        socket.context(this);
        socket.ondrain(this._ondrain);
        socket.ondata(this._ondata);
        socket.onend(this._onend);
        socket.onclose(this._onclose);
        socket.onerror(this._onerror);
        socket.onconnect(this._onconnect);

        this.emit("resolve");
    }

    _onclose() {
        this.destroyed = true;
        this._cleanup();
        this.emit("close");
    }

    _ondrain() {
        const drain = this._drain;
        this._drain = null;
        this._batchReq = null;
        this._dataReq = null;
        if (drain) {
            drain();
        }
    }

    _ondata(data) {
        if (this.destroyed) {
            return;
        }
        active(this);
        this.push(data);
    }

    _onerror(error) {
        this.destroy(new Error(UTP_ERRORS[error] || "UTP_UNKNOWN_ERROR"));
    }

    _onconnect() {
        this.emit("connect");
    }

    ref() {
        this._utp.ref();
    }

    unref() {
        this._utp.unref();
    }

    address() {
        return this._utp && this._utp.address();
    }

    _write(data, enc, cb) {
        if (this.destroyed) {
            return cb();
        }
        if (!this._resolved) {
            return this.once("resolve", this._write.bind(this, data, enc, cb));
        }
        active(this);

        if (this._socket.write(data)) {
            return cb();
        }
        this._dataReq = data;
        this._drain = cb;
    }

    _writev(batch, cb) {
        if (this.destroyed) {
            return cb();
        }
        if (!this._resolved) {
            return this.once("resolve", this._writev.bind(this, batch, cb));
        }
        active(this);

        if (this._socket.writev(batch)) {
            return cb();
        }
        this._batchReq = batch;
        this._drain = cb;
    }

    _onend() {
        if (!this._resolved) {
            return this.once("resolve", this._onend);
        }
        if (this._ended) {
            return;
        }
        this._ended = true;
        if (this._socket) {
            this._socket.end();
        }
        if (!this.destroyed) {
            this.push(null);
        }
    }

    destroy(err) {
        if (!this._resolved) {
            return this.once("resolve", this._destroy.bind(this, err));
        }
        if (this.destroyed) {
            return;
        }
        this.destroyed = true;

        unenroll(this);
        if (err) {
            this.emit("error", err);
        }

        this._onend();

        if (!this._socket) {
            this._cleanup();
            this.emit("close");
        }
    }

    _read() {
        // no readable backpressure atm
    }

    _cleanup() {
        const last = this._utp.connections.pop();
        if (last !== this) {
            this._utp.connections[this._index] = last;
            last._index = this._index;
        }

        if (!this._utp.connections.length) {
            this._utp.emit("closeable");
        }
        unenroll(this);
        this._utp = null;
        this._socket = null;
    }
}

class SendRequest {
    constructor(buffer, offset, len, port, host, callback) {
        this.buffer = buffer;
        this.offset = offset;
        this.length = len;
        this.port = port;
        this.host = host;
        this.callback = callback;
    }
}

const next = (fn, arg) => {
    process.nextTick(() => {
        fn(arg);
    });
};

const emit = (self, name, arg) => {
    process.nextTick(() => {
        if (arg) {
            self.emit(name, arg);
        } else {
            self.emit(name);
        }
    });
};


export class UTP extends event.Emitter {
    constructor() {
        super();

        this.connections = [];

        this._refs = 1;
        this._closed = false;
        this._bound = false;
        this._firewalled = true;
        this._maxConnections = 0;
        this._sending = new Array(64);
        this._sendingFree = [];
        this._sendingPending = [];
        for (let i = 63; i >= 0; i--) {
            this._sendingFree.push(i);
        }

        this._handle = utp.utp();
        this._handle.context(this);
        this._handle.onclose(this._onclose);
        this._handle.onmessage(this._onmessage);
        this._handle.onsend(this._onsend);
        this._handle.onerror(this._onerror);
    }

    get maxConnections() {
        return this._maxConnections;
    }

    set maxConnections(val) {
        this._maxConnections = val;
        this._handle.maxSockets(val);
    }

    _onmessage(buf, rinfo) {
        this.emit("message", buf, rinfo);
    }

    _onsend(ptr, error) {
        const req = this._sending[ptr];
        this._sending[ptr] = null;
        this._sendingFree.push(ptr);
        this._free();
        if (error) {
            req.callback(new Error("Send failed"));
        } else {
            req.callback(null, req.buffer.length);
        }
    }

    _onclose() {
        this._handle = null;
        this.emit("close");
    }

    _onerror() {
        this.emit(new Error("Unknown UDP error"));
    }

    address() {
        return this._handle.address();
    }

    send(buf, offset, len, port, host, cb) {
        if (is.function(host)) {
            return this.send(buf, offset, len, port, null, host);
        }
        if (!is.buffer(buf)) {
            throw new Error("Buffer should be a buffer");
        }
        if (!is.number(offset)) {
            throw new Error("Offset should be a number");
        }
        if (!is.number(len)) {
            throw new Error("Length should be a number");
        }
        if (!is.number(port)) {
            throw new Error("Port should be a number");
        }
        if (host && !is.string(host)) {
            throw new Error("Host should be a string");
        }

        if (!this._bound) {
            this.bind();
        }
        if (!cb) {
            cb = noop;
        }
        if (host && !net.isIPv4(host)) {
            return this._resolveAndSend(buf, offset, len, port, host, cb);
        }
        if (!this._sendingFree.length) {
            return this._deferSend(buf, offset, len, port, host, cb);
        }

        const free = this._sendingFree.pop();
        this._sending[free] = new SendRequest(buf, offset, len, port, host, cb);

        try {
            this._handle.send(free, buf, offset, len, Number(port), host || "127.0.0.1");
        } catch (err) {
            this._sending[free] = null;
            this._sendingFree.push(free);
            this._free();
            next(cb, err);
        }
    }

    _deferSend(buf, offset, len, port, host, cb) {
        this._sendingPending.push(new SendRequest(buf, offset, len, port, host, cb));
    }

    _free() {
        if (this._sendingPending.length) {
            const req = this._sendingPending.shift();
            this.send(req.buffer, req.offset, req.length, req.port, req.host, req.callback);
        }
    }

    _resolveAndSend(buf, offset, len, port, host, cb) {
        if (!cb) {
            cb = noop;
        }
        const self = this;
        dns.lookup(host, (err, ip, family) => {
            if (err) {
                return cb(err);
            }
            if (family !== 4) {
                return cb(IPV4_ONLY);
            }
            self.send(buf, offset, len, port, ip, cb);
        });
    }

    connect(port, host) {
        if (port && typeof port === "object") {
            return this.connect(port.port, port.host);
        }
        if (is.string(port)) {
            port = Number(port);
        }
        if (host && !is.string(host)) {
            throw new Error("Host should be a string");
        }
        if (!port) {
            throw new Error("Port should be a number");
        }

        if (!this._bound) {
            this.bind();
        }

        const conn = new Connection(this);

        if (!host || net.isIPv4(host)) {
            conn._connect(port, host || "127.0.0.1");
        } else {
            conn._resolveAndConnect(port, host);
        }

        return conn;
    }

    bind(port, ip, onlistening) {
        if (is.function(port)) {
            return this.bind(0, null, port);
        }
        if (is.function(ip)) {
            return this.bind(port, null, ip);
        }
        if (ip && !is.string(ip)) {
            throw new Error("IP must be a string");
        }

        if (onlistening) {
            this.once("listening", onlistening);
        }

        if (this._bound) {
            throw new Error("Socket is already bound");
        }

        try {
            this._handle.bind(Number(port) || 0, ip || "0.0.0.0");
            this._bound = true;
        } catch (err) {
            emit(this, "error", err);
            return;
        }

        emit(this, "listening");
    }

    listen(port, ip, onlistening) {
        if (this._bound && port) {
            throw new Error("Socket is already bound");
        }
        if (!is.undefined(port)) {
            this.bind(port, ip, onlistening);
        } else {
            this.bind();
        }

        if (!this._firewalled) {
            return;
        }
        this._firewalled = false;
        this._handle.onsocket(this._onsocket);
    }

    _onsocket(socket) {
        this.emit("connection", new Connection(this, socket));
    }

    ref() {
        if (++this._refs === 1) {
            this._handle.ref();
        }
    }

    unref() {
        if (--this._refs === 0) {
            this._handle.unref();
        }
    }

    close(cb) {
        if (this._handle) {
            if (cb) {
                this.once("close", cb);
            }
            if (this._closed) {
                return;
            }
            this._closed = true;
            this._handle.destroy();
            return;
        }

        if (cb) {
            process.nextTick(cb);
        }
    }
}

UTP.client = null; // reuse a global client

export const createServer = (onconnection) => {
    const server = new UTP();
    if (onconnection) {
        server.on("connection", onconnection);
    }
    return server;
};

export const connect = (port, host) => {
    if (UTP.client) {
        return UTP.client.connect(port, host);
    }
    UTP.client = new UTP();
    UTP.client.once("closeable", oncloseable);
    return UTP.client.connect(port, host);
};
