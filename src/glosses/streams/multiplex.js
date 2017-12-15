const {
    is,
    data: { varint }
} = adone;

const SIGNAL_FLUSH = Buffer.from([0]);

const empty = Buffer.allocUnsafe(0);
let pool = Buffer.alloc(10 * 1024);
let used = 0;

class Channel extends adone.std.stream.Duplex {
    constructor(name, plex, opts = {}) {
        super();

        this.name = name;
        this.channel = 0;
        this.initiator = false;
        this.chunked = Boolean(opts.chunked);
        this.halfOpen = Boolean(opts.halfOpen);
        this.destroyed = false;
        this.finalized = false;

        this._multiplex = plex;
        this._dataHeader = 0;
        this._opened = false;
        this._awaitDrain = 0;
        this._lazy = Boolean(opts.lazy);

        let finished = false;
        let ended = false;

        this.once("end", function () {
            this._read(); // trigger drain
            if (this.destroyed) {
                return;
            }
            ended = true;
            if (finished) {
                this._finalize();
            } else if (!this.halfOpen) {
                this.end();
            }
        });

        this.once("finish", function onfinish() {
            if (this.destroyed) {
                return;
            }
            if (!this._opened) {
                this.once("open", onfinish);
            } else {
                if (this._lazy && this.initiator) {
                    this._open();
                }
                this._multiplex._send(this.channel << 3 | (this.initiator ? 4 : 3), null);
                finished = true;
                if (ended) {
                    this._finalize();
                }
            }
        });
    }

    destroy(err) {
        this._destroy(err, true);
    }

    _destroy(err, local) {
        if (this.destroyed) {
            return;
        }
        this.destroyed = true;
        if (err && (!local || adone.event.EventEmitter.listenerCount(this, "error"))) {
            this.emit("error", err);
        }
        this.emit("close");
        if (local && this._opened) {
            if (this._lazy && this.initiator) {
                this._open();
            }
            try {
                this._multiplex._send(this.channel << 3 | (this.initiator ? 6 : 5), err ? Buffer.from(err.message) : null);
            } catch (e) {
                //
            }
        }
        this._finalize();
    }

    _finalize() {
        if (this.finalized) {
            return;
        }
        this.finalized = true;
        this.emit("finalize");
    }

    _write(data, enc, cb) {
        if (!this._opened) {
            this.once("open", this._write.bind(this, data, enc, cb));
            return;
        }
        if (this.destroyed) {
            return cb();
        }

        if (this._lazy && this.initiator) {
            this._open();
        }

        const drained = this._multiplex._send(this._dataHeader, data);
        if (drained) {
            cb();
        } else {
            this._multiplex._ondrain.push(cb);
        }
    }

    _read() {
        if (this._awaitDrain) {
            const drained = this._awaitDrain;
            this._awaitDrain = 0;
            this._multiplex._onchanneldrain(drained);
        }
    }

    _open() {
        let buf = null;
        if (is.buffer(this.name)) {
            buf = this.name;
        } else if (this.name !== this.channel.toString()) {
            buf = Buffer.from(this.name);
        }
        this._lazy = false;
        this._multiplex._send(this.channel << 3 | 0, buf);
    }

    open(channel, initiator) {
        this.channel = channel;
        this.initiator = initiator;
        this._dataHeader = channel << 3 | (initiator ? 2 : 1);
        this._opened = true;
        if (!this._lazy && this.initiator) {
            this._open();
        }
        this.emit("open");
    }
}

export default class Multiplex extends adone.std.stream.Duplex {
    constructor(opts, onchannel) {
        super();

        if (is.function(opts)) {
            onchannel = opts;
            opts = null;
        }
        if (!opts) {
            opts = {};
        }
        if (onchannel) {
            this.on("stream", onchannel);
        }

        this.destroyed = false;
        this.limit = opts.limit || 0;

        this._corked = 0;
        this._options = opts;
        this._binaryName = Boolean(opts.binaryName);
        this._local = [];
        this._remote = [];
        this._list = this._local;
        this._receiving = null;
        this._chunked = false;
        this._state = 0;
        this._type = 0;
        this._channel = 0;
        this._missing = 0;
        this._message = null;
        this._buf = Buffer.alloc(this.limit ? varint.encodingLength(this.limit) : 100);
        this._ptr = 0;
        this._awaitChannelDrains = 0;
        this._onwritedrain = null;
        this._ondrain = [];
        this._finished = false;

        this.on("finish", this._clear);
    }

    createStream(name, opts) {
        if (this.destroyed) {
            throw new Error("Multiplexer is destroyed");
        }
        let id = this._local.indexOf(null);
        if (id === -1) {
            id = this._local.push(null) - 1;
        }
        const channel = new Channel(this._name(name || id.toString()), this, Object.assign({}, this._options, opts));
        return this._addChannel(channel, id, this._local);
    }

    receiveStream(name, opts) {
        if (this.destroyed) {
            throw new Error("Multiplexer is destroyed");
        }
        if (is.nil(name)) {
            throw new Error("Name is needed when receiving a stream");
        }
        const channel = new Channel(this._name(name), this, Object.assign({}, this._options, opts));
        if (!this._receiving) {
            this._receiving = {};
        }
        if (this._receiving[channel.name]) {
            throw new Error("You are already receiving this stream");
        }
        this._receiving[channel.name] = channel;
        return channel;
    }

    createSharedStream(name, opts) {
        return new adone.stream.Duplexify(this.createStream(name, Object.assign({}, opts, { lazy: true })), this.receiveStream(name, opts));
    }

    _name(name) {
        if (!this._binaryName) {
            return name.toString();
        }
        return is.buffer(name) ? name : Buffer.from(name);
    }

    _send(header, data) {
        const len = data ? data.length : 0;
        const oldUsed = used;
        let drained = true;

        varint.encode(header, pool, used);
        used += varint.encode.bytes;
        varint.encode(len, pool, used);
        used += varint.encode.bytes;

        drained = this.push(pool.slice(oldUsed, used));

        if (pool.length - used < 100) {
            pool = Buffer.alloc(10 * 1024);
            used = 0;
        }

        if (data) {
            drained = this.push(data);
        }
        return drained;
    }

    _addChannel(channel, id, list) {
        while (list.length <= id) {
            list.push(null);
        }
        list[id] = channel;
        channel.on("finalize", () => {
            list[id] = null;
        });

        channel.open(id, list === this._local);

        return channel;
    }

    _writeVarint(data, offset) {
        for (offset; offset < data.length; offset++) {
            if (this._ptr === this._buf.length) {
                return this._lengthError(data);
            }
            this._buf[this._ptr++] = data[offset];
            if (!(data[offset] & 0x80)) {
                if (this._state === 0) {
                    const header = varint.decode(this._buf);
                    this._type = header & 7;
                    this._channel = header >> 3;
                    this._list = this._type & 1 ? this._local : this._remote;
                    const chunked = this._list.length > this._channel && this._list[this._channel] && this._list[this._channel].chunked;
                    this._chunked = Boolean(this._type === 1 || this._type === 2) && chunked;
                } else {
                    this._missing = varint.decode(this._buf);
                    if (this.limit && this._missing > this.limit) {
                        return this._lengthError(data);
                    }
                }
                this._state++;
                this._ptr = 0;
                return offset + 1;
            }
        }
        return data.length;
    }

    _lengthError(data) {
        this.destroy(new Error("Incoming message is too big"));
        return data.length;
    }

    _writeMessage(data, offset) {
        const free = data.length - offset;
        const missing = this._missing;

        if (!this._message) {
            if (missing <= free) { // fast track - no copy
                this._missing = 0;
                this._push(data.slice(offset, offset + missing));
                return offset + missing;
            }
            if (this._chunked) {
                this._missing -= free;
                this._push(data.slice(offset, data.length));
                return data.length;
            }
            this._message = Buffer.alloc(missing);
        }

        data.copy(this._message, this._ptr, offset, offset + missing);

        if (missing <= free) {
            this._missing = 0;
            this._push(this._message);
            return offset + missing;
        }

        this._missing -= free;
        this._ptr += free;

        return data.length;
    }

    _push(data) {
        if (!this._missing) {
            this._ptr = 0;
            this._state = 0;
            this._message = null;
        }

        if (this._type === 0) { // open
            if (this.destroyed || this._finished) {
                return;
            }

            const name = this._binaryName ? data : (data.toString() || this._channel.toString());
            let channel;

            if (this._receiving && this._receiving[name]) {
                channel = this._receiving[name];
                delete this._receiving[name];
                this._addChannel(channel, this._channel, this._list);
            } else {
                channel = new Channel(name, this, this._options);
                this.emit("stream", this._addChannel(channel, this._channel, this._list), channel.name);
            }
            return;
        }

        const stream = this._list[this._channel];
        if (!stream) {
            return;
        }

        switch (this._type) {
            case 5: // local error
            case 6: // remote error
                stream._destroy(new Error(data.toString() || "Channel destroyed"), false);
                return;

            case 3: // local end
            case 4: // remote end
                stream.push(null);
                return;

            case 1: // local packet
            case 2: // remote packet
                if (!stream.push(data)) {
                    this._awaitChannelDrains++;
                    stream._awaitDrain++;
                }

        }
    }

    _onchanneldrain(drained) {
        this._awaitChannelDrains -= drained;
        if (this._awaitChannelDrains) {
            return;
        }
        const ondrain = this._onwritedrain;
        this._onwritedrain = null;
        if (ondrain) {
            ondrain();
        }
    }

    _write(data, enc, cb) {
        if (this._finished) {
            return cb();
        }
        if (this._corked) {
            return this._onuncork(this._write.bind(this, data, enc, cb));
        }
        if (data === SIGNAL_FLUSH) {
            return this._finish(cb);
        }

        let offset = 0;

        while (offset < data.length) {
            if (this._state === 2) {
                offset = this._writeMessage(data, offset);
            } else {
                offset = this._writeVarint(data, offset);
            }
        }
        if (this._state === 2 && !this._missing) {
            this._push(empty);
        }

        if (this._awaitChannelDrains) {
            this._onwritedrain = cb;
        } else {
            cb();
        }
    }

    _finish(cb) {
        const self = this;
        this._onuncork(() => {
            if (self._writableState.prefinished === false) {
                self._writableState.prefinished = true;
            }
            self.emit("prefinish");
            self._onuncork(cb);
        });
    }

    cork() {
        if (++this._corked === 1) {
            this.emit("cork");
        }
    }

    uncork() {
        if (this._corked && --this._corked === 0) {
            this.emit("uncork");
        }
    }

    end(data, enc, cb) {
        if (is.function(data)) {
            return this.end(null, null, data);
        }
        if (is.function(enc)) {
            return this.end(data, null, enc);
        }
        if (data) {
            this.write(data);
        }
        if (!this._writableState.ending) {
            this.write(SIGNAL_FLUSH);
        }
        return super.end(cb);
    }

    _onuncork(fn) {
        if (this._corked) {
            this.once("uncork", fn);
        } else {
            fn();
        }
    }

    _read() {
        while (this._ondrain.length) {
            this._ondrain.shift()();
        }
    }

    _clear() {
        if (this._finished) {
            return;
        }
        this._finished = true;

        const list = this._local.concat(this._remote);

        this._local = [];
        this._remote = [];

        list.forEach((stream) => {
            if (stream) {
                stream._destroy(null, false);
            }
        });

        this.push(null);
    }

    finalize() {
        this._clear();
    }

    destroy(err) {
        if (this.destroyed) {
            return;
        }
        this.destroyed = true;
        this._clear();
        if (err) {
            this.emit("error", err);
        }
        this.emit("close");
    }
}
