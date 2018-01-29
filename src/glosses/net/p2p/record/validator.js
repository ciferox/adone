const {
    util: { splitBuffer }
} = adone;

/**
 * Checks a record and ensures it is still valid.
 * It runs the needed validators.
 *
 * @param {Object} validators
 * @param {Record} record
 * @returns {undefined}
 */
const verifyRecord = (validators, record) => {
    const key = record.key;
    const parts = splitBuffer(key, Buffer.from("/"));

    if (parts.length < 3) {
        // No validator available
        return;
    }

    const validator = validators[parts[1].toString()];

    if (!validator) {
        throw new Error("Invalid record keytype");
    }

    validator.func(key, record.value);
};

/**
 * Check if a given key was signed.
 *
 * @param {Object} validators
 * @param {Buffer} key
 * @returns {boolean}
 */
const isSigned = (validators, key) => {
    const parts = splitBuffer(key, Buffer.from("/"));

    if (parts.length < 3) {
        // No validator available
        return false;
    }

    const validator = validators[parts[1].toString()];

    if (!validator) {
        throw new Error("Invalid record keytype");
    }

    return validator.sign;
};

module.exports = {
    verifyRecord,
    isSigned,
    validators: require("./validators")
};
