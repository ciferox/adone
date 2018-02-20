export const typedBuffer = (binString, buffType, type) => {
    // buffType is either 'binary' or 'base64'
    const buff = Buffer.from(binString, buffType);
    buff.type = type; // non-standard, but used for consistency with the browser
    return buff;
};

export const atob = (str) => {
    const base64 = Buffer.from(str, "base64");
    // Node.js will just skip the characters it can't decode instead of
    // throwing an error
    if (base64.toString("base64") !== str) {
        throw new Error("attachment is not a valid base64 string");
    }
    return base64.toString("binary");
};

export const btoa = (str) => {
    return Buffer.from(str, "binary").toString("base64");
};

export const base64toBuffer = (b64, type) => {
    return typedBuffer(b64, "base64", type);
};

export const binaryStringToBuffer = (binString, type) => {
    return typedBuffer(binString, "binary", type);
};

export const bufferToBinaryString = (blobOrBuffer, callback) => {
    callback(blobOrBuffer.toString("binary"));
};

export const bufferToBase64 = (blobOrBuffer, callback) => {
    callback(blobOrBuffer.toString("base64"));
};
