const {
    is
} = adone;

const toString = Object.prototype.toString;

const isArrayBuffer = (input) => toString.call(input).slice(8, -1) === "ArrayBuffer";

const fromArrayBuffer = (obj, byteOffset, length) => {
    byteOffset >>>= 0;

    const maxLength = obj.byteLength - byteOffset;

    if (maxLength < 0) {
        throw new RangeError("'offset' is out of bounds");
    }

    if (is.undefined(length)) {
        length = maxLength;
    } else {
        length >>>= 0;

        if (length > maxLength) {
            throw new RangeError("'length' is out of bounds");
        }
    }

    return Buffer.from(obj.slice(byteOffset, byteOffset + length));
};

const fromString = (string, encoding) => {
    if (!is.string(encoding) || encoding === "") {
        encoding = "utf8";
    }

    if (!Buffer.isEncoding(encoding)) {
        throw new TypeError('"encoding" must be a valid string encoding');
    }

    return Buffer.from(string, encoding);
};

export default (value, encodingOrOffset, length) => {
    if (is.number(value)) {
        throw new TypeError('"value" argument must not be a number');
    }

    if (isArrayBuffer(value)) {
        return fromArrayBuffer(value, encodingOrOffset, length);
    }

    if (is.string(value)) {
        return fromString(value, encodingOrOffset);
    }

    return Buffer.from(value);
};
