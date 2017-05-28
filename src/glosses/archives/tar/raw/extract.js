import * as headers from "./headers";
const { std: { stream: { Writable, PassThrough } } } = adone;

const overflow = (size) => {
    size &= 511;
    return size && 512 - size;
};

const mixinPax = (header, pax) => {
    if (pax.path) {
        header.name = pax.path;
    }
    if (pax.linkpath) {
        header.linkname = pax.linkpath;
    }
    header.pax = pax;
    return header;
};

class Source extends PassThrough {
    constructor(parent, offset) {
        super();
        this._parent = parent;
        this.offset = offset;
    }

    destroy(err) {
        this._parent.destroy(err);
    }
}

const emptyStream = (self, offset) => {
    const s = new Source(self, offset);
    s.end();
    return s;
};

export default class RawExtractStream extends Writable {
    constructor(opts) {
        super(opts);

        this._offset = 0;
        this._buffer = new adone.collection.BufferList();
        this._missing = 0;
        this._onparse = adone.noop;
        this._header = null;
        this._stream = null;
        this._overflow = null;
        this._cb = null;
        this._locked = false;
        this._destroyed = false;
        this._pax = null;
        this._paxGlobal = null;
        this._gnuLongPath = null;
        this._gnuLongLinkPath = null;

        const self = this;
        const b = self._buffer;

        const oncontinue = function () {
            self._continue();
        };

        const onunlock = function (err) {
            self._locked = false;
            if (err) {
                return self.destroy(err);
            }
            if (!self._stream) {
                oncontinue();
            }
        };

        const ondrain = function () {
            self._buffer.consume(overflow(self._header.size));
            self._parse(512, onheader);  // eslint-disable-line no-use-before-define
            oncontinue();
        };

        const onstreamend = function () {
            self._stream = null;
            const drain = overflow(self._header.size);
            if (drain) {
                self._parse(drain, ondrain);
            } else {
                self._parse(512, onheader);  // eslint-disable-line no-use-before-define
            }
            if (!self._locked) {
                oncontinue();
            }
        };

        const onpaxglobalheader = function () {
            const size = self._header.size;
            self._paxGlobal = headers.decodePax(b.slice(0, size));
            b.consume(size);
            onstreamend();
        };

        const onpaxheader = function () {
            const size = self._header.size;
            self._pax = headers.decodePax(b.slice(0, size));
            if (self._paxGlobal) {
                self._pax = adone.o(self._paxGlobal, self._pax);
            }
            b.consume(size);
            onstreamend();
        };

        const ongnulongpath = function () {
            const size = self._header.size;
            this._gnuLongPath = headers.decodeLongPath(b.slice(0, size));
            b.consume(size);
            onstreamend();
        };

        const ongnulonglinkpath = function () {
            const size = self._header.size;
            this._gnuLongLinkPath = headers.decodeLongPath(b.slice(0, size));
            b.consume(size);
            onstreamend();
        };

        const onheader = function () {
            const offset = self._offset;
            let header;
            try {
                header = self._header = headers.decode(b.slice(0, 512));
            } catch (err) {
                self.emit("error", err);
            }
            b.consume(512);

            if (!header) {
                self._parse(512, onheader);
                oncontinue();
                return;
            }
            if (header.type === "gnu-long-path") {
                self._parse(header.size, ongnulongpath);
                oncontinue();
                return;
            }
            if (header.type === "gnu-long-link-path") {
                self._parse(header.size, ongnulonglinkpath);
                oncontinue();
                return;
            }
            if (header.type === "pax-global-header") {
                self._parse(header.size, onpaxglobalheader);
                oncontinue();
                return;
            }
            if (header.type === "pax-header") {
                self._parse(header.size, onpaxheader);
                oncontinue();
                return;
            }

            if (self._gnuLongPath) {
                header.name = self._gnuLongPath;
                self._gnuLongPath = null;
            }

            if (self._gnuLongLinkPath) {
                header.linkname = self._gnuLongLinkPath;
                self._gnuLongLinkPath = null;
            }

            if (self._pax) {
                self._header = header = mixinPax(header, self._pax);
                self._pax = null;
            }

            self._locked = true;

            if (!header.size || header.type === "directory") {
                self._parse(512, onheader);
                self.emit("entry", header, emptyStream(self, offset), onunlock);
                return;
            }

            self._stream = new Source(self, offset);

            self.emit("entry", header, self._stream, onunlock);
            self._parse(header.size, onstreamend);
            oncontinue();
        };

        this._parse(512, onheader);
    }

    destroy(err) {
        if (this._destroyed) {
            return;
        }
        this._destroyed = true;

        if (err) {
            this.emit("error", err);
        }
        this.emit("close");
        if (this._stream) {
            this._stream.emit("close");
        }
    }

    _parse(size, onparse) {
        if (this._destroyed) {
            return;
        }
        this._offset += size;
        this._missing = size;
        this._onparse = onparse;
    }

    _continue() {
        if (this._destroyed) {
            return;
        }
        const cb = this._cb;
        this._cb = adone.noop;
        if (this._overflow) {
            this._write(this._overflow, undefined, cb);
        } else {
            cb();
        }
    }

    _write(data, enc, cb) {
        if (this._destroyed) {
            return;
        }

        const s = this._stream;
        const b = this._buffer;
        const missing = this._missing;

        // we do not reach end-of-chunk now. just forward it

        if (data.length < missing) {
            this._missing -= data.length;
            this._overflow = null;
            if (s) {
                return s.write(data, cb);
            }
            b.append(data);
            return cb();
        }

        // end-of-chunk. the parser should call cb.

        this._cb = cb;
        this._missing = 0;

        let overflow = null;
        if (data.length > missing) {
            overflow = data.slice(missing);
            data = data.slice(0, missing);
        }

        if (s) {
            s.end(data);
        } else {
            b.append(data);
        }

        this._overflow = overflow;
        this._onparse();
    }
}
