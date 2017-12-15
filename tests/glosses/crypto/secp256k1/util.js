const crypto = require("crypto");
const BN = require("bn.js");
const EC = require("elliptic").ec;
const XorShift128Plus = require("xorshift.js").XorShift128Plus;

const ec = new EC("secp256k1");
const BN_ZERO = new BN(0);
const BN_ONE = new BN(1);

const {
    is
} = adone;

const prngs = { privateKey: null, tweak: null, message: null };

const setSeed = function (seed) {
    if (is.buffer(seed)) {
        seed = seed.toString("hex");
    }
    console.log(`Set seed: ${seed}`);

    const prng = new XorShift128Plus(seed);
    for (let i = 0; i < 100; ++i) {
        prng.random();
    }

    prngs.privateKey = new XorShift128Plus(prng.randomBytes(16).toString("hex"));
    prngs.tweak = new XorShift128Plus(prng.randomBytes(16).toString("hex"));
    prngs.message = new XorShift128Plus(prng.randomBytes(16).toString("hex"));
};

const getPrivateKey = function () {
    while (true) {
        const privateKey = prngs.privateKey.randomBytes(32);
        const bn = new BN(privateKey);
        if (bn.cmp(BN_ZERO) === 1 && bn.cmp(ec.curve.n) === -1) {
            return privateKey;
        }
    }
};

const getPublicKey = function (privateKey) {
    const publicKey = ec.keyFromPrivate(privateKey).getPublic();
    return {
        compressed: Buffer.from(publicKey.encode(null, true)),
        uncompressed: Buffer.from(publicKey.encode(null, false))
    };
};

const getMessage = function () {
    return prngs.message.randomBytes(32);
};

const sign = function (message, privateKey) {
    const ecSig = ec.sign(message, privateKey, { canonical: false });

    const signature = Buffer.concat([
        ecSig.r.toArrayLike(Buffer, "be", 32),
        ecSig.s.toArrayLike(Buffer, "be", 32)
    ]);
    let recovery = ecSig.recoveryParam;
    if (ecSig.s.cmp(ec.nh) === 1) {
        ecSig.s = ec.n.sub(ecSig.s);
        recovery ^= 1;
    }
    const signatureLowS = Buffer.concat([
        ecSig.r.toArrayLike(Buffer, "be", 32),
        ecSig.s.toArrayLike(Buffer, "be", 32)
    ]);

    return {
        signature,
        signatureLowS,
        recovery
    };
};


const getSignature = function (message, privateKey) {
    return sign(message, privateKey).signatureLowS;
};

const getTweak = function () {
    while (true) {
        const tweak = prngs.tweak.randomBytes(32);
        const bn = new BN(tweak);
        if (bn.cmp(ec.curve.n) === -1) {
            return tweak;
        }
    }
};

const ecdh = function (publicKey, privateKey) {
    const secret = ec.keyFromPrivate(privateKey);
    const point = ec.keyFromPublic(publicKey).getPublic();
    const sharedSecret = Buffer.from(point.mul(secret.priv).encode(null, true));
    return crypto.createHash("sha256").update(sharedSecret).digest();
};

const ecdhUnsafe = function (publicKey, privateKey) {
    const secret = ec.keyFromPrivate(privateKey);
    const point = ec.keyFromPublic(publicKey).getPublic();
    const shared = point.mul(secret.priv);
    return {
        compressed: Buffer.from(shared.encode(null, true)),
        uncompressed: Buffer.from(shared.encode(null, false))
    };
};

const env = {
    repeat: parseInt((global.__env__ && global.__env__.RANDOM_TESTS_REPEAT) || process.env.RANDOM_TESTS_REPEAT || 1, 10),
    seed: (global.__env__ && global.__env__.SEED) || process.env.SEED || crypto.randomBytes(32)
};

const _repeat = function (name, total, fn) {
    it(name, (done) => {
        let curr = 0;

        const next = function () {
            if (curr >= total) {
                return done();
            }
            fn(() => {
                curr += 1;
                setTimeout(next, 0);
            });
        };

        next();
    });
};

const repeat = function (name, total, fn) {
    _repeat(name, total, fn);
};

repeat.skip = function (t, name, total, fn) {
    _repeat(t.skip, name, total, fn);
};
repeat.only = function (t, name, total, fn) {
    _repeat(t.only, name, total, fn);
};

module.exports = {
    ec,
    BN_ZERO,
    BN_ONE,

    prngs,
    setSeed,
    getPrivateKey,
    getPublicKey,
    getSignature,
    getTweak,
    getMessage,

    sign,
    ecdh,
    ecdhUnsafe,

    env,
    repeat
};
