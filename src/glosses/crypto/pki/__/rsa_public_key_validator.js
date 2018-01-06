const {
    crypto: { asn1 }
} = adone;

// validator for an RSA public key
export default new asn1.Sequence({
    // RSAPublicKey
    value: [
        new asn1.Integer({
            // modulus (n)
            name: "publicKeyModulus"
        }),
        new asn1.Integer({
            // publicExponent (e)
            name: "publicKeyExponent"
        })
    ]
});
