const {
    crypto: { pki }
} = adone;
const __ = adone.private(pki);

const forge = require("node-forge");
const asn1 = forge.asn1;

/**
 * Converts a PKCS#10 certification request to an ASN.1 object.
 *
 * @param csr the certification request.
 *
 * @return the asn1 representation of a certification request.
 */
export default function certificationRequestToAsn1(csr) {
    // prefer cached CertificationRequestInfo over generating one
    const cri = csr.certificationRequestInfo ||
      pki.getCertificationRequestInfo(csr);

    // Certificate
    return asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
        // CertificationRequestInfo
        cri,
        // AlgorithmIdentifier (signature algorithm)
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
        // algorithm
            asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OID, false,
                asn1.oidToDer(csr.signatureOid).getBytes()),
            // parameters
            __.signatureParametersToAsn1(csr.signatureOid, csr.signatureParameters)
        ]),
        // signature
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.BITSTRING, false,
            String.fromCharCode(0x00) + csr.signature)
    ]);
}
