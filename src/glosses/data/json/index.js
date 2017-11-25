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
    encodeStable: "./stable",
    encodeSafe: ["./safe", (mod) => mod.stringify],
    decodeSafe: ["./safe", (mod) => mod.parse]
}, adone.asNamespace(exports), require);
