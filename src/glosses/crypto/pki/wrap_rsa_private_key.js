const {
    crypto: {
        pki,
        asn1
    }
} = adone;

/**
 * Wraps an RSAPrivateKey ASN.1 object in an ASN.1 PrivateKeyInfo object.
 *
 * @param rsaKey the ASN.1 RSAPrivateKey.
 *
 * @return the ASN.1 PrivateKeyInfo.
 */
export default function wrapRsaPrivateKey(rsaKey) {
    return new asn1.Sequence({
        value: [
            // version (0)
            new asn1.Integer({
                value: 0
            }),
            // privateKeyAlgorithm
            new asn1.Sequence({
                value: [
                    new asn1.ObjectIdentifier({
                        value: pki.oids.rsaEncryption
                    }),
                    new asn1.Null()
                ]
            }),
            // PrivateKey
            new asn1.OctetString({
                valueHex: rsaKey.toBER()
            })
        ]
    });
}
