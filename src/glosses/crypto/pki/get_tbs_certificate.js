const {
    crypto: { pki }
} = adone;

const __ = adone.private(pki);

const forge = require("node-forge");
const asn1 = forge.asn1;

/**
 * Gets the ASN.1 TBSCertificate part of an X.509v3 certificate.
 *
 * @param cert the certificate.
 *
 * @return the asn1 TBSCertificate.
 */
export default function getTBSCertificate(cert) {
    // TBSCertificate
    const tbs = asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
        // version
        asn1.create(asn1.Class.CONTEXT_SPECIFIC, 0, true, [
        // integer
            asn1.create(asn1.Class.UNIVERSAL, asn1.Type.INTEGER, false,
                asn1.integerToDer(cert.version).getBytes())
        ]),
        // serialNumber
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.INTEGER, false,
            forge.util.hexToBytes(cert.serialNumber)),
        // signature
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
        // algorithm
            asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OID, false,
                asn1.oidToDer(cert.siginfo.algorithmOid).getBytes()),
            // parameters
            __.signatureParametersToAsn1(
                cert.siginfo.algorithmOid, cert.siginfo.parameters)
        ]),
        // issuer
        __.dnToAsn1(cert.issuer),
        // validity
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
        // notBefore
            asn1.create(asn1.Class.UNIVERSAL, asn1.Type.UTCTIME, false,
                asn1.dateToUtcTime(cert.validity.notBefore)),
            // notAfter
            asn1.create(asn1.Class.UNIVERSAL, asn1.Type.UTCTIME, false,
                asn1.dateToUtcTime(cert.validity.notAfter))
        ]),
        // subject
        __.dnToAsn1(cert.subject),
        // SubjectPublicKeyInfo
        pki.publicKeyToAsn1(cert.publicKey)
    ]);

    if (cert.issuer.uniqueId) {
        // issuerUniqueID (optional)
        tbs.value.push(
            asn1.create(asn1.Class.CONTEXT_SPECIFIC, 1, true, [
                asn1.create(asn1.Class.UNIVERSAL, asn1.Type.BITSTRING, false,
                    // TODO: support arbitrary bit length ids
                    String.fromCharCode(0x00) +
            cert.issuer.uniqueId
                )
            ])
        );
    }
    if (cert.subject.uniqueId) {
        // subjectUniqueID (optional)
        tbs.value.push(
            asn1.create(asn1.Class.CONTEXT_SPECIFIC, 2, true, [
                asn1.create(asn1.Class.UNIVERSAL, asn1.Type.BITSTRING, false,
                    // TODO: support arbitrary bit length ids
                    String.fromCharCode(0x00) +
            cert.subject.uniqueId
                )
            ])
        );
    }

    if (cert.extensions.length > 0) {
        // extensions (optional)
        tbs.value.push(pki.certificateExtensionsToAsn1(cert.extensions));
    }

    return tbs;
}

