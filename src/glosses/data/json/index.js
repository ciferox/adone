export const any = false;

export const encode = (obj, { space = "", replacer, newline = false } = {}) => {
    let str = JSON.stringify(obj, replacer, space);
    if (newline) {
        str += "\n";
    }
    return Buffer.from(str, "utf8");
};

export const decode = (buf) => JSON.parse(buf.toString());

adone.lazify({
    encodeStable: "./encode_stable",
    encodeSafe: "./encode_safe",
    decodeSafe: "./decode_safe"
}, adone.asNamespace(exports), require);
