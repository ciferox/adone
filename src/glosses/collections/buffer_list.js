const {
    is,
    std: { stream: { Duplex: DuplexStream } },
    promise
} = adone;

export default class BufferList extends DuplexStream {
    constructor(initial) {
        super();

        this._bufs = [];
        this.length = 0;

        this._deferred = promise.defer();

        this.then = this._deferred.promise.then.bind(this._deferred.promise);
        this.reject = this._deferred.promise.catch.bind(this._deferred.promise);

        if (is.function(initial)) {
            promise.nodeify(this._deferred.promise, initial);
        } else {
            this.append(initial);
        }

        const piper = (err) => {
            this._deferred.reject(err);
        };

        this.on("pipe", function onPipe(src) {
            src.on("error", piper);
        });
        this.on("unpipe", function onUnpipe(src) {
            src.removeListener("error", piper);
        });
    }

    _offset(offset) {
        let tot = 0;
        let i = 0;
        let _t;
        if (offset === 0) {
            return [0, 0];
        }
        for (; i < this._bufs.length; i++) {
            _t = tot + this._bufs[i].length;
            if (offset < _t || i === this._bufs.length - 1) {
                return [i, offset - tot];
            }
            tot = _t;
        }
    }

    _reverseOffset(blOffset) {
        const bufferId = blOffset[0];
        let offset = blOffset[1];
        for (let i = 0; i < bufferId; i++) {
            offset += this._bufs[i].length;
        }
        return offset;
    }

    append(buf) {
        let i = 0;

        if (is.buffer(buf)) {
            this._appendBuffer(buf);
        } else if (is.array(buf)) {
            for (; i < buf.length; i++) {
                this.append(buf[i]);
            }
        } else if (buf instanceof BufferList) {
            // unwrap argument into individual BufferLists
            for (; i < buf._bufs.length; i++) {
                this.append(buf._bufs[i]);
            }
        } else if (!is.nil(buf)) {
            // coerce number arguments to strings, since Buffer(number) does
            // uninitialized memory allocation
            if (is.number(buf)) {
                buf = buf.toString();
            }

            this._appendBuffer(Buffer.from(buf));
        }

        return this;
    }

    _appendBuffer(buf) {
        this._bufs.push(buf);
        this.length += buf.length;
    }

    _write(buf, encoding, callback) {
        this._appendBuffer(buf);

        if (is.function(callback)) {
            callback();
        }
    }

    _read(size) {
        if (!this.length) {
            return this.push(null);
        }

        size = Math.min(size, this.length);
        this.push(this.slice(0, size));
        this.consume(size);
    }

    end(chunk) {
        super.end(chunk);
        this._deferred.resolve(this.slice());
    }

    get(index) {
        if (index > this.length || index < 0) {
            return undefined;
        }
        const offset = this._offset(index);
        return this._bufs[offset[0]][offset[1]];
    }

    slice(start, end) {
        if (is.number(start) && start < 0) {
            start += this.length;
        }
        if (is.number(end) && end < 0) {
            end += this.length;
        }
        return this.copy(null, 0, start, end);
    }

    copy(dst, dstStart, srcStart, srcEnd) {
        if (!is.number(srcStart) || srcStart < 0) {
            srcStart = 0;
        }
        if (!is.number(srcEnd) || srcEnd > this.length) {
            srcEnd = this.length;
        }
        if (srcStart >= this.length) {
            return dst || Buffer.alloc(0);
        }
        if (srcEnd <= 0) {
            return dst || Buffer.alloc(0);
        }

        const copy = Boolean(dst);
        const off = this._offset(srcStart);
        const len = srcEnd - srcStart;
        let bytes = len;
        let bufoff = (copy && dstStart) || 0;
        let start = off[1];
        let l;
        let i;

        // copy/slice everything
        if (srcStart === 0 && srcEnd === this.length) {
            if (!copy) { // slice, but full concat if multiple buffers
                return this._bufs.length === 1
                    ? this._bufs[0]
                    : Buffer.concat(this._bufs, this.length);
            }

            // copy, need to copy individual buffers
            for (i = 0; i < this._bufs.length; i++) {
                this._bufs[i].copy(dst, bufoff);
                bufoff += this._bufs[i].length;
            }

            return dst;
        }

        // easy, cheap case where it's a subset of one of the buffers
        if (bytes <= this._bufs[off[0]].length - start) {
            return copy
                ? this._bufs[off[0]].copy(dst, dstStart, start, start + bytes)
                : this._bufs[off[0]].slice(start, start + bytes);
        }

        if (!copy) { // a slice, we need something to copy in to
            dst = Buffer.allocUnsafe(len);
        }

        for (i = off[0]; i < this._bufs.length; i++) {
            l = this._bufs[i].length - start;

            if (bytes > l) {
                this._bufs[i].copy(dst, bufoff, start);
            } else {
                this._bufs[i].copy(dst, bufoff, start, start + bytes);
                break;
            }

            bufoff += l;
            bytes -= l;

            if (start) {
                start = 0;
            }
        }

        return dst;
    }

    shallowSlice(start, end) {
        start = start || 0;
        end = !is.number(end) ? this.length : end;

        if (start < 0) {
            start += this.length;
        }
        if (end < 0) {
            end += this.length;
        }

        if (start === end) {
            return new BufferList();
        }
        const startOffset = this._offset(start);
        const endOffset = this._offset(end);
        const buffers = this._bufs.slice(startOffset[0], endOffset[0] + 1);

        if (endOffset[1] === 0) {
            buffers.pop();
        } else {
            buffers[buffers.length - 1] = buffers[buffers.length - 1].slice(0, endOffset[1]);
        }

        if (startOffset[1] !== 0) {
            buffers[0] = buffers[0].slice(startOffset[1]);
        }

        return new BufferList(buffers);
    }

    toString(encoding, start, end) {
        return this.slice(start, end).toString(encoding);
    }

    consume(bytes) {
        while (this._bufs.length) {
            if (bytes >= this._bufs[0].length) {
                bytes -= this._bufs[0].length;
                this.length -= this._bufs[0].length;
                this._bufs.shift();
            } else {
                this._bufs[0] = this._bufs[0].slice(bytes);
                this.length -= bytes;
                break;
            }
        }
        return this;
    }

    duplicate() {
        let i = 0;
        const copy = new BufferList();

        for (; i < this._bufs.length; i++) {
            copy.append(this._bufs[i]);
        }

        return copy;
    }

    _destroy(err, cb) {
        this._bufs.length = 0;
        this.length = 0;
        cb(err);
    }

    indexOf(search, offset, encoding) {
        if (is.undefined(encoding) && is.string(offset)) {
            encoding = offset;
            offset = undefined;
        }
        if (is.function(search) || is.array(search)) {
            throw new TypeError('The "value" argument must be one of type string, Buffer, BufferList, or Uint8Array.');
        } else if (is.number(search)) {
            search = Buffer.from([search]);
        } else if (is.string(search)) {
            search = Buffer.from(search, encoding);
        } else if (search instanceof BufferList) {
            search = search.slice();
        } else if (!is.buffer(search)) {
            search = Buffer.from(search);
        }

        offset = Number(offset || 0);
        if (isNaN(offset)) {
            offset = 0;
        }

        if (offset < 0) {
            offset = this.length + offset;
        }

        if (offset < 0) {
            offset = 0;
        }

        if (search.length === 0) {
            return offset > this.length ? this.length : offset;
        }

        const blOffset = this._offset(offset);
        let blIndex = blOffset[0]; // index of which internal buffer we're working on
        let buffOffset = blOffset[1]; // offset of the internal buffer we're working on

        // scan over each buffer
        for (blIndex; blIndex < this._bufs.length; blIndex++) {
            const buff = this._bufs[blIndex];
            while (buffOffset < buff.length) {
                const availableWindow = buff.length - buffOffset;
                if (availableWindow >= search.length) {
                    const nativeSearchResult = buff.indexOf(search, buffOffset);
                    if (nativeSearchResult !== -1) {
                        return this._reverseOffset([blIndex, nativeSearchResult]);
                    }
                    buffOffset = buff.length - search.length + 1; // end of native search window
                } else {
                    const revOffset = this._reverseOffset([blIndex, buffOffset]);
                    if (this._match(revOffset, search)) {
                        return revOffset;
                    }
                    buffOffset++;
                }
            }
            buffOffset = 0;
        }
        return -1;
    }

    _match(offset, search) {
        if (this.length - offset < search.length) {
            return false;
        }
        for (let searchOffset = 0; searchOffset < search.length; searchOffset++) {
            if (this.get(offset + searchOffset) !== search[searchOffset]) {
                return false;
            }
        }
        return true;
    }
}

const methods = {
    readDoubleBE: 8,
    readDoubleLE: 8,
    readFloatBE: 4,
    readFloatLE: 4,
    readInt32BE: 4,
    readInt32LE: 4,
    readUInt32BE: 4,
    readUInt32LE: 4,
    readInt16BE: 2,
    readInt16LE: 2,
    readUInt16BE: 2,
    readUInt16LE: 2,
    readInt8: 1,
    readUInt8: 1,
    readIntBE: null,
    readIntLE: null,
    readUIntBE: null,
    readUIntLE: null
};

for (const m in methods) {
    if (is.null(methods[m])) {
        BufferList.prototype[m] = function (offset, byteLength) {
            return this.slice(offset, offset + byteLength)[m](0, byteLength);
        };
    } else {
        BufferList.prototype[m] = function (offset) {
            return this.slice(offset, offset + methods[m])[m](0);
        };
    }
}
