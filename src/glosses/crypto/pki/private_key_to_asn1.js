const {
    crypto: { pki }
} = adone;

const __ = adone.private(pki);

const forge = require("node-forge");
const asn1 = forge.asn1;

/**
 * Converts a private key to an ASN.1 RSAPrivateKey.
 *
 * @param key the private key.
 *
 * @return the ASN.1 representation of an RSAPrivateKey.
 */
export default function privateKeyToAsn1(key) {
    // RSAPrivateKey
    return asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
        // version (0 = only 2 primes, 1 multiple primes)
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.INTEGER, false,
            asn1.integerToDer(0).getBytes()),
        // modulus (n)
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.INTEGER, false, __.bnToBytes(key.n)),
        // publicExponent (e)
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.INTEGER, false, __.bnToBytes(key.e)),
        // privateExponent (d)
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.INTEGER, false, __.bnToBytes(key.d)),
        // privateKeyPrime1 (p)
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.INTEGER, false, __.bnToBytes(key.p)),
        // privateKeyPrime2 (q)
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.INTEGER, false, __.bnToBytes(key.q)),
        // privateKeyExponent1 (dP)
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.INTEGER, false, __.bnToBytes(key.dP)),
        // privateKeyExponent2 (dQ)
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.INTEGER, false, __.bnToBytes(key.dQ)),
        // coefficient (qInv)
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.INTEGER, false, __.bnToBytes(key.qInv))
    ]);
}
