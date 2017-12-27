const {
    std: { crypto }
} = adone;

const curves = {
    "P-256": "prime256v1",
    "P-384": "secp384r1",
    "P-521": "secp521r1"
};

exports.generateEphmeralKeyPair = function (curve) {
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
