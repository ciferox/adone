const {
    crypto: { pki }
} = adone;

const forge = require("node-forge");
const asn1 = forge.asn1;

/**
 * Converts a PKCS#10 certification request (CSR) from PEM format.
 *
 * Note: If the certification request is to be verified then compute hash
 * should be set to true. This will scan the CertificationRequestInfo part of
 * the ASN.1 object while it is converted so it doesn't need to be converted
 * back to ASN.1-DER-encoding later.
 *
 * @param pem the PEM-formatted certificate.
 * @param computeHash true to compute the hash for verification.
 * @param strict true to be strict when checking ASN.1 value lengths, false to
 *          allow truncated values (default: true).
 *
 * @return the certification request (CSR).
 */
export default function certificationRequestFromPem(pem, computeHash, strict) {
    const msg = forge.pem.decode(pem)[0];

    if (msg.type !== "CERTIFICATE REQUEST") {
        const error = new Error("Could not convert certification request from PEM; " +
        'PEM header type is not "CERTIFICATE REQUEST".');
        error.headerType = msg.type;
        throw error;
    }
    if (msg.procType && msg.procType.type === "ENCRYPTED") {
        throw new Error("Could not convert certification request from PEM; " +
        "PEM is encrypted.");
    }

    // convert DER to ASN.1 object
    const obj = asn1.fromDer(msg.body, strict);

    return pki.certificationRequestFromAsn1(obj, computeHash);
}
