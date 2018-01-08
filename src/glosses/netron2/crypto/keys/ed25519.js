const {
    crypto: { ed25519 }
} = adone;

exports.publicKeyLength = ed25519.publicKeyLength;
exports.privateKeyLength = ed25519.privateKeyLength;

exports.generateKey = () => ed25519.generateKeyPair(adone.std.crypto.randomBytes(32));

// seed should be a 32 byte uint8array
exports.generateKeyFromSeed = (seed) => ed25519.generateKeyPair(seed);

exports.hashAndSign = (key, msg) => Buffer.from(ed25519.sign(msg, key));

exports.hashAndVerify = (key, sig, msg) => ed25519.verify(msg, sig, key);
