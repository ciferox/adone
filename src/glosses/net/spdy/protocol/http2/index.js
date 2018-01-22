export const name = "h2";

adone.lazify({
    constants: "./constants",
    Parser: "./parser",
    Framer: "./framer",
    CompressionPool: "./hpack_pool"
}, exports, require);
