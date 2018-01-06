const {
    crypto: { pki }
} = adone;

const __ = adone.private(pki);

const forge = require("node-forge");
const asn1 = forge.asn1;

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
    const cri = asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
        // version
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.INTEGER, false,
            asn1.integerToDer(csr.version).getBytes()),
        // subject
        __.dnToAsn1(csr.subject),
        // SubjectPublicKeyInfo
        pki.publicKeyToAsn1(csr.publicKey),
        // attributes
        __.CRIAttributesToAsn1(csr)
    ]);

    return cri;
};
