const {
    crypto: { pki }
} = adone;

const __ = adone.private(pki);

const forge = require("node-forge");
const asn1 = forge.asn1;

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

    // Certificate
    return asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
        // TBSCertificate
        tbsCertificate,
        // AlgorithmIdentifier (signature algorithm)
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
        // algorithm
            asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OID, false,
                asn1.oidToDer(cert.signatureOid).getBytes()),
            // parameters
            __.signatureParametersToAsn1(cert.signatureOid, cert.signatureParameters)
        ]),
        // SignatureValue
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.BITSTRING, false,
            String.fromCharCode(0x00) + cert.signature)
    ]);
}
