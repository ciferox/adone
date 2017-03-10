
import * as headers from "./headers";
const {
    std: { constants, stream: { Writable, Readable }, StringDecoder },
    is,
    x
} = adone;

const DMODE = 0o755;
const FMODE = 0o644;

const END_OF_TAR = Buffer.alloc(1024);

const overflow = (self, size) => {
    size &= 511;
    if (size) {
        self.push(END_OF_TAR.slice(0, 512 - size));
    }
};

const modeToType = (mode) => {
    switch (mode & constants.S_IFMT) {
        case constants.S_IFBLK: return "block-device";
        case constants.S_IFCHR: return "character-device";
        case constants.S_IFDIR: return "directory";
        case constants.S_IFIFO: return "fifo";
        case constants.S_IFLNK: return "symlink";
    }

    return "file";
};

class Sink extends Writable {
    constructor(to) {
        super();
        this.written = 0;
        this._to = to;
        this._destroyed = false;
    }

    _write(data, enc, cb) {
        this.written += data.length;
        if (this._to.push(data)) {
            return cb();
        }
        this._to._drain = cb;
    }

    destroy() {
        if (this._destroyed) {
            return;
        }
        this._destroyed = true;
        this.emit("close");
    }
}

class LinkSink extends Writable {
    constructor() {
        super();
        this.linkname = "";
        this._decoder = new StringDecoder("utf-8");
        this._destroyed = false;
    }

    _write(data, enc, cb) {
        this.linkname += this._decoder.write(data);
        cb();
    }

    destroy() {
        if (this._destroyed) {
            return;
        }
        this._destroyed = true;
        this.emit("close");
    }
}

class Void extends Writable {
    constructor() {
        super();
        this._destroyed = false;
    }

    _write(data, enc, cb) {
        cb(new x.IllegalState("No body allowed for this entry"));
    }

    destroy() {
        if (this._destroyed) {
            return;
        }
        this._destroyed = true;
        this.emit("close");
    }
}

export default class RawPackStream extends Readable {
    constructor(opts) {
        super(opts);
        this._drain = adone.noop;
        this._finalized = false;
        this._finalizing = false;
        this._destroyed = false;
        this._stream = null;
    }

    entry(header, buffer, callback) {
        if (this._stream) {
            throw new x.IllegalState("already piping an entry");
        }
        if (this._finalized || this._destroyed) {
            return;
        }

        if (is.function(buffer)) {
            callback = buffer;
            buffer = null;
        }

        if (!callback) {
            callback = adone.noop;
        }

        const self = this;

        if (!header.size || header.type === "symlink") {
            header.size = 0;
        }
        if (!header.type) {
            header.type = modeToType(header.mode);
        }
        if (!header.mode) {
            header.mode = header.type === "directory" ? DMODE : FMODE;
        }
        if (!header.uid) {
            header.uid = 0;
        }
        if (!header.gid) {
            header.gid = 0;
        }
        if (!header.mtime) {
            header.mtime = new Date();
        }

        if (is.string(buffer)) {
            buffer = Buffer.from(buffer);
        }
        if (is.buffer(buffer)) {
            header.size = buffer.length;
            this._encode(header);
            this.push(buffer);
            overflow(self, header.size);
            process.nextTick(callback);
            return new Void();
        }

        if (header.type === "symlink" && !header.linkname) {
            const linkSink = new LinkSink();
            linkSink.once("finish", () => {
                header.linkname = linkSink.linkname;
                self._encode(header);
                callback();
            }).once("error", (err) => {
                self.destroy();
                callback(err);
            });
        }

        this._encode(header);

        if (header.type !== "file" && header.type !== "contiguous-file") {
            process.nextTick(callback);
            return new Void();
        }

        const sink = new Sink(this);

        this._stream = sink;

        sink.once("finish", () => {
            self._stream = null;
            if (sink.written !== header.size) { // corrupting tar
                self.destroy();
                return callback(new x.IllegalState("size mismatch"));
            }

            overflow(self, header.size);
            if (self._finalizing) {
                self.finalize();
            }
            callback();
        }).once("error", (err) => {
            self.destroy();
            callback(err);
        });

        return sink;
    }

    finalize() {
        if (this._stream) {
            this._finalizing = true;
            return;
        }

        if (this._finalized) {
            return;
        }
        this._finalized = true;
        this.push(END_OF_TAR);
        this.push(null);
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
        if (this._stream && this._stream.destroy) {
            this._stream.destroy();
        }
    }

    _encode(header) {
        if (!header.pax) {
            const buf = headers.encode(header);
            if (buf) {
                this.push(buf);
                return;
            }
        }
        this._encodePax(header);
    }

    _encodePax(header) {
        const paxHeader = headers.encodePax({
            name: header.name,
            linkname: header.linkname,
            pax: header.pax
        });

        const newHeader = {
            name: "PaxHeader",
            mode: header.mode,
            uid: header.uid,
            gid: header.gid,
            size: paxHeader.length,
            mtime: header.mtime,
            type: "pax-header",
            linkname: header.linkname && "PaxHeader",
            uname: header.uname,
            gname: header.gname,
            devmajor: header.devmajor,
            devminor: header.devminor
        };

        this.push(headers.encode(newHeader));
        this.push(paxHeader);
        overflow(this, paxHeader.length);

        newHeader.size = header.size;
        newHeader.type = header.type;
        this.push(headers.encode(newHeader));
    }

    _read() {
        const drain = this._drain;
        this._drain = adone.noop;
        drain();
    }
}
