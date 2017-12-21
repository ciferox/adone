const {
    is,
    data: { varint, varintSigned }
} = adone;

const encoder = function (type, encode, decode, encodingLength) {
    encode.bytes = decode.bytes = 0;

    return {
        type,
        encode,
        decode,
        encodingLength
    };
};

exports.make = encoder;

exports.bytes = (function (tag) {
    const bufferLength = function (val) {
        return is.buffer(val) ? val.length : Buffer.byteLength(val);
    };

    const encodingLength = function (val) {
        const len = bufferLength(val);
        return varint.encodingLength(len) + len;
    };

    const encode = function (val, buffer, offset) {
        const oldOffset = offset;
        const len = bufferLength(val);

        varint.encode(len, buffer, offset);
        offset += varint.encode.bytes;

        if (is.buffer(val)) {
            val.copy(buffer, offset);
        } else {
            buffer.write(val, offset, len);
        }
        offset += len;

        encode.bytes = offset - oldOffset;
        return buffer;
    };

    const decode = function (buffer, offset) {
        const oldOffset = offset;

        const len = varint.decode(buffer, offset);
        offset += varint.decode.bytes;

        const val = buffer.slice(offset, offset + len);
        offset += val.length;

        decode.bytes = offset - oldOffset;
        return val;
    };

    return encoder(2, encode, decode, encodingLength);
})();

exports.string = (function () {
    const encodingLength = function (val) {
        const len = Buffer.byteLength(val);
        return varint.encodingLength(len) + len;
    };

    const encode = function (val, buffer, offset) {
        const oldOffset = offset;
        const len = Buffer.byteLength(val);

        varint.encode(len, buffer, offset, "utf-8");
        offset += varint.encode.bytes;

        buffer.write(val, offset, len);
        offset += len;

        encode.bytes = offset - oldOffset;
        return buffer;
    };

    const decode = function (buffer, offset) {
        const oldOffset = offset;

        const len = varint.decode(buffer, offset);
        offset += varint.decode.bytes;

        const val = buffer.toString("utf-8", offset, offset + len);
        offset += len;

        decode.bytes = offset - oldOffset;
        return val;
    };

    return encoder(2, encode, decode, encodingLength);
})();

exports.bool = (function () {
    const encodingLength = function (val) {
        return 1;
    };

    const encode = function (val, buffer, offset) {
        buffer[offset] = val ? 1 : 0;
        encode.bytes = 1;
        return buffer;
    };

    const decode = function (buffer, offset) {
        const bool = buffer[offset] > 0;
        decode.bytes = 1;
        return bool;
    };

    return encoder(0, encode, decode, encodingLength);
})();

exports.int32 = (function () {
    const decode = function (buffer, offset) {
        const val = varint.decode(buffer, offset);
        decode.bytes = varint.decode.bytes;
        return val > 2147483647 ? val - 4294967296 : val;
    };

    const encode = function (val, buffer, offset) {
        varint.encode(val < 0 ? val + 4294967296 : val, buffer, offset);
        encode.bytes = varint.encode.bytes;
        return buffer;
    };

    const encodingLength = function (val) {
        return varint.encodingLength(val < 0 ? val + 4294967296 : val);
    };

    return encoder(0, varint.encode, decode, encodingLength);
})();

exports.int64 = (function () {
    const decode = function (buffer, offset) {
        let val = varint.decode(buffer, offset);
        if (val >= Math.pow(2, 63)) {
            let limit = 9;
            while (buffer[offset + limit - 1] === 0xff) {
                limit--;
            }
            limit = limit || 9;
            const subset = Buffer.allocUnsafe(limit);
            buffer.copy(subset, 0, offset, offset + limit);
            subset[limit - 1] = subset[limit - 1] & 0x7f;
            val = -1 * varint.decode(subset, 0);
            decode.bytes = 10;
        } else {
            decode.bytes = varint.decode.bytes;
        }
        return val;
    };

    const encode = function (val, buffer, offset) {
        if (val < 0) {
            const last = offset + 9;
            varint.encode(val * -1, buffer, offset);
            offset += varint.encode.bytes - 1;
            buffer[offset] = buffer[offset] | 0x80;
            while (offset < last - 1) {
                offset++;
                buffer[offset] = 0xff;
            }
            buffer[last] = 0x01;
            encode.bytes = 10;
        } else {
            varint.encode(val, buffer, offset);
            encode.bytes = varint.encode.bytes;
        }
        return buffer;
    };

    const encodingLength = function (val) {
        return val < 0 ? 10 : varint.encodingLength(val);
    };

    return encoder(0, encode, decode, encodingLength);
})();

exports.sint32 =
    exports.sint64 = (function () {
        return encoder(0, varintSigned.encode, varintSigned.decode, varintSigned.encodingLength);
    })();

exports.uint32 =
    exports.uint64 =
    exports.enum =
    exports.varint = (function () {
        return encoder(0, varint.encode, varint.decode, varint.encodingLength);
    })();

// we cannot represent these in javascript so we just use buffers
exports.fixed64 =
    exports.sfixed64 = (function () {
        const encodingLength = function (val) {
            return 8;
        };

        const encode = function (val, buffer, offset) {
            val.copy(buffer, offset);
            encode.bytes = 8;
            return buffer;
        };

        const decode = function (buffer, offset) {
            const val = buffer.slice(offset, offset + 8);
            decode.bytes = 8;
            return val;
        };

        return encoder(1, encode, decode, encodingLength);
    })();

exports.double = (function () {
    const encodingLength = function (val) {
        return 8;
    };

    const encode = function (val, buffer, offset) {
        buffer.writeDoubleLE(val, offset);
        encode.bytes = 8;
        return buffer;
    };

    const decode = function (buffer, offset) {
        const val = buffer.readDoubleLE(offset);
        decode.bytes = 8;
        return val;
    };

    return encoder(1, encode, decode, encodingLength);
})();

exports.fixed32 = (function () {
    const encodingLength = function (val) {
        return 4;
    };

    const encode = function (val, buffer, offset) {
        buffer.writeUInt32LE(val, offset);
        encode.bytes = 4;
        return buffer;
    };

    const decode = function (buffer, offset) {
        const val = buffer.readUInt32LE(offset);
        decode.bytes = 4;
        return val;
    };

    return encoder(5, encode, decode, encodingLength);
})();

exports.sfixed32 = (function () {
    const encodingLength = function (val) {
        return 4;
    };

    const encode = function (val, buffer, offset) {
        buffer.writeInt32LE(val, offset);
        encode.bytes = 4;
        return buffer;
    };

    const decode = function (buffer, offset) {
        const val = buffer.readInt32LE(offset);
        decode.bytes = 4;
        return val;
    };

    return encoder(5, encode, decode, encodingLength);
})();

exports.float = (function () {
    const encodingLength = function (val) {
        return 4;
    };

    const encode = function (val, buffer, offset) {
        buffer.writeFloatLE(val, offset);
        encode.bytes = 4;
        return buffer;
    };

    const decode = function (buffer, offset) {
        const val = buffer.readFloatLE(offset);
        decode.bytes = 4;
        return val;
    };

    return encoder(5, encode, decode, encodingLength);
})();
