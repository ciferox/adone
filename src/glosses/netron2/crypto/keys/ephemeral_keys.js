const {
    std: { crypto }
} = adone;

const curves = {
    "P-256": "prime256v1",
    "P-384": "secp384r1",
    "P-521": "secp521r1"
};

const generateEphmeralKeyPair = function (curve) {
    if (!curves[curve]) {
        throw new Error(`Unkown curve: ${curve}`);
    }
    const ecdh = crypto.createECDH(curves[curve]);
    ecdh.generateKeys();

    return {
        key: ecdh.getPublicKey(),
        genSharedKey(theirPub, forcePrivate) {
            if (forcePrivate) {
                ecdh.setPrivateKey(forcePrivate.private);
            }
            
            return ecdh.computeSecret(theirPub);
        }
    };
};


// Generates an ephemeral public key and returns a function that will compute
// the shared secret key.
//
// Focuses only on ECDH now, but can be made more general in the future.
module.exports = (curve) => generateEphmeralKeyPair(curve);
