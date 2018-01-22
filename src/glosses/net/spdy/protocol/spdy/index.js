export const name = "spdy";

adone.lazify({
    dictionary: "./dictionary",
    constants: "./constants",
    Parser: "./parser",
    Framer: "./framer",
    CompressionPool: "./zlib_pool"
}, exports, require);
