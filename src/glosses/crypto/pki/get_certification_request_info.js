const {
    crypto: {
        pki,
        asn1
    }
} = adone;

const __ = adone.getPrivate(pki);

/**
 * Gets the ASN.1 CertificationRequestInfo part of a
 * PKCS#10 CertificationRequest.
 *
 * @param csr the certification request.
 *
 * @return the asn1 CertificationRequestInfo.
 */
export default function getCertificationRequestInfo(csr) {
    // CertificationRequestInfo
    return new asn1.Sequence({
        value: [
            // version
            new asn1.Integer({
                value: csr.version
            }),
            // subject
            __.dnToAsn1(csr.subject),
            // SubjectPublicKeyInfo
            pki.publicKeyToAsn1(csr.publicKey),
            // attributes
            __.CRIAttributesToAsn1(csr)
        ]
    });
}
