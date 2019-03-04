const bs58 = require("bs58");

const {
    is,
    p2p: { crypto }
} = adone;

exports = module.exports;

/**
 * Generatea random sequence number.
 *
 * @returns {Buffer}
 * @private
 */
exports.randomSeqno = () => {
    return crypto.randomBytes(20);
};

/**
 * Generate a message id, based on the `from` and `seqno`.
 *
 * @param {string} from
 * @param {Buffer} seqno
 * @returns {string}
 * @private
 */
exports.msgId = (from, seqno) => {
    return from + seqno.toString("hex");
};

/**
 * Check if any member of the first set is also a member
 * of the second set.
 *
 * @param {Set|Array} a
 * @param {Set|Array} b
 * @returns {boolean}
 * @private
 */
exports.anyMatch = (a, b) => {
    let bHas;
    if (is.array(b)) {
        bHas = (val) => b.indexOf(val) > -1;
    } else {
        bHas = (val) => b.has(val);
    }

    for (const val of a) {
        if (bHas(val)) {
            return true;
        }
    }

    return false;
};

/**
 * Make everything an array.
 *
 * @param {any} maybeArray
 * @returns {Array}
 * @private
 */
exports.ensureArray = (maybeArray) => {
    if (!is.array(maybeArray)) {
        return [maybeArray];
    }

    return maybeArray;
};

exports.normalizeInRpcMessages = (messages) => {
    if (!messages) {
        return messages;
    }
    return messages.map((msg) => {
        const m = Object.assign({}, msg);
        if (is.buffer(msg.from)) {
            m.from = bs58.encode(msg.from);
        }
        return m;
    });
};

exports.normalizeOutRpcMessages = (messages) => {
    if (!messages) {
        return messages;
    }
    return messages.map((msg) => {
        const m = Object.assign({}, msg);
        if (is.string(msg.from) || msg.from instanceof String) {
            m.from = bs58.decode(msg.from);
        }
        return m;
    });
};
