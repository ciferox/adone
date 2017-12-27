const {
    netron2: { crypto },
    stream: { pull },
    multi: { hash: { async: mh } }
} = adone;

exports.exchanges = [
    "P-256",
    "P-384",
    "P-521"
];

exports.ciphers = [
    "AES-256",
    "AES-128"
];

exports.hashes = [
    "SHA256",
    "SHA512"
];

// Determines which algorithm to use.  Note:  f(a, b) = f(b, a)
exports.theBest = (order, p1, p2) => {
    let first;
    let second;

    if (order < 0) {
        first = p2;
        second = p1;
    } else if (order > 0) {
        first = p1;
        second = p2;
    } else {
        return p1[0];
    }

    for (const firstCandidate of first) {
        for (const secondCandidate of second) {
            if (firstCandidate === secondCandidate) {
                return firstCandidate;
            }
        }
    }

    throw new Error("No algorithms in common!");
};

const makeMac = function (hash, key) {
    return crypto.hmac.create(hash, key);
};

const makeCipher = function (cipherType, iv, key) {
    if (cipherType === "AES-128" || cipherType === "AES-256") {
        return crypto.aes.create(key, iv);
    }

    // TODO: figure out if Blowfish is needed and if so find a library for it.
    throw new Error(`unrecognized cipher type: ${cipherType}`);
};

exports.makeMacAndCipher = (target) => {
    target.mac = makeMac(target.hashT, target.keys.macKey);
    target.cipher = makeCipher(target.cipherT, target.keys.iv, target.keys.cipherKey);
};

exports.selectBest = (local, remote) => {
    const oh1 = exports.digest(Buffer.concat([remote.pubKeyBytes, local.nonce]));
    const oh2 = exports.digest(Buffer.concat([local.pubKeyBytes, remote.nonce]));
    const order = Buffer.compare(oh1, oh2);

    if (order === 0) {
        throw new Error("you are trying to talk to yourself");
    }

    return {
        curveT: exports.theBest(order, local.exchanges, remote.exchanges),
        cipherT: exports.theBest(order, local.ciphers, remote.ciphers),
        hashT: exports.theBest(order, local.hashes, remote.hashes),
        order
    };
};

exports.digest = (buf) => mh.digest(buf, "sha2-256", buf.length);

exports.write = function write(state, msg, cb) {
    cb = cb || (() => { });
    pull(
        pull.values([
            msg
        ]),
        pull.lengthPrefixed.encode({ fixed: true, bytes: 4 }),
        pull.collect((err, res) => {
            if (err) {
                return cb(err);
            }
            state.shake.write(res[0]);
            cb();
        })
    );
};

exports.read = function read(reader, cb) {
    pull.lengthPrefixed.decodeFromReader(reader, { fixed: true, bytes: 4 }, cb);
};
