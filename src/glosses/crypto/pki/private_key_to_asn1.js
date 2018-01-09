const {
    crypto: {
        asn1,
        pki
    }
} = adone;

const __ = adone.private(pki);

const tobuf = (bn) => {
    return adone.util.buffer.toArrayBuffer(__.bnToBytes(bn));
};

/**
 * Converts a private key to an ASN.1 RSAPrivateKey.
 *
 * @param key the private key.
 *
 * @return the ASN.1 representation of an RSAPrivateKey.
 */
export default function privateKeyToAsn1(key) {
    return new asn1.Sequence({
        value: [
            // version (0 = only 2 primes, 1 multiple primes)
            new asn1.Integer({
                value: 0
            }),
            // modulus (n)
            new asn1.Integer({
                valueHex: tobuf(key.n)
            }),
            // publicExponent (e)
            new asn1.Integer({
                valueHex: tobuf(key.e)
            }),
            // privateExponent (d)
            new asn1.Integer({
                valueHex: tobuf(key.d)
            }),
            // privateKeyPrime1 (p)
            new asn1.Integer({
                valueHex: tobuf(key.p)
            }),
            // privateKeyPrime2 (q)
            new asn1.Integer({
                valueHex: tobuf(key.q)
            }),
            // privateKeyExponent1 (dP)
            new asn1.Integer({
                valueHex: tobuf(key.dP)
            }),
            // privateKeyExponent2 (dQ)
            new asn1.Integer({
                valueHex: tobuf(key.dQ)
            }),
            // coefficient (qInv)
            new asn1.Integer({
                valueHex: tobuf(key.qInv)
            })
        ]
    });
}
