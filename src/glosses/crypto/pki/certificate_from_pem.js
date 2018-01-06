const {
    crypto: { pki }
} = adone;

const forge = require("node-forge");
const asn1 = forge.asn1;

/**
 * Converts an X.509 certificate from PEM format.
 *
 * Note: If the certificate is to be verified then compute hash should
 * be set to true. This will scan the TBSCertificate part of the ASN.1
 * object while it is converted so it doesn't need to be converted back
 * to ASN.1-DER-encoding later.
 *
 * @param pem the PEM-formatted certificate.
 * @param computeHash true to compute the hash for verification.
 * @param strict true to be strict when checking ASN.1 value lengths, false to
 *          allow truncated values (default: true).
 *
 * @return the certificate.
 */
export default function certificateFromPem(pem, computeHash, strict) {
    const msg = forge.pem.decode(pem)[0];

    if (msg.type !== "CERTIFICATE" && msg.type !== "X509 CERTIFICATE" && msg.type !== "TRUSTED CERTIFICATE") {
        const error = new Error('Could not convert certificate from PEM; PEM header type is not "CERTIFICATE", "X509 CERTIFICATE", or "TRUSTED CERTIFICATE".');
        error.headerType = msg.type;
        throw error;
    }
    if (msg.procType && msg.procType.type === "ENCRYPTED") {
        throw new Error("Could not convert certificate from PEM; PEM is encrypted.");
    }

    // convert DER to ASN.1 object
    const obj = asn1.fromDer(msg.body, strict);

    return pki.certificateFromAsn1(obj, computeHash);
}
