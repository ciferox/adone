const nacl = require("tweetnacl");

exports.publicKeyLength = nacl.sign.publicKeyLength;
exports.privateKeyLength = nacl.sign.secretKeyLength;

exports.generateKey = function () {
    return nacl.sign.keyPair();
};

// seed should be a 32 byte uint8array
exports.generateKeyFromSeed = function (seed) {
    return nacl.sign.keyPair.fromSeed(seed);
};

exports.hashAndSign = function (key, msg) {
    return Buffer.from(nacl.sign.detached(msg, key));
};

exports.hashAndVerify = function (key, sig, msg) {
    return nacl.sign.detached.verify(msg, sig, key);
};
