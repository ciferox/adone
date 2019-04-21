const {
    crypto: {
        pki,
        asn1
    }
} = adone;

const __ = adone.getPrivate(pki);

/**
 * Converts a PKCS#10 certification request to an ASN.1 object.
 *
 * @param csr the certification request.
 *
 * @return the asn1 representation of a certification request.
 */
export default function certificationRequestToAsn1(csr) {
    // prefer cached CertificationRequestInfo over generating one
    const cri = csr.certificationRequestInfo || pki.getCertificationRequestInfo(csr);

    // Certificate
    const res = new asn1.Sequence({
        value: [
            // CertificationRequestInfo
            cri,
            // AlgorithmIdentifier (signature algorithm)
            new asn1.Sequence({
                value: [
                    // algorithm
                    new asn1.ObjectIdentifier({
                        value: csr.signatureOid
                    }),
                    // parameters
                    __.signatureParametersToAsn1(csr.signatureOid, csr.signatureParameters)
                ]
            }),
            // signature
            new asn1.BitString({
                valueHex: adone.util.buffer.toArrayBuffer(csr.signature)
            })
        ]
    });

    return res;
}
