const {
    is,
    identity
} = adone;

const isBinary = (data) => is.nil(data) || is.buffer(data);

export const utf8 = {
    encode(data) {
        return isBinary(data) ? data : String(data);
    },
    decode: identity,
    buffer: false,
    type: "utf8"
};

export const json = {
    encode: JSON.stringify,
    decode: JSON.parse,
    buffer: false,
    type: "json"
};

export const bson = {
    encode: adone.data.bson.encode,
    decode: adone.data.bson.decode,
    buffer: true,
    type: "bson"
};

export const mpak = {
    encode: adone.data.mpak.encode,
    decode: adone.data.mpak.decode,
    buffer: true,
    type: "mpak"
};

export const binary = {
    encode(data) {
        return isBinary(data) ? data : Buffer.from(data);
    },
    decode: identity,
    buffer: true,
    type: "binary"
};

export const none = {
    encode: identity,
    decode: identity,
    buffer: false,
    type: "id"
};

export const id = none;

const bufferEncodings = [
    "hex",
    "ascii",
    "base64",
    "ucs2",
    "ucs-2",
    "utf16le",
    "utf-16le"
];

bufferEncodings.forEach((type) => {
    exports[type] = {
        encode(data) {
            return isBinary(data) ? data : Buffer.from(data, type);
        },
        decode(buffer) {
            return buffer.toString(type);
        },
        buffer: true,
        type
    };
});
