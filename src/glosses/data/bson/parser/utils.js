const {
    is
} = adone;

/**
 * Normalizes our expected stringified form of a function across versions of node
 * @param {Function} fn The function to stringify
 */
const normalizedFunctionString = function (fn) {
    return fn.toString().replace("function(", "function (");
};

const insecureRandomBytes = function (size) {
    const result = new Uint8Array(size);
    for (let i = 0; i < size; ++i) {
        result[i] = Math.floor(Math.random() * 256);
    }
    return result;
};

let randomBytes = insecureRandomBytes;
if (typeof window !== "undefined" && window.crypto && window.crypto.getRandomValues) { // eslint-disable-line
    randomBytes = (size) => window.crypto.getRandomValues(new Uint8Array(size)); // eslint-disable-line
} else {
    try {
        randomBytes = require("crypto").randomBytes;
    } catch (e) {
        // keep the fallback
    }

    // NOTE: in transpiled cases the above require might return null/undefined
    if (is.nil(randomBytes)) {
        randomBytes = insecureRandomBytes;
    }
}

module.exports = {
    normalizedFunctionString,
    randomBytes
};
