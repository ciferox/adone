const lengthPrefixed = adone.lazify({
    encode: "./encode",
    decode: "./decode",
    decodeFromReader: () => lengthPrefixed.decode.fromReader
}, exports, require);
