const { x, is, crypto: { asn1 } } = adone;

export default class Reader {
    constructor(data) {
        if (!data || !is.buffer(data)) {
            throw new new x.InvalidArgument("data must be a buffer")();
        }

        this._buf = data;
        this._size = data.length;

        // These hold the "current" state
        this._len = 0;
        this._offset = 0;
    }

    get length() {
        return this._len;
    }

    get offset() {
        return this._offset;
    }

    get remain() {
        return this._size - this._offset;
    }

    get buffer() {
        return this._buf.slice(this._offset);
    }

    readByte(peek) {
        if (this._size - this._offset < 1) {
            return null;
        }

        const b = this._buf[this._offset] & 0xFF;

        if (!peek) {
            this._offset += 1;
        }

        return b;
    }

    peek() {
        return this.readByte(true);
    }

    readLength(offset = this._offset) {
        if (offset >= this._size) {
            return null;
        }

        let lenB = this._buf[offset++] & 0xFF;

        if (is.null(lenB)) {
            return null;
        }

        if ((lenB & 0x80) === 0x80) {
            lenB &= 0x7f;

            if (lenB === 0) {
                throw new x.IllegalState("Indefinite length not supported");
            }

            if (lenB > 4) {
                throw new x.IllegalState("encoding too long");
            }

            if (this._size - offset < lenB) {
                return null;
            }

            this._len = 0;
            for (let i = 0; i < lenB; i++) {
                this._len = (this._len << 8) + (this._buf[offset++] & 0xff);
            }
        } else {
            // Wasn't a variable length
            this._len = lenB;
        }

        return offset;
    }

    readSequence(tag) {
        const seq = this.peek();
        if (is.null(seq)) {
            return null;
        }
        if (!is.undefined(tag) && tag !== seq) {
            throw new x.IllegalState(`Expected 0x${tag.toString(16)}: got 0x${seq.toString(16)}`);
        }

        const o = this.readLength(this._offset + 1); // stored in `length`
        if (is.null(o)) {
            return null;
        }

        this._offset = o;
        return seq;
    }

    readInt() {
        return this._readTag(asn1.type.Integer);
    }

    readBoolean() {
        return this._readTag(asn1.type.Boolean) === 0 ? false : true;
    }

    readEnumeration() {
        return this._readTag(asn1.type.Enumeration);
    }

    readString(tag, retbuf) {
        if (!tag) {
            tag = asn1.type.OctetString;
        }

        const b = this.peek();
        if (is.null(b)) {
            return null;
        }

        if (b !== tag) {
            throw new x.IllegalState(`Expected 0x${tag.toString(16)}: got 0x${b.toString(16)}`);
        }

        const o = this.readLength(this._offset + 1); // stored in `length`

        if (is.null(o) === null) {
            return null;
        }

        if (this.length > this._size - o) {
            return null;
        }

        this._offset = o;

        if (this.length === 0) {
            return retbuf ? Buffer.alloc(0) : "";
        }

        const str = this._buf.slice(this._offset, this._offset + this.length);
        this._offset += this.length;

        return retbuf ? str : str.toString("utf8");
    }

    readOID(tag = asn1.type.OID) {
        const b = this.readString(tag, true);
        if (is.null(b)) {
            return null;
        }

        const values = [];
        let value = 0;

        for (let i = 0; i < b.length; i++) {
            const byte = b[i] & 0xFF;

            value <<= 7;
            value += byte & 0x7F;
            if ((byte & 0x80) === 0) {
                values.push(value);
                value = 0;
            }
        }

        value = values.shift();
        values.unshift(value % 40);
        values.unshift((value / 40) >> 0);

        return values.join(".");
    }

    _readTag(tag) {
        const b = this.peek();

        if (is.null(b)) {
            return null;
        }

        if (b !== tag) {
            throw new x.IllegalState(`Expected 0x${tag.toString(16)}: got 0x${b.toString(16)}`);
        }

        const o = this.readLength(this._offset + 1); // stored in `length`
        if (is.null(o)) {
            return null;
        }

        if (this.length > 4) {
            throw new x.IllegalState(`Integer too long: ${this.length}`);
        }

        if (this.length > this._size - o) {
            return null;
        }
        this._offset = o;

        const fb = this._buf[this._offset];
        let value = 0;

        let i;
        for (i = 0; i < this.length; i++) {
            value <<= 8;
            value |= (this._buf[this._offset++] & 0xff);
        }

        if ((fb & 0x80) === 0x80 && i !== 4) {
            value -= (1 << (i * 8));
        }

        return value >> 0;
    }
}
