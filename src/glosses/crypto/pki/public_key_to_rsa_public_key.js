const {
    crypto: { pki }
} = adone;

const __ = adone.private(pki);

const forge = require("node-forge");
const asn1 = forge.asn1;

/**
 * Converts a public key to an ASN.1 RSAPublicKey.
 *
 * @param key the public key.
 *
 * @return the asn1 representation of a RSAPublicKey.
 */
export default function publicKeyToRSAPublicKey(key) {
    // RSAPublicKey
    return asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
        // modulus (n)
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.INTEGER, false, __.bnToBytes(key.n)),
        // publicExponent (e)
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.INTEGER, false, __.bnToBytes(key.e))
    ]);
}
