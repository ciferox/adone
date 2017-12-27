const {
    is,
    multi
} = adone;

/**
 * Validator for publick key records.
 * Verifies that the passed in record value is the PublicKey
 * that matches the passed in key.
 *
 * @param {Buffer} key - A valid key is of the form `'/pk/<keymultihash>'`
 * @param {Buffer} publicKey - The public key to validate against (protobuf encoded).
 * @param {function(Error)} callback
 * @returns {undefined}
 */
const validatePublicKeyRecord = (key, publicKey) => {
    if (!is.buffer(key)) {
        throw new Error('"key" must be a Buffer');
    }

    if (key.length < 3) {
        throw new Error("invalid public key record");
    }

    const prefix = key.slice(0, 4).toString();

    if (prefix !== "/pk/") {
        throw new Error("key was not prefixed with /pk/");
    }

    const keyhash = key.slice(4);

    const publicKeyHash = multi.hash.create(publicKey, "sha2-256");
    if (!keyhash.equals(publicKeyHash)) {
        throw new Error("public key does not match passed in key");
    }
};

module.exports = {
    func: validatePublicKeyRecord,
    sign: false
};
