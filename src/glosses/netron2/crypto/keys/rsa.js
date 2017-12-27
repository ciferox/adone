const crypto = require("crypto");
const keypair = require("keypair");
const pemToJwk = require("pem-jwk").pem2jwk;
const jwkToPem = require("pem-jwk").jwk2pem;

exports.utils = require("./rsa-utils");

exports.generateKey = function (bits) {
    const key = keypair({ bits });
    return {
        privateKey: pemToJwk(key.private),
        publicKey: pemToJwk(key.public)
    };
};

// Takes a jwk key
exports.unmarshalPrivateKey = function (key) {
    if (!key) {
        throw new Error("Key is invalid");
    }
    return {
        privateKey: key,
        publicKey: {
            kty: key.kty,
            n: key.n,
            e: key.e
        }
    };
};

exports.getRandomValues = function (arr) {
    return crypto.randomBytes(arr.length);
};

exports.hashAndSign = function (key, msg) {
    try {
        const sign = crypto.createSign("RSA-SHA256");
        sign.update(msg);
        const pem = jwkToPem(key);
        return sign.sign(pem);
    } catch (err) {
        throw new Error(`Key or message is invalid!: ${err.message}`);
    }
};

exports.hashAndVerify = function (key, sig, msg) {
    try {
        const verify = crypto.createVerify("RSA-SHA256");
        verify.update(msg);
        const pem = jwkToPem(key);
        return verify.verify(pem, sig);
    } catch (err) {
        throw new Error(`Key or message is invalid!:${err.message}`);
    }
};
