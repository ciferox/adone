const {
    event,
    data: { varint },
    is,
    stream: { Duplexify }
} = adone;

class Channel extends adone.std.stream.Duplex {
    constructor(name/* : Buffer | string */, plex/* : Multiplex */, opts/* : ChannelOpts = {} */) {
        const halfOpen = Boolean(opts.halfOpen);
        super({
            allowHalfOpen: halfOpen
        });

        this.name = name;
        this.channel = 0;
        this.initiator = false;
        this.chunked = Boolean(opts.chunked);
        this.halfOpen = halfOpen;
        this.destroyed = false;
        this.finalized = false;

        this._multiplex = plex;
        this._dataHeader = 0;
        this._opened = false;
        this._awaitDrain = 0;
        this._lazy = Boolean(opts.lazy);

        let finished = false;
        let ended = false;

        this.once("end", () => {
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
                return this.once("open", onfinish);
            }

            if (this._lazy && this.initiator) {
                this._open();
            }

            this._multiplex._send(
                this.channel << 3 | (this.initiator ? 4 : 3),
                null
            );

            finished = true;

            if (ended) {
                this._finalize();
            }
        });
    }

    destroy(err/* : Error */) {
        this._destroy(err, true);
    }

    _destroy(err/* : Error */, local/* : bool */) {
        if (this.destroyed) {
            return;
        }

        this.destroyed = true;

        const hasErrorListeners = event.Emitter.listenerCount(this, "error") > 0;

        if (err && (!local || hasErrorListeners)) {
            this.emit("error", err);
        }

        this.emit("close");

        if (local && this._opened) {
            if (this._lazy && this.initiator) {
                this._open();
            }

            const msg = err ? Buffer.from(err.message) : null;
            try {
                this._multiplex._send(
                    this.channel << 3 | (this.initiator ? 6 : 5),
                    msg
                );
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

    _write(data/* : Buffer */, enc/* : string */, cb/* : () => void */) {
        if (!this._opened) {
            this.once("open", () => {
                this._write(data, enc, cb);
            });
            return;
        }

        if (this.destroyed) {
            cb();
            return;
        }

        if (this._lazy && this.initiator) {
            this._open();
        }

        const drained = this._multiplex._send(
            this._dataHeader,
            data
        );

        if (drained) {
            cb();
            return;
        }

        this._multiplex._ondrain.push(cb);
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

    open(channel/* : number */, initiator/* : bool */) {
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

const SIGNAL_FLUSH = Buffer.from([0]);

const empty = Buffer.allocUnsafe(0);
let pool = Buffer.alloc(10 * 1024);
let used = 0;

/* ::
type MultiplexOpts = {
  binaryName?: bool,
  limit?: number,
  initiator?: bool
}

type ChannelCallback = (Channel) => void
*/

export default class Multiplex extends adone.std.stream.Duplex {
    constructor(opts/* :: ?: MultiplexOpts | ChannelCallback */, onchannel /* :: ?: ChannelCallback */) {
        super();
        if (is.function(opts)) {
            onchannel = opts;
            opts = {};
        }

        if (!opts) {
            opts = {};
        }

        if (onchannel) {
            this.on("stream", onchannel);
        }

        this.destroyed = false;
        this.limit = opts.limit || 0;
        if (is.nil(opts.initiator)) {
            opts.initiator = true;
        }

        this.initiator = opts.initiator;

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

        let bufSize = 100;
        if (this.limit) {
            bufSize = varint.encodingLength(this.limit);
        }
        this._buf = Buffer.alloc(bufSize);
        this._ptr = 0;
        this._awaitChannelDrains = 0;
        this._onwritedrain = null;
        this._ondrain = [];
        this._finished = false;

        this.once("finish", this._clear);

        // setup id handling
        this._nextId = this.initiator ? 0 : 1;
    }

    // Generate the next stream id
    _nextStreamId()/* : number */ {
        const id = this._nextId;
        this._nextId += 2;
        return id;
    }

    createStream(name/* : Buffer | string */, opts/* : ChannelOpts */)/* : Channel */ {
        if (this.destroyed) {
            throw new Error("Multiplexer is destroyed");
        }
        const id = this._nextStreamId();
        const channelName = this._name(name || id.toString());
        const options = Object.assign(this._options, opts);

        const channel = new Channel(channelName, this, options);
        return this._addChannel(channel, id, this._local);
    }

    receiveStream(name/* : Buffer | string */, opts/* : ChannelOpts */)/* : Channel */ {
        if (this.destroyed) {
            throw new Error("Multiplexer is destroyed");
        }

        if (is.nil(name)) {
            throw new Error("Name is needed when receiving a stream");
        }

        const channelName = this._name(name);
        const channel = new Channel(
            channelName,
            this,
            Object.assign(this._options, opts)
        );

        if (!this._receiving) {
            this._receiving = {};
        }

        if (this._receiving[channel.name]) {
            throw new Error("You are already receiving this stream");
        }

        this._receiving[channel.name] = channel;

        return channel;
    }

    createSharedStream(name/* : Buffer | string */, opts/* : ChannelOpts */)/* : stream.Duplex */ {
        return new Duplexify(this.createStream(name, Object.assign(opts, { lazy: true })), this.receiveStream(name, opts));
    }

    _name(name/* : Buffer | string */)/* : Buffer | string */ {
        if (!this._binaryName) {
            return name.toString();
        }
        return is.buffer(name) ? name : Buffer.from(name);
    }

    _send(header/* : number */, data /* :: ?: Buffer */)/* : bool */ {
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

    _addChannel(channel/* : Channel */, id/* : number */, list/* : Array<Channel|null> */)/* : Channel */ {
        list[id] = channel;
        channel.on("finalize", () => {
            list[id] = null;
        });
        channel.open(id, list === this._local);

        return channel;
    }

    _writeVarint(data/* : Buffer */, offset/* : number */)/* : number */ {
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
                    const chunked = this._list.length > this._channel &&
                        this._list[this._channel] &&
                        this._list[this._channel].chunked;

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

    _lengthError(data/* : Buffer */)/* : number */ {
        this.destroy(new Error("Incoming message is too big"));
        return data.length;
    }

    _writeMessage(data/* : Buffer */, offset/* : number */)/* : number */ {
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

    _push(data/* : Buffer */) {
        if (!this._missing) {
            this._ptr = 0;
            this._state = 0;
            this._message = null;
        }

        if (this._type === 0) { // open
            if (this.destroyed || this._finished) {
                return;
            }

            let name;
            if (this._binaryName) {
                name = data;
            } else {
                name = data.toString() || this._channel.toString();
            }
            let channel;
            if (this._receiving && this._receiving[name]) {
                channel = this._receiving[name];
                delete this._receiving[name];
                this._addChannel(channel, this._channel, this._list);
            } else {
                channel = new Channel(name, this, this._options);
                this.emit("stream", this._addChannel(
                    channel,
                    this._channel,
                    this._list), channel.name);
            }
            return;
        }

        const stream = this._list[this._channel];
        if (!stream) {
            return;
        }

        switch (this._type) {
            case 5: // local error
            case 6: { // remote error
                const error = new Error(data.toString() || "Channel destroyed");
                stream._destroy(error, false);
                return;
            }
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

    _onchanneldrain(drained/* : number */) {
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

    _write(data/* : Buffer */, enc/* : string */, cb/* : () => void */) {
        if (this._finished) {
            cb();
            return;
        }

        if (this._corked) {
            this._onuncork(this._write.bind(this, data, enc, cb));
            return;
        }

        if (data === SIGNAL_FLUSH) {
            this._finish(cb);
            return;
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

    _finish(cb/* : () => void */) {
        this._onuncork(() => {
            if (this._writableState.prefinished === false) {
                this._writableState.prefinished = true;
            }
            this.emit("prefinish");
            this._onuncork(cb);
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

    end(data/* :: ?: Buffer | () => void */, enc/* :: ?: string | () => void */, cb/* :: ?: () => void */) {
        if (is.function(data)) {
            cb = data;
            data = undefined;
        }
        if (is.function(enc)) {
            cb = enc;
            enc = undefined;
        }

        if (data) {
            this.write(data);
        }

        if (!this._writableState.ending) {
            this.write(SIGNAL_FLUSH);
        }

        return adone.std.stream.Writable.prototype.end.call(this, cb);
    }

    _onuncork(fn/* : () => void */) {
        if (this._corked) {
            this.once("uncork", fn);
            return;
        }

        fn();
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

    destroy(err/* :: ?: Error */) {
        if (this.destroyed) {
            return;
        }

        const list = this._local.concat(this._remote);

        this.destroyed = true;

        if (err) {
            this.emit("error", err);
        }
        this.emit("close");

        list.forEach((stream) => {
            if (stream) {
                stream.emit("error", err || new Error("underlying socket has been closed"));
            }
        });

        this._clear();
    }
}
