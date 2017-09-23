const { is, std: { stream: { Duplex: DuplexStream } }, promise } = adone;

/**
 * Represents a Node.js Buffer list collector, reader and streamer with callback/promise interface support
 */
export default class BufferList extends DuplexStream {
    /**
     * @param {Buffer | Function} initial if a buffer given then it is appended to the list, if a callback given then
     * it will be called with all the collected data when the stream end or with an error if will occur
     *
     */
    constructor(initial) {
        super();

        this._bufs = [];

        /**
         * The length of the list in bytes.
         * This is the sum of the lengths of all of the buffers contained in the list,
         * minus any initial offset for a semi-consumed buffer at the beginning.
         * Should accurately represent the total number of bytes that can be read from the list
         */
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

    /**
     * Adds an additional buffer or BufferList to the internal list
     *
     * @returns {this}
     */
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
            // uninitialized memory allocationthen
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

    /**
     * Ends the stream
     */
    end(chunk) {
        super.end(chunk);
        this._deferred.resolve(this.slice());
    }

    /**
     * Returns the byte at the specified index
     *
     * @return {number}
     */
    get(index) {
        return this.slice(index, index + 1)[0];
    }

    /**
     * Returns a new Buffer object containing the bytes within the range specified.
     *
     * @param {number} [start] slice from
     * @param {number} [end] slice to
     */
    slice(start, end) {
        if (is.number(start) && start < 0) {
            start += this.length;
        }
        if (is.number(end) && end < 0) {
            end += this.length;
        }
        return this.copy(null, 0, start, end);
    }

    /**
     * Copies the content of the list in the dest buffer
     * starting from destStart and containing the bytes within the range specified with srcStart to srcEnd
     *
     * @param {Buffer} dst
     * @param {number} [dstStart] writes from this position
     * @param {number} [srcStart] reads bytes from this position
     * @param {number} [srcEnd]  read bytes to this position
     * @returns {Buffer}
     */
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
            dst = Buffer.alloc(len);
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

    /**
     * Returns a new BufferList object containing the bytes within the range specified.
     * No copies will be performed. All buffers in the result share memory with the original list.
     *
     * @param {number} start slice from
     * @param {number} end slice to
     * @returns {BufferList}
     */
    shallowSlice(start, end) {
        start = start || 0;
        end = end || this.length;

        if (start < 0) {
            start += this.length;
        }
        if (end < 0) {
            end += this.length;
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

    /**
     * Return a string representation of the buffer
     *
     * @param {string} encoding
     * @param {number} start
     * @param {number} end
     */
    toString(encoding, start, end) {
        return this.slice(start, end).toString(encoding);
    }

    /**
     * Shifts bytes off the start of the list
     */
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

    /**
     * Performs a shallow-copy of the list
     */
    duplicate() {
        let i = 0;
        const copy = new BufferList();

        for (; i < this._bufs.length; i++) {
            copy.append(this._bufs[i]);
        }

        return copy;
    }

    /**
     * Destroys the stream
     */
    destroy() {
        this._bufs.length = 0;
        this.length = 0;
        this.push(null);
    }
}

/**
 * All of the standard byte-reading methods of the Buffer interface are implemented
 * and will operate across internal Buffer boundaries transparently
 */
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
    readUInt8: 1
};

for (const m in methods) {
    BufferList.prototype[m] = function (offset) {
        return this.slice(offset, offset + methods[m])[m](0);
    };
}

