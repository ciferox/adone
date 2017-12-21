const {
    data: { varint }
} = adone;

adone.asNamespace(exports);

export const encode = function encode(v, b, o) {
    v = v >= 0 ? v * 2 : v * -2 - 1;
    const r = varint.encode(v, b, o);
    encode.bytes = varint.encode.bytes;
    return r;
};

export const decode = function decode(b, o) {
    const v = varint.decode(b, o);
    decode.bytes = varint.decode.bytes;
    return v & 1 ? (v + 1) / -2 : v / 2;
};

export const encodingLength = function (v) {
    return varint.encodingLength(v >= 0 ? v * 2 : v * -2 - 1);
};
