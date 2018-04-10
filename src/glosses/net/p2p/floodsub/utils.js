const {
    is,
    data: { base58 },
    std
} = adone;

export const randomSeqno = function () {
    return std.crypto.randomBytes(20).toString("hex");
};

export const msgId = function (from, seqno) {
    return from + seqno;
};

export const anyMatch = function (a, b) {
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

export const ensureArray = function (maybeArray) {
    if (!is.array(maybeArray)) {
        return [maybeArray];
    }
    return maybeArray;
};

export const normalizeInRpcMessages = function (messages) {
    if (!messages) {
        return messages;
    }
    return messages.map((msg) => {
        const m = Object.assign({}, msg);
        if (is.buffer(msg.from)) {
            m.from = base58.encode(msg.from);
        }
        return m;
    });
};

export const normalizeOutRpcMessages = function (messages) {
    if (!messages) {
        return messages;
    }
    return messages.map((msg) => {
        const m = Object.assign({}, msg);
        if (is.string(msg.from) || msg.from instanceof String) {
            m.from = base58.decode(msg.from);
        }
        return m;
    });
};
