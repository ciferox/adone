const {
    crypto: { secp256k1 },
    multi
} = adone;

const HASH_ALGORITHM = "sha2-256";

module.exports = (randomBytes) => {
    const privateKeyLength = 32;

    const generateKey = function () {
        let privateKey;
        do {
            privateKey = randomBytes(32);
        } while (!secp256k1.privateKeyVerify(privateKey));

        return privateKey;
    };

    const hashAndSign = function (key, msg) {
        const digest = multi.hash.digest(msg, HASH_ALGORITHM);
        const sig = secp256k1.sign(digest, key);
        return secp256k1.signatureExport(sig.signature);
    };

    const hashAndVerify = function (key, sig, msg) {
        const digest = multi.hash.digest(msg, HASH_ALGORITHM);
        sig = secp256k1.signatureImport(sig);
        return secp256k1.verify(digest, sig, key);
    };

    const compressPublicKey = function (key) {
        if (!secp256k1.publicKeyVerify(key)) {
            throw new Error("Invalid public key");
        }
        return secp256k1.publicKeyConvert(key, true);
    };

    const decompressPublicKey = function (key) {
        return secp256k1.publicKeyConvert(key, false);
    };

    const validatePrivateKey = function (key) {
        if (!secp256k1.privateKeyVerify(key)) {
            throw new Error("Invalid private key");
        }
    };

    const validatePublicKey = function (key) {
        if (!secp256k1.publicKeyVerify(key)) {
            throw new Error("Invalid public key");
        }
    };

    const computePublicKey = function (privateKey) {
        validatePrivateKey(privateKey);
        return secp256k1.publicKeyCreate(privateKey);
    };

    return {
        generateKey,
        privateKeyLength,
        hashAndSign,
        hashAndVerify,
        compressPublicKey,
        decompressPublicKey,
        validatePrivateKey,
        validatePublicKey,
        computePublicKey
    };
};
