const {
    is,
    data: { protobuf }
} = adone;

export const keysPBM = protobuf.create(require("./keys.proto"));

export const supportedKeys = adone.lazify({
    rsa: "./rsa",
    ed25519: "./ed25519",
    secp256k1: () => adone.net.p2p.crypto.secp256k1(keysPBM)
}, null, require);

const isValidKeyType = (keyType) => {
    const key = supportedKeys[keyType];
    return !is.undefined(key);
};

adone.lazify({
    keyStretcher: "./key_stretcher",
    generateEphemeralKeyPair: "./ephemeral_keys"
}, exports, require);

// Generates a keypair of the given type and bitsize
export const generateKeyPair = (type, bits) => {
    const key = supportedKeys[type];

    if (!key) {
        throw new Error("invalid or unsupported key type");
    }

    return key.generateKeyPair(bits);
};

// Generates a keypair of the given type and bitsize
// seed is a 32 byte uint8array
export const generateKeyPairFromSeed = (type, seed, bits) => {
    const key = supportedKeys[type];
    if (!key) {
        throw new Error("Invalid or unsupported key type");
    }
    if (type !== "ed25519") {
        throw new Error("Seed key derivation is unimplemented for RSA or secp256k1");
    }
    return key.generateKeyPairFromSeed(seed, bits);
};

// Converts a protobuf serialized public key into its
// representative object
export const unmarshalPublicKey = (buf) => {
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
export const marshalPublicKey = (key, type) => {
    type = (type || "rsa").toLowerCase();
    if (!isValidKeyType(type)) {
        throw new Error("invalid or unsupported key type");
    }

    return key.bytes;
};

// Converts a protobuf serialized private key into its
// representative object
export const unmarshalPrivateKey = (buf, callback) => {
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
export const marshalPrivateKey = (key, type) => {
    type = (type || "rsa").toLowerCase();
    if (!isValidKeyType(type)) {
        throw new Error("invalid or unsupported key type");
    }

    return key.bytes;
};

exports.import = (pem, password) => {
    const key = adone.crypto.pki.decryptRsaPrivateKey(pem, password);
    if (is.null(key)) {
        throw new Error("Cannot read the key, most likely the password is wrong or not a RSA key");
    }
    const jwk = adone.crypto.pki.privateKeyToJwk(key);
    return supportedKeys.rsa.fromJwk(jwk);
};
