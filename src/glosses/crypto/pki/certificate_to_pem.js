const {
    crypto: {
        pki,
        pem
    }
} = adone;

/**
 * Converts an X.509 certificate to PEM format.
 *
 * @param cert the certificate.
 * @param maxline the maximum characters per line, defaults to 64.
 *
 * @return the PEM-formatted certificate.
 */
export default function certificateToPem(cert, maxline) {
    // convert to ASN.1, then DER, then PEM-encode
    const msg = {
        type: "CERTIFICATE",
        body: Buffer.from(pki.certificateToAsn1(cert).toBER()).toString("binary")
    };
    return pem.encode(msg, { maxline });
}
