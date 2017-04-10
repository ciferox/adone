const nfre = /NotFound/i;

export const verifyNotFoundError = function verifyNotFoundError(err) {
    return nfre.test(err.message) || nfre.test(err.name);
};

export const isTypedArray = function isTypedArray(value) {
    return (typeof ArrayBuffer !== "undefined" && value instanceof ArrayBuffer) || (typeof Uint8Array !== "undefined" && value instanceof Uint8Array);
};
