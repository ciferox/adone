const {
    crypto: {
        pki,
        asn1
    }
} = adone;

/**
 * Converts a public key to an ASN.1 SubjectPublicKeyInfo.
 *
 * @param key the public key.
 *
 * @return the asn1 representation of a SubjectPublicKeyInfo.
 */
export default function publicKeyToAsn1(key) {
    // SubjectPublicKeyInfo
    return new asn1.Sequence({
        value: [
            new asn1.Sequence({
                value: [
                    // AlgorithmIdentifier
                    new asn1.ObjectIdentifier({
                        value: pki.oids.rsaEncryption
                    }),
                    new asn1.Null()
                ]
            }),
            new asn1.BitString({
                valueHex: pki.publicKeyToRSAPublicKey(key).toBER()
            })
        ]
    });
}
