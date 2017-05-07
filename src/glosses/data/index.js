adone.lazify({
    json: () => ({
        encode: (obj, { space } = {}) => Buffer.from(JSON.stringify(obj, null, space), "utf8"),
        decode: (buf) => JSON.parse(buf.toString()),
        any: false
    }),
    json5: "./json5",
    mpak: "./mpak",
    bson: "./bson",
    base64: "./base64",
    yaml: "./yaml"
}, exports, require);
