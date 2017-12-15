const utils = require("./utils");

const {
    crypto: { hash: { sha1, sha256, sha512, sha3, murmur3 } }
} = adone;

const toCallback = utils.toCallback;
const toBuf = utils.toBuf;
const fromString = utils.fromString;
const fromNumberTo32BitBuf = utils.fromNumberTo32BitBuf;

module.exports = {
    sha1: toCallback((buf) => sha1(buf)),
    sha2256: toCallback((buf) => sha256(buf)),
    sha2512: toCallback((buf) => sha512(buf)),
    sha3512: toCallback(toBuf(sha3.sha3_512)),
    sha3384: toCallback(toBuf(sha3.sha3_384)),
    sha3256: toCallback(toBuf(sha3.sha3_256)),
    sha3224: toCallback(toBuf(sha3.sha3_224)),
    shake128: toCallback(toBuf(sha3.shake_128, 256)),
    shake256: toCallback(toBuf(sha3.shake_256, 512)),
    keccak224: toCallback(toBuf(sha3.keccak_224)),
    keccak256: toCallback(toBuf(sha3.keccak_256)),
    keccak384: toCallback(toBuf(sha3.keccak_384)),
    keccak512: toCallback(toBuf(sha3.keccak_512)),
    murmur3128: toCallback(toBuf(fromString(murmur3.x64.hash128))),
    murmur332: toCallback(fromNumberTo32BitBuf(fromString(murmur3.x86.hash32))),
    addBlake: require("./blake")
};
