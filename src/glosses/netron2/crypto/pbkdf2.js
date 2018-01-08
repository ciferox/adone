/**
 * Maps an IPFS hash name to its adone equivalent.
 *
 * See https://github.com/multiformats/multihash/blob/master/hashtable.csv
 *
 * @private
 */
const hashName = {
    sha1: "sha1",
    "sha2-256": "sha256",
    "sha2-512": "sha512"
};

/**
 * Computes the Password-Based Key Derivation Function 2.
 *
 * @param {string} password
 * @param {string} salt
 * @param {number} iterations
 * @param {number} keySize (in bytes)
 * @param {string} hash - The hash name ('sha1', 'sha2-512, ...)
 * @returns {string} - A new password
 */
const pbkdf2 = function (password, salt, iterations, keySize, hash) {
    hash = hashName[hash];
    if (!hash) {
        throw new Error(`Hash '${hash}' is unknown or not supported`);
    }

    return adone.crypto.pkcs5.pbkdf2Sync(password, salt, iterations, keySize, hash).toString("base64");
};

module.exports = pbkdf2;
