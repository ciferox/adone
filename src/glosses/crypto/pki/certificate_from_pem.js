const {
    crypto: {
        pki,
        asn1,
        pem
    }
} = adone;

/**
 * Converts an X.509 certificate from PEM format.
 *
 * Note: If the certificate is to be verified then compute hash should
 * be set to true. This will scan the TBSCertificate part of the ASN.1
 * object while it is converted so it doesn't need to be converted back
 * to ASN.1-DER-encoding later.
 *
 * @param _pem the PEM-formatted certificate.
 * @param computeHash true to compute the hash for verification.
 *
 * @return the certificate.
 */
export default function certificateFromPem(_pem, computeHash) {
    const msg = pem.decode(_pem)[0];

    if (
        msg.type !== "CERTIFICATE"
        && msg.type !== "X509 CERTIFICATE"
        && msg.type !== "TRUSTED CERTIFICATE"
    ) {
        const error = new Error('Could not convert certificate from PEM; PEM header type is not "CERTIFICATE", "X509 CERTIFICATE", or "TRUSTED CERTIFICATE".');
        error.headerType = msg.type;
        throw error;
    }
    if (msg.procType && msg.procType.type === "ENCRYPTED") {
        throw new Error("Could not convert certificate from PEM; PEM is encrypted.");
    }

    // convert DER to ASN.1 object
    const buf = adone.util.buffer.toArrayBuffer(msg.body);
    const obj = asn1.fromBER(buf).result;

    return pki.certificateFromAsn1(obj, computeHash);
}
