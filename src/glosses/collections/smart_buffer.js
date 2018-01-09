// ByteArray is weird..

export default class SB {
    constructor() {
        this.buf = Buffer.allocUnsafe(64);
        this._ro = 0;
        this._wo = 0;
    }

    get read() {
        return this._ro;
    }

    get length() {
        return this._wo - this._ro;
    }

    _ensureCapacity(b) {
        if (this._wo + b > this.buf.length) {
            const newcap = Math.max(this.buf.length * 2, this._wo + b);
            this.buf = Buffer.concat([this.buf, Buffer.allocUnsafe(newcap - this.buf.length)]);
        }
    }

    _checkReadBounds(b) {
        if (this.length < b) {
            throw new adone.x.IllegalState("reading out of bounds");
        }
    }

    writeUInt32LE(val) {
        this._ensureCapacity(4);
        this.buf.writeUInt32LE(val, this._wo);
        this._wo += 4;
    }

    writeUInt32BE(val) {
        this._ensureCapacity(4);
        this.buf.writeUInt32BE(val, this._wo);
        this._wo += 4;
    }

    readUInt32LE() {
        this._checkReadBounds(4);
        const val = this.buf.readUInt32LE(this._ro);
        this._ro += 4;
        return val;
    }

    readUInt32BE() {
        this._checkReadBounds(4);
        const val = this.buf.readUInt32BE(this._ro);
        this._ro += 4;
        return val;
    }

    writeBuffer(buf) {
        this._ensureCapacity(buf.length);
        buf.copy(this.buf, this._wo);
        this._wo += buf.length;
    }

    compact() {
        this.buf = this.buf.slice(this._ro);
        this._ro = 0;
        this._wo = 0;
    }

    toBuffer() {
        return this.buf.slice(this._ro, this._wo);
    }
}
