const {
    crypto: {
        pki,
        asn1
    }
} = adone;

const __ = adone.private(pki);

/**
 * Converts an X.509v3 RSA certificate to an ASN.1 object.
 *
 * @param cert the certificate.
 *
 * @return the asn1 representation of an X.509v3 RSA certificate.
 */
export default function certificateToAsn1(cert) {
    // prefer cached TBSCertificate over generating one
    const tbsCertificate = cert.tbsCertificate || pki.getTBSCertificate(cert);

    return new asn1.Sequence({
        value: [
            // TBSCertificate
            tbsCertificate,
            // AlgorithmIdentifier (signature algorithm)
            new asn1.Sequence({
                value: [
                    // algorithm
                    new asn1.ObjectIdentifier({
                        value: cert.signatureOid
                    }),
                    // parameters
                    __.signatureParametersToAsn1(cert.signatureOid, cert.signatureParameters)
                ]
            }),
            // SignatureValue
            new asn1.BitString({
                valueHex: adone.util.bufferToArrayBuffer(Buffer.from(cert.signature, "binary"))
            })
        ]
    });
}
