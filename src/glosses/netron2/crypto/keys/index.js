const jsrsasign = require("jsrsasign");
const KEYUTIL = jsrsasign.KEYUTIL;

const {
    is,
    data: { protobuf }
} = adone;

const keysPBM = protobuf.create(require("./keys.proto"));

exports = module.exports;

const supportedKeys = {
    rsa: require("./rsa-class"),
    ed25519: require("./ed25519-class"),
    secp256k1: adone.netron2.crypto.secp256k1(keysPBM, require("../random-bytes"))
};

exports.supportedKeys = supportedKeys;
exports.keysPBM = keysPBM;

const isValidKeyType = (keyType) => {
    const key = supportedKeys[keyType.toLowerCase()];
    return !is.undefined(key);
};

exports.keyStretcher = require("./key-stretcher");
exports.generateEphemeralKeyPair = require("./ephemeral-keys");

// Generates a keypair of the given type and bitsize
exports.generateKeyPair = (type, bits) => {
    const key = supportedKeys[type.toLowerCase()];

    if (!key) {
        throw new Error("invalid or unsupported key type");
    }

    return key.generateKeyPair(bits);
};

// Generates a keypair of the given type and bitsize
// seed is a 32 byte uint8array
exports.generateKeyPairFromSeed = (type, seed, bits) => {
    const key = supportedKeys[type.toLowerCase()];
    if (!key) {
        throw new Error("invalid or unsupported key type");
    }
    if (type.toLowerCase() !== "ed25519") {
        throw new Error("Seed key derivation is unimplemented for RSA or secp256k1");
    }
    return key.generateKeyPairFromSeed(seed, bits);
};

// Converts a protobuf serialized public key into its
// representative object
exports.unmarshalPublicKey = (buf) => {
    const decoded = keysPBM.PublicKey.decode(buf);
    const data = decoded.Data;

    switch (decoded.Type) {
        case keysPBM.KeyType.RSA:
            return supportedKeys.rsa.unmarshalRsaPublicKey(data);
        case keysPBM.KeyType.Ed25519:
            return supportedKeys.ed25519.unmarshalEd25519PublicKey(data);
        case keysPBM.KeyType.Secp256k1:
            if (supportedKeys.secp256k1) {
                return supportedKeys.secp256k1.unmarshalSecp256k1PublicKey(data);
            }
            throw new Error("secp256k1 support requires secp256k1");
        default:
            throw new Error("invalid or unsupported key type");
    }
};

// Converts a public key object into a protobuf serialized public key
exports.marshalPublicKey = (key, type) => {
    type = (type || "rsa").toLowerCase();
    if (!isValidKeyType(type)) {
        throw new Error("invalid or unsupported key type");
    }

    return key.bytes;
};

// Converts a protobuf serialized private key into its
// representative object
exports.unmarshalPrivateKey = (buf, callback) => {
    let decoded;
    try {
        decoded = keysPBM.PrivateKey.decode(buf);
    } catch (err) {
        return callback(err);
    }

    const data = decoded.Data;

    switch (decoded.Type) {
        case keysPBM.KeyType.RSA:
            return supportedKeys.rsa.unmarshalRsaPrivateKey(data, callback);
        case keysPBM.KeyType.Ed25519:
            return supportedKeys.ed25519.unmarshalEd25519PrivateKey(data, callback);
        case keysPBM.KeyType.Secp256k1:
            if (supportedKeys.secp256k1) {
                return supportedKeys.secp256k1.unmarshalSecp256k1PrivateKey(data, callback);
            }
            return callback(new Error("secp256k1 support requires secp256k1"));

        default:
            callback(new Error("invalid or unsupported key type"));
    }
};

// Converts a private key object into a protobuf serialized private key
exports.marshalPrivateKey = (key, type) => {
    type = (type || "rsa").toLowerCase();
    if (!isValidKeyType(type)) {
        throw new Error("invalid or unsupported key type");
    }

    return key.bytes;
};


exports.import = (pem, password) => {
    const key = KEYUTIL.getKey(pem, password);
    if (key instanceof jsrsasign.RSAKey) {
        const jwk = KEYUTIL.getJWKFromKey(key);
        return supportedKeys.rsa.fromJwk(jwk);
    }
    throw new Error(`Unknown key type '${key.prototype.toString()}'`);
};
