const {
    crypto: {
        pki,
        asn1
    }
} = adone;

const __ = adone.private(pki);

const tobuf = (bn) => {
    return adone.util.buffer.toArrayBuffer(__.bnToBytes(bn));
};

/**
 * Converts a public key to an ASN.1 RSAPublicKey.
 *
 * @param key the public key.
 *
 * @return the asn1 representation of a RSAPublicKey.
 */
export default function publicKeyToRSAPublicKey(key) {
    // RSAPublicKey
    return new asn1.Sequence({
        value: [
            // modulus (n)
            new asn1.Integer({
                valueHex: tobuf(key.n)
            }),
            // publicExponent (e)
            new asn1.Integer({
                valueHex: tobuf(key.e)
            })
        ]
    });
}
