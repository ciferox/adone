
const { is } = adone;

const TOLERANCE = 0.1;

export default class Encoder {
    constructor(encodingTypes, forceFloat64) {
        this.encodingTypes = encodingTypes;
        this.forceFloat64 = forceFloat64;
    }

    encode(x, buf) {
        buf = buf || new adone.ExBuffer();
        this._encode(x, buf);
        return buf;
    }

    _encode(x, buf) {
        let len;

        if (is.undefined(x)) {
            buf.writeInt8(0xd4);
            buf.writeInt8(0x00); // fixext special type/value
            buf.writeInt8(0x00);
        } else if (is.null(x)) {
            buf.writeInt8(0xC0);
        } else if (x === true) {
            buf.writeInt8(0xC3);
        } else if (x === false) {
            buf.writeInt8(0xC2);
        } else if (is.string(x)) {
            len = Buffer.byteLength(x);
            if (len < 32) {
                buf.writeInt8(0xA0 | len);
                if (len > 0) {
                    buf.write(x);
                }
            } else if (len <= 0xFF) {
                buf.write([0xD9, len]);
                buf.write(x);
            } else if (len <= 0xFFFF) {
                buf.writeInt8(0xDA);
                buf.writeUInt16BE(len);
                buf.write(x);
            } else {
                buf.writeInt8(0xDB);
                buf.writeUInt32BE(len);
                buf.write(x);
            }
        } else if (is.buffer(x)) {
            if (x.length <= 0xFF) {
                buf.write([0xC4, x.length]);
            } else if (x.length <= 0xFFFF) {
                buf.writeInt8(0xC5);
                buf.writeUInt16BE(x.length);
            } else {
                buf.writeUInt8(0xC6);
                buf.writeUInt32BE(x.length);
            }
            buf.write(x);
        } else if (is.array(x)) {
            if (x.length < 16) {
                buf.writeInt8(0x90 | x.length);
            } else if (x.length < 65536) {
                buf.writeInt8(0xDC);
                buf.writeUInt16BE(x.length);
            } else {
                buf.writeInt8(0xDD);
                buf.writeUInt32BE(x.length);
            }
            x.forEach((obj) => {
                this._encode(obj, buf);
            });
        } else if (is.object(x)) {
            if (!this._encodeExt(x, buf)) {
                const keys = [];

                for (const key in x) {
                    if (is.propertyOwned(x, key) && !is.undefined(x[key]) && !is.function(x[key])) {
                        keys.push(key);
                    }
                }

                if (keys.length < 16) {
                    buf.writeInt8(0x80 | keys.length);
                } else {
                    buf.writeInt8(0xDE);
                    buf.writeUInt16BE(keys.length);
                }

                keys.forEach((key) => {
                    this._encode(key, buf);
                    this._encode(x[key], buf);
                });
            }
        } else if (is.number(x)) {
            if (is.float(x)) {
                this._encodeFloat(x, buf, this.forceFloat64);
            } else if (x >= 0) {
                if (x < 128) {
                    buf.writeInt8(x);
                } else if (x < 256) {
                    buf.writeInt8(0xCC);
                    buf.writeInt8(x);
                } else if (x < 65536) {
                    buf.writeInt8(0xCD);
                    buf.writeUInt16BE(x);
                } else if (x <= 0xFFFFFFFF) {
                    buf.writeInt8(0xCE);
                    buf.writeUInt32BE(x);
                } else if (x <= 9007199254740991) {
                    buf.writeInt8(0xCF);
                    buf.writeUInt64BE(x);
                } else {
                    this._encodeFloat(x, buf, true);
                }
            } else {
                if (x >= -32) {
                    buf.writeInt8(0x100 + x);
                } else if (x >= -128) {
                    buf.writeInt8(0xD0);
                    buf.writeInt8(x);
                } else if (x >= -32768) {
                    buf.writeInt8(0xD1);
                    buf.writeInt16BE(x);
                } else if (x > -214748365) {
                    buf.writeInt8(0xD2);
                    buf.writeInt32BE(x);
                } else if (x >= -9007199254740991) {
                    buf.writeInt8(0xD3);
                    buf.writeInt64BE(x);
                } else {
                    this._encodeFloat(x, buf, true);
                }
            }
        } else {
            throw new Error("not implemented yet");
        }
    }

    _encodeFloat(obj, buf, forceFloat64) {
        const tmpBuf = new adone.ExBuffer();
        tmpBuf.writeFloatBE(obj).flip();
        if (forceFloat64 || Math.abs(obj - tmpBuf.readFloatBE()) > TOLERANCE) { // FIXME is there a way to check if a value fits in a float?
            buf.writeInt8(0xCB);
            buf.writeDoubleBE(obj);
        } else {
            buf.writeInt8(0xCA);
            buf.writeFloatBE(obj);
        }
    }

    _encodeExt(obj, buf) {
        let extType;
        const encTypes = this.encodingTypes;
        for (let i = 0; i < encTypes.length; ++i) {
            if (encTypes[i].check(obj)) {
                extType = encTypes[i];
                break;
            }
        }

        const encoded = extType && extType.encode(obj);
        if (!encoded) {
            return null;
        }
        encoded.flip();

        const length = encoded.remaining();
        if (length === 1) {
            buf.writeUInt8(0xD4);
        } else if (length === 2) {
            buf.writeUInt8(0xD5);
        } else if (length === 4) {
            buf.writeUInt8(0xD6);
        } else if (length === 8) {
            buf.writeUInt8(0xD7);
        } else if (length === 16) {
            buf.writeUInt8(0xD8);
        } else if (length < 256) {
            buf.writeUInt8(0xC7);
            buf.writeUInt8(length);
        } else if (length < 0x10000) {
            buf.writeUInt8(0xC8);
            buf.writeUInt8(length >> 8);
            buf.writeUInt8(length & 0x00FF);
        } else {
            buf.writeUInt8(0xC9);
            buf.writeUInt8(length >> 24);
            buf.writeUInt8((length >> 16) & 0x000000FF);
            buf.writeUInt8((length >> 8) & 0x000000FF);
            buf.writeUInt8(length & 0x000000FF);
        }
        buf.writeInt8(extType.type);
        buf.write(encoded);
        return buf;
    }
}
