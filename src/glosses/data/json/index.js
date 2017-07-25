export const any = false;

export const encode = (obj, { space = "", replacer } = {}) => Buffer.from(JSON.stringify(obj, replacer, space), "utf8");
export const decode = (buf) => JSON.parse(buf.toString());

adone.lazify({
    encodeStable: "./stable",
    encodeSafe: ["./safe", (mod) => mod.stringify],
    decodeSafe: ["./safe", (mod) => mod.parse]
}, exports, require);
