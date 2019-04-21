const {
    crypto: {
        pki,
        asn1
    }
} = adone;

const __ = adone.getPrivate(pki);

/**
 * Gets the ASN.1 TBSCertificate part of an X.509v3 certificate.
 *
 * @param cert the certificate.
 *
 * @return the asn1 TBSCertificate.
 */
export default function getTBSCertificate(cert) {
    // TBSCertificate
    const tbs = new asn1.Sequence({
        value: [
            // version
            new asn1.Constructed({
                idBlock: {
                    tagClass: 3, // CONTEXT_SPECIFIC
                    tagNumber: 0
                },
                value: [
                    new asn1.Integer({
                        value: cert.version
                    })
                ]
            }),
            // serialNumber
            new asn1.Integer({
                valueHex: adone.util.buffer.toArrayBuffer(Buffer.from(cert.serialNumber, "hex"))
            }),
            // signature
            new asn1.Sequence({
                value: [
                    // algorithm
                    new asn1.ObjectIdentifier({
                        value: cert.siginfo.algorithmOid
                    }),
                    __.signatureParametersToAsn1(cert.siginfo.algorithmOid, cert.siginfo.parameters)
                ]
            }),
            // issuer
            __.dnToAsn1(cert.issuer),
            // validity
            new asn1.Sequence({
                value: [
                    // notBefore
                    new asn1.UTCTime({
                        valueDate: cert.validity.notBefore
                    }),
                    // notAfter
                    new asn1.UTCTime({
                        valueDate: cert.validity.notAfter
                    })
                ]
            }),
            // subject
            __.dnToAsn1(cert.subject),
            // SubjectPublicKeyInfo
            pki.publicKeyToAsn1(cert.publicKey)
        ]
    });

    if (cert.issuer.uniqueId) {
        // issuerUniqueID (optional)
        tbs.valueBlock.value.push(
            new asn1.Constructed({
                idBlock: {
                    tagClass: 3, // CONTEXT_SPECIFIC
                    tagNumber: 1
                },
                value: [
                    new asn1.BitString({
                        valueHex: adone.util.buffer.toArrayBuffer(cert.issuer.uniqueId)
                    })
                ]
            })
        );
    }
    if (cert.subject.uniqueId) {
        // subjectUniqueID (optional)
        tbs.valueBlock.value.push(
            new asn1.Constructed({
                idBlock: {
                    tagClass: 3, // CONTEXT_SPECIFIC
                    tagNumber: 2
                },
                value: [
                    new asn1.BitString({
                        valueHex: adone.util.buffer.toArrayBuffer(cert.subject.uniqueId)
                    })
                ]
            })
        );
    }

    if (cert.extensions.length > 0) {
        // extensions (optional)
        tbs.valueBlock.value.push(pki.certificateExtensionsToAsn1(cert.extensions));
    }

    return tbs;
}

