const { x, is, crypto } = adone;

const DEFAULT_OPTS = {
    size: 1024,
    growthFactor: 8
};

const encodeOctet = (bytes, octet) => {
    if (octet < 128) {
        bytes.push(octet);
    } else if (octet < 16384) {
        bytes.push((octet >>> 7) | 0x80);
        bytes.push(octet & 0x7F);
    } else if (octet < 2097152) {
        bytes.push((octet >>> 14) | 0x80);
        bytes.push(((octet >>> 7) | 0x80) & 0xFF);
        bytes.push(octet & 0x7F);
    } else if (octet < 268435456) {
        bytes.push((octet >>> 21) | 0x80);
        bytes.push(((octet >>> 14) | 0x80) & 0xFF);
        bytes.push(((octet >>> 7) | 0x80) & 0xFF);
        bytes.push(octet & 0x7F);
    } else {
        bytes.push(((octet >>> 28) | 0x80) & 0xFF);
        bytes.push(((octet >>> 21) | 0x80) & 0xFF);
        bytes.push(((octet >>> 14) | 0x80) & 0xFF);
        bytes.push(((octet >>> 7) | 0x80) & 0xFF);
        bytes.push(octet & 0x7F);
    }
};

export default class Writer {
    constructor(options = {}) {
        options = Object.assign({}, DEFAULT_OPTS, options);
        this._buf = Buffer.alloc(options.size || 1024);
        this._size = this._buf.length;
        this._offset = 0;
        this._options = options;

        // A list of offsets in the buffer where we need to insert sequence tag/len pairs.
        this._seq = [];
    }

    get buffer() {
        if (this._seq.length) {
            throw new x.IllegalState(`${this._seq.length} unended sequence(s)`);
        }

        return this._buf.slice(0, this._offset);
    }

    writeByte(b) {
        if (!is.number(b)) {
            throw new x.InvalidArgument("argument must be a Number");
        }

        this._ensure(1);
        this._buf[this._offset++] = b;
    }

    writeInt(i, tag = crypto.asn1.type.Integer) {
        if (!is.number(i)) {
            throw new x.InvalidArgument("argument must be a Number");
        }

        let sz = 4;

        while (
            sz > 1 &&
            (((i & 0xff800000) === 0) || ((i & 0xff800000) === 0xff800000 >> 0))
        ) {
            --sz;
            i <<= 8;
        }

        this._ensure(2 + sz);
        this._buf[this._offset++] = tag;
        this._buf[this._offset++] = sz;

        while (sz-- > 0) {
            this._buf[this._offset++] = ((i & 0xff000000) >>> 24);
            i <<= 8;
        }
    }

    writeNull() {
        this.writeByte(crypto.asn1.type.Null);
        this.writeByte(0x00);
    }

    writeEnumeration(i, tag = crypto.asn1.type.Enumeration) {
        if (!is.number(i)) {
            throw new x.InvalidArgument("argument must be a Number");
        }
        return this.writeInt(i, tag);
    }

    writeBoolean(b, tag = crypto.asn1.type.Boolean) {
        if (!is.boolean(b)) {
            throw new x.InvalidArgument("argument must be a Boolean");
        }
        this._ensure(3);
        this._buf[this._offset++] = tag;
        this._buf[this._offset++] = 0x01;
        this._buf[this._offset++] = b ? 0xff : 0x00;
    }

    writeString(s, tag = crypto.asn1.type.OctetString) {
        if (!is.string(s)) {
            throw new x.InvalidArgument("argument must be a string");
        }

        const len = Buffer.byteLength(s);
        this.writeByte(tag);
        this.writeLength(len);
        if (len) {
            this._ensure(len);
            this._buf.write(s, this._offset);
            this._offset += len;
        }
    }

    writeBuffer(buf, tag) {
        if (!is.number(tag)) {
            throw new x.InvalidArgument("tag must be a number");
        }
        if (!is.buffer(buf)) {
            throw new x.InvalidArgument("argument must be a buffer");
        }

        this.writeByte(tag);
        this.writeLength(buf.length);
        this._ensure(buf.length);
        buf.copy(this._buf, this._offset, 0, buf.length);
        this._offset += buf.length;
    }

    writeStringArray(strings) {
        if (!is.array(strings)) {
            throw new x.InvalidArgument("argument must be an array of strings");
        }

        for (const s of strings) {
            this.writeString(s);
        }
    }

    // This is really to solve DER cases, but whatever for now
    writeOID(s, tag = crypto.asn1.type.OID) {
        if (!is.string(s)) {
            throw new x.InvalidArgument("argument must be a string");
        }
        if (!/^([0-9]+\.){3,}[0-9]+$/.test(s)) {
            throw new x.InvalidArgument("argument is not a valid OID string");
        }

        const tmp = s.split(".");
        const bytes = [];
        bytes.push(parseInt(tmp[0], 10) * 40 + parseInt(tmp[1], 10));
        for (const b of tmp.slice(2)) {
            encodeOctet(bytes, parseInt(b, 10));
        }

        this._ensure(2 + bytes.length);
        this.writeByte(tag);
        this.writeLength(bytes.length);
        for (const b of bytes) {
            this.writeByte(b);
        }
    }

    writeLength(len) {
        if (!is.number(len)) {
            throw new x.InvalidArgument("argument must be a Number");
        }

        this._ensure(4);

        if (len <= 0x7f) {
            this._buf[this._offset++] = len;
        } else if (len <= 0xff) {
            this._buf[this._offset++] = 0x81;
            this._buf[this._offset++] = len;
        } else if (len <= 0xffff) {
            this._buf[this._offset++] = 0x82;
            this._buf[this._offset++] = len >> 8;
            this._buf[this._offset++] = len;
        } else if (len <= 0xffffff) {
            this._buf[this._offset++] = 0x83;
            this._buf[this._offset++] = len >> 16;
            this._buf[this._offset++] = len >> 8;
            this._buf[this._offset++] = len;
        } else {
            throw new x.IllegalState("Length too long (> 4 bytes)");
        }
    }

    startSequence(tag = crypto.asn1.type.Sequence | crypto.asn1.type.Constructor) {
        this.writeByte(tag);
        this._seq.push(this._offset);
        this._ensure(3);
        this._offset += 3;
    }

    endSequence() {
        const seq = this._seq.pop();
        const start = seq + 3;
        const len = this._offset - start;

        if (len <= 0x7f) {
            this._shift(start, len, -2);
            this._buf[seq] = len;
        } else if (len <= 0xff) {
            this._shift(start, len, -1);
            this._buf[seq] = 0x81;
            this._buf[seq + 1] = len;
        } else if (len <= 0xffff) {
            this._buf[seq] = 0x82;
            this._buf[seq + 1] = len >> 8;
            this._buf[seq + 2] = len;
        } else if (len <= 0xffffff) {
            this._shift(start, len, 1);
            this._buf[seq] = 0x83;
            this._buf[seq + 1] = len >> 16;
            this._buf[seq + 2] = len >> 8;
            this._buf[seq + 3] = len;
        } else {
            throw new x.IllegalState("Sequence too long");
        }
    }

    _shift(start, len, shift) {
        this._buf.copy(this._buf, start + shift, start, start + len);
        this._offset += shift;
    }

    _ensure = function (len) {
        if (this._size - this._offset < len) {
            let sz = this._size * this._options.growthFactor;
            if (sz - this._offset < len) {
                sz += len;
            }

            const buf = Buffer.alloc(sz);

            this._buf.copy(buf, 0, 0, this._offset);
            this._buf = buf;
            this._size = sz;
        }
    }
}
