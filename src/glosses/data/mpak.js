const { is, ExBuffer } = adone;

// Encoder

export class Encoder {
    constructor(encodingTypes) {
        this.encodingTypes = encodingTypes;
    }

    encode(x, buf) {
        buf = buf || new ExBuffer(1024, true);
        this._encode(x, buf);
        return buf;
    }

    _encode(x, buf) {
        const type = typeof (x);
        switch (type) {
            case "undefined": {
                buf.writeUInt32BE(0xD4000000); // fixext special type/value
                buf.offset--;
                break;
            }
            case "boolean": {
                (x === true) ? buf.writeInt8(0xC3) : buf.writeInt8(0xC2);
                break;
            }
            case "string": {
                this._encodeString(x, buf);
                break;
            }
            case "number": {
                if (x !== (x | 0)) { // as double
                    buf.writeInt8(0xCB);
                    buf.writeDoubleBE(x);
                } else if (x >= 0) {
                    if (x < 128) {
                        buf.writeInt8(x);
                    } else if (x < 256) {
                        buf.writeInt16BE(0xCC00 | x);
                    } else if (x < 65536) {
                        buf.writeInt8(0xCD);
                        buf.writeUInt16BE(x);
                    } else if (x <= 0xFFFFFFFF) {
                        buf.writeInt8(0xCE);
                        buf.writeUInt32BE(x);
                    } else if (x <= 9007199254740991) {
                        buf.writeInt8(0xCF);
                        buf.writeUInt64BE(x);
                    } else { // as double
                        buf.writeInt8(0xCB);
                        buf.writeDoubleBE(x);
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
                    } else { // as double
                        buf.writeInt8(0xCB);
                        buf.writeDoubleBE(x);
                    }
                }
                break;
            }
            default: {
                if (is.null(x)) {
                    buf.writeInt8(0xC0);
                } else if (is.buffer(x)) {
                    if (x.length <= 0xFF) {
                        buf.writeInt16BE(0xC400 | x.length);
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
                    for (const obj of x) {
                        this._encode(obj, buf);
                    }
                } else if (is.plainObject(x)) {
                    const keys = Object.keys(x);

                    if (keys.length < 16) {
                        buf.writeInt8(0x80 | keys.length);
                    } else {
                        buf.writeInt8(0xDE);
                        buf.writeUInt16BE(keys.length);
                    }

                    for (const key of keys) {
                        this._encodeString(key, buf);
                        this._encode(x[key], buf);
                    }
                } else { // try extensions
                    const encTypes = this.encodingTypes;
                    for (let i = 0; i < encTypes.length; ++i) {
                        if (encTypes[i].check(x)) {
                            const extType = encTypes[i];
                            const encoded = extType.encode(x);
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
                                buf.writeUInt16BE(0xC700 | length);
                            } else if (length < 0x10000) {
                                buf.writeUInt32BE(0xC8000000 | (length << 8));
                                buf.offset -= 1;
                            } else {
                                buf.writeUInt8(0xC9);
                                buf.writeUInt32BE(length);
                            }
                            buf.writeInt8(extType.type);
                            buf.write(encoded);
                            return;
                        }
                    }
                    throw new adone.x.NotSupported(`Not supported: ${adone.util.typeOf(x)}`);
                }
            }
        }
    }

    _encodeString(x, buf) {
        const len = Buffer.byteLength(x);
        if (len < 32) {
            buf.writeInt8(0xA0 | len);
            if (len === 0) {
                return;
            }
        } else if (len <= 0xFF) {
            buf.writeUInt16BE(0xD900 | len);
        } else if (len <= 0xFFFF) {
            buf.writeInt8(0xDA);
            buf.writeUInt16BE(len);
        } else {
            buf.writeInt8(0xDB);
            buf.writeUInt32BE(len);
        }
        buf.write(x, undefined, len);
    }
}

// Decoder

const getSize = (first) => {
    switch (first) {
        case 0xc4: return 2;
        case 0xc5: return 3;
        case 0xc6: return 5;
        case 0xc7: return 3;
        case 0xc8: return 4;
        case 0xc9: return 6;
        case 0xca: return 5;
        case 0xcb: return 9;
        case 0xcc: return 2;
        case 0xcd: return 3;
        case 0xce: return 5;
        case 0xcf: return 9;
        case 0xd0: return 2;
        case 0xd1: return 3;
        case 0xd2: return 5;
        case 0xd3: return 9;
        case 0xd4: return 3;
        case 0xd5: return 4;
        case 0xd6: return 6;
        case 0xd7: return 10;
        case 0xd8: return 18;
        case 0xd9: return 2;
        case 0xda: return 3;
        case 0xdb: return 5;
        case 0xde: return 3;
        default: return -1;
    }
};

const buildDecodeResult = (value, bytesConsumed) => ({
    value,
    bytesConsumed
});

const isValidDataSize = (dataLength, bufLength, headerLength) => bufLength >= headerLength + dataLength;

export class Decoder {
    constructor(decodingTypes) {
        this._decodingTypes = decodingTypes;
    }

    decode(buf) {
        if (!is.exbuffer(buf)) {
            buf = ExBuffer.wrap(buf, undefined, true);
        }

        const result = this.tryDecode(buf);
        if (result) {
            return result.value;
        }
        throw new adone.x.IncompleteBufferError();
    }

    tryDecode(buf) {
        const bufLength = buf.remaining();
        if (bufLength <= 0) {
            return null;
        }

        const first = buf.readUInt8();
        let length;
        let result = 0;
        let type;
        const size = getSize(first);

        if (size !== -1 && bufLength < size) {
            return null;
        }

        switch (first) {
            case 0xc0:
                return buildDecodeResult(null, 1);
            case 0xc2:
                return buildDecodeResult(false, 1);
            case 0xc3:
                return buildDecodeResult(true, 1);
            case 0xcc:
                // 1-byte unsigned int
                result = buf.readUInt8();
                return buildDecodeResult(result, 2);
            case 0xcd:
                // 2-bytes BE unsigned int
                result = buf.readUInt16BE();
                return buildDecodeResult(result, 3);
            case 0xce:
                // 4-bytes BE unsigned int
                result = buf.readUInt32BE();
                return buildDecodeResult(result, 5);
            case 0xcf:
                // 8-bytes BE unsigned int
                result = buf.readUInt64BE().toNumber();
                return buildDecodeResult(result, 9);
            case 0xd0:
                // 1-byte signed int
                result = buf.readInt8();
                return buildDecodeResult(result, 2);
            case 0xd1:
                // 2-bytes signed int
                result = buf.readInt16BE();
                return buildDecodeResult(result, 3);
            case 0xd2:
                // 4-bytes signed int
                result = buf.readInt32BE();
                return buildDecodeResult(result, 5);
            case 0xd3:
                result = buf.readInt64BE();
                return buildDecodeResult(result, 9);
            case 0xca:
                // 4-bytes float
                result = buf.readFloatBE();
                return buildDecodeResult(result, 5);
            case 0xcb:
                // 8-bytes double
                result = buf.readDoubleBE();
                return buildDecodeResult(result, 9);
            case 0xd9:
                // strings up to 2^8 - 1 bytes
                length = buf.readUInt8();
                if (!isValidDataSize(length, bufLength, 2)) {
                    return null;
                }
                result = buf.toString("utf8", buf.offset, buf.offset + length);
                buf.skip(length);
                return buildDecodeResult(result, 2 + length);
            case 0xda:
                // strings up to 2^16 - 2 bytes
                length = buf.readUInt16BE();
                if (!isValidDataSize(length, bufLength, 3)) {
                    return null;
                }
                result = buf.toString("utf8", buf.offset, buf.offset + length);
                buf.skip(length);
                return buildDecodeResult(result, 3 + length);
            case 0xdb:
                // strings up to 2^32 - 4 bytes
                length = buf.readUInt32BE();
                if (!isValidDataSize(length, bufLength, 5)) {
                    return null;
                }
                result = buf.toString("utf8", buf.offset, buf.offset + length);
                buf.skip(length);
                return buildDecodeResult(result, 5 + length);
            case 0xc4:
                // buffers up to 2^8 - 1 bytes
                length = buf.readUInt8();
                if (!isValidDataSize(length, bufLength, 2)) {
                    return null;
                }
                result = buf.slice(buf.offset, buf.offset + length).buffer;
                buf.skip(length);
                return buildDecodeResult(result, 2 + length);
            case 0xc5:
                // buffers up to 2^16 - 1 bytes
                length = buf.readUInt16BE();
                if (!isValidDataSize(length, bufLength, 3)) {
                    return null;
                }
                result = buf.slice(buf.offset, buf.offset + length).buffer;
                buf.skip(length);
                return buildDecodeResult(result, 3 + length);
            case 0xc6:
                // buffers up to 2^32 - 1 bytes
                length = buf.readUInt32BE();
                if (!isValidDataSize(length, bufLength, 5)) {
                    return null;
                }
                result = buf.slice(buf.offset, buf.offset + length).buffer;
                buf.skip(length);
                return buildDecodeResult(result, 5 + length);
            case 0xdc:
                // array up to 2^16 elements - 2 bytes
                if (bufLength < 3) {
                    return null;
                }

                length = buf.readUInt16BE();
                return this._decodeArray(buf, length, 3);
            case 0xdd:
                // array up to 2^32 elements - 4 bytes
                if (bufLength < 5) {
                    return null;
                }

                length = buf.readUInt32BE();
                return this._decodeArray(buf, length, 5);
            case 0xde:
                // maps up to 2^16 elements - 2 bytes
                length = buf.readUInt16BE();
                return this._decodeMap(buf, length, 3);
            case 0xdf:
                throw new Error("map too big to decode in JS");
            case 0xd4:
                return this._decodeFixExt(buf, 1);
            case 0xd5:
                return this._decodeFixExt(buf, 2);
            case 0xd6:
                return this._decodeFixExt(buf, 4);
            case 0xd7:
                return this._decodeFixExt(buf, 8);
            case 0xd8:
                return this._decodeFixExt(buf, 16);
            case 0xc7:
                // ext up to 2^8 - 1 bytes
                length = buf.readUInt8();
                type = buf.readUInt8();
                if (!isValidDataSize(length, bufLength, 3)) {
                    return null;
                }
                return this._decodeExt(buf, type, length, 3);
            case 0xc8:
                // ext up to 2^16 - 1 bytes
                length = buf.readUInt16BE();
                type = buf.readUInt8();
                if (!isValidDataSize(length, bufLength, 4)) {
                    return null;
                }
                return this._decodeExt(buf, type, length, 4);
            case 0xc9:
                // ext up to 2^32 - 1 bytes
                length = buf.readUInt32BE();
                type = buf.readUInt8();
                if (!isValidDataSize(length, bufLength, 6)) {
                    return null;
                }
                return this._decodeExt(buf, type, length, 6);
        }

        if ((first & 0xf0) === 0x90) {
            // we have an array with less than 15 elements
            length = first & 0x0f;
            return this._decodeArray(buf, length, 1);
        } else if ((first & 0xf0) === 0x80) {
            // we have a map with less than 15 elements
            length = first & 0x0f;
            return this._decodeMap(buf, length, 1);
        } else if ((first & 0xe0) === 0xa0) {
            // fixstr up to 31 bytes
            length = first & 0x1f;
            if (isValidDataSize(length, bufLength, 1)) {
                result = buf.toString("utf8", buf.offset, buf.offset + length);
                buf.skip(length);
                return buildDecodeResult(result, length + 1);
            }
            return null;

        } else if (first >= 0xe0) {
            // 5 bits negative ints
            result = first - 0x100;
            return buildDecodeResult(result, 1);
        } else if (first < 0x80) {
            // 7-bits positive ints
            return buildDecodeResult(first, 1);
        }
        throw new Error("not implemented yet");
    }

    _decodeMap(buf, length, headerLength) {
        const result = {};
        let key;
        let totalBytesConsumed = 0;

        for (let i = 0; i < length; ++i) {
            const keyResult = this.tryDecode(buf);
            if (keyResult) {
                const valueResult = this.tryDecode(buf);
                if (valueResult) {
                    key = keyResult.value;
                    result[key] = valueResult.value;
                    totalBytesConsumed += (keyResult.bytesConsumed + valueResult.bytesConsumed);
                } else {
                    return null;
                }
            } else {
                return null;
            }
        }
        return buildDecodeResult(result, headerLength + totalBytesConsumed);
    }

    _decodeArray(buf, length, headerLength) {
        const result = [];
        let totalBytesConsumed = 0;

        for (let i = 0; i < length; ++i) {
            const decodeResult = this.tryDecode(buf);
            if (decodeResult) {
                result.push(decodeResult.value);
                totalBytesConsumed += decodeResult.bytesConsumed;
            } else {
                return null;
            }
        }
        return buildDecodeResult(result, headerLength + totalBytesConsumed);
    }

    _decodeFixExt(buf, size) {
        const type = buf.readUInt8();
        return this._decodeExt(buf, type, size, 2);
    }

    _decodeExt(buf, type, size, headerSize) {
        const decTypes = this._decodingTypes;
        for (let i = 0; i < decTypes.length; ++i) {
            if (type === decTypes[i].type) {
                const value = decTypes[i].decode(buf.slice(buf.offset, buf.offset + size));
                buf.skip(size);
                return buildDecodeResult(value, headerSize + size);
            }
        }
        if (type === 0) {
            const val = buf.readUInt8();
            if (val === 0) {
                return buildDecodeResult(undefined, headerSize + size);
            }
        }
        throw new Error(`unable to find ext type ${type}`);
    }
}

export class Serializer {
    constructor() {
        this._encodingTypes = [];
        this._decodingTypes = [];
        this._encoder = null;
        this._decoder = null;
    }

    registerEncoder(type, check, encode) {
        this._encodingTypes.push({ type, check, encode });
        return this;
    }

    registerDecoder(type, decode) {
        this._decodingTypes.push({ type, decode });
        return this;
    }

    register(type, constructor, encode, decode) {
        if (type < 0 || type > 127) {
            throw new RangeError(`Bad type: 0 <= ${type} <= 127`);
        }
        this.registerEncoder(type, (obj) => {
            return (obj instanceof constructor);
        }, (obj) => {
            const extBuf = new ExBuffer(1024, true);
            encode(obj, extBuf);
            return extBuf;
        });
        this.registerDecoder(type, decode);

        return this;
    }

    get encoder() {
        if (adone.is.null(this._encoder)) {
            this._encoder = new adone.data.mpak.Encoder(this._encodingTypes);
        }
        return this._encoder;
    }

    get decoder() {
        if (adone.is.null(this._decoder)) {
            this._decoder = new adone.data.mpak.Decoder(this._decodingTypes);
        }
        return this._decoder;
    }

    encode(x, buf) {
        return this.encoder.encode(x, buf);
    }

    decode(buf, needFlip = true) {
        return this.decoder.decode(buf, needFlip);
    }
}

adone.lazify({
    serializer: () => {
        // Custom types mapping:
        // 127 - adone exceptions
        // 126 - standart errors
        // 125 - Date
        // 124 - Map
        // 123 - Set
        // 120-122 - reserved for std types
        // 119 - adone.math.Long
        // 110-118 - reserved for other adone types
        // 100-109 - reserved for netron types
        // 1-99 - user-defined types
        
        const s = new adone.data.mpak.Serializer();

        const decodeException = (buf) => {
            const id = buf.readUInt16BE();
            const message = s.decode(buf);
            const stack = s.decode(buf);
            return adone.x.create(id, message, stack);
        };

        // Adone exceptions should be registered before std errors in case of inheritance from Error class.

        // Adone exceptions encoders/decoders
        s.register(127, adone.x.Exception, (obj, buf) => {
            buf.writeUInt16BE(obj.id);
            s.encode(obj.message, buf);
            s.encode(obj.stack, buf);
        }, decodeException);

        // Std exceptions encoders/decoders
        s.register(126, Error, (obj, buf) => {
            buf.writeUInt16BE(adone.x.getStdId(obj));
            s.encode(obj.message, buf);
            s.encode(obj.stack, buf);
        }, decodeException);

        // Date
        s.register(125, Date, (obj, buf) => {
            buf.writeUInt64BE(obj.getTime());
        }, (buf) => {
            return new Date(buf.readUInt64BE().toNumber());
        });

        // Map
        s.register(124, Map, (obj, buf) => {
            buf.writeUInt32BE(obj.size);
            for (const [key, val] of obj.entries()) {
                s.encode(key, buf);
                s.encode(val, buf);
            }
        }, (buf) => {
            const map = new Map();
            const size = buf.readUInt32BE();
            for (let i = 0; i < size; i++) {
                const key = s.decode(buf);
                const val = s.decode(buf);
                map.set(key, val);
            }
            return map;
        });

        // Set
        s.register(123, Set, (obj, buf) => {
            buf.writeUInt32BE(obj.size);
            for (const val of obj.values()) {
                s.encode(val, buf);
            }
        }, (buf) => {
            const set = new Set();
            const size = buf.readUInt32BE();
            for (let i = 0; i < size; i++) {
                const val = s.decode(buf);
                set.add(val);
            }
            return set;
        });

        // Long encoder/decoder
        s.register(119, adone.math.Long, (obj, buf) => {
            buf.writeInt8(obj.unsigned ? 1 : 0);
            if (obj.unsigned) {
                buf.writeUInt64BE(obj);
            } else {
                buf.writeInt64BE(obj);
            }
        }, (buf) => {
            const unsigned = Boolean(buf.readInt8());
            return (unsigned ? buf.readUInt64BE() : buf.readInt64BE());
        });        

        return s;
    }
}, exports, require);

export const encode = (obj) => adone.data.mpak.serializer.encode(obj).flip().toBuffer();
export const decode = (buf) => adone.data.mpak.serializer.decode(buf);
export const tryDecode = (buf) => adone.data.mpak.serializer.decoder.tryDecode(buf);
export const any = true;
