const {
    crypto: {
        pki,
        pem,
        asn1
    }
} = adone;

/**
 * Converts a PKCS#10 certification request (CSR) from PEM format.
 *
 * Note: If the certification request is to be verified then compute hash
 * should be set to true. This will scan the CertificationRequestInfo part of
 * the ASN.1 object while it is converted so it doesn't need to be converted
 * back to ASN.1-DER-encoding later.
 *
 * @param _pem the PEM-formatted certificate.
 * @param computeHash true to compute the hash for verification.
 * @param strict true to be strict when checking ASN.1 value lengths, false to
 *          allow truncated values (default: true).
 *
 * @return the certification request (CSR).
 */
export default function certificationRequestFromPem(_pem, computeHash, strict) {
    const msg = pem.decode(_pem)[0];

    if (msg.type !== "CERTIFICATE REQUEST") {
        const error = new Error('Could not convert certification request from PEM; PEM header type is not "CERTIFICATE REQUEST".');
        error.headerType = msg.type;
        throw error;
    }
    if (msg.procType && msg.procType.type === "ENCRYPTED") {
        throw new Error("Could not convert certification request from PEM; PEM is encrypted.");
    }

    // convert DER to ASN.1 object
    const buf = adone.util.bufferToArrayBuffer(Buffer.from(msg.body, "binary"));
    const obj = asn1.fromBER(buf).result;

    return pki.certificationRequestFromAsn1(obj, computeHash);
}
