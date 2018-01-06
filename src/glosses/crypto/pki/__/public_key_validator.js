const {
    crypto: { asn1 }
} = adone;

// validator for an SubjectPublicKeyInfo structure
// Note: Currently only works with an RSA public key
export default new asn1.Sequence({
    name: "subjectPublicKeyInfo",
    value: [
        new asn1.Sequence({
            value: [
                new asn1.ObjectIdentifier({
                    name: "publicKeyOid"
                })
            ]
        }),
        new asn1.BitString({
            // subjectPublicKey
            value: [
                new asn1.Sequence({
                    // RSAPublicKey
                    optional: true,
                    name: "rsaPublicKey"
                })
            ]
        })
    ]
});
