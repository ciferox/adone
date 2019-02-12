const {
    is
} = adone;

const nfre = /NotFound/i;

exports.verifyNotFoundError = function verifyNotFoundError(err) {
    return nfre.test(err.message) || nfre.test(err.name);
};

exports.isTypedArray = function isTypedArray(value) {
    return (!is.undefined(ArrayBuffer) && value instanceof ArrayBuffer) ||
    (!is.undefined(Uint8Array) && value instanceof Uint8Array);
};
