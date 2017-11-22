export const unescape = (str) => (str + "===".slice((str.length + 3) % 4)).replace(/-/g, "+").replace(/_/g, "/");
export const escape = (str) => str.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");

export const encode = (str, { encoding = "utf8" } = {}) => {
    return escape(Buffer.from(str, encoding).toString("base64"));
};

export const decode = (str, { buffer = false, encoding = "utf8" } = {}) => {
    const buf = Buffer.from(unescape(str), "base64");
    if (!buffer) {
        return buf.toString(encoding);
    }
    return buf;
};
