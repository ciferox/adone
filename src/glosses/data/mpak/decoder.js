const { is } = adone;

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

export default class Decoder {
    constructor(decodingTypes) {
        this._decodingTypes = decodingTypes;
    }

    decode(buf) {
        if (!is.exbuffer(buf)) {
            buf = adone.ExBuffer.wrap(buf, undefined, true);
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
