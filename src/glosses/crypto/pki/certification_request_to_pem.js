const {
    crypto: {
        pki,
        pem
    }
} = adone;

/**
 * Converts a PKCS#10 certification request (CSR) to PEM format.
 *
 * @param csr the certification request.
 * @param maxline the maximum characters per line, defaults to 64.
 *
 * @return the PEM-formatted certification request.
 */
export default function certificationRequestToPem(csr, maxline) {
    // convert to ASN.1, then DER, then PEM-encode
    const msg = {
        type: "CERTIFICATE REQUEST",
        body: Buffer.from(pki.certificationRequestToAsn1(csr).toBER()).toString("binary")
    };
    return pem.encode(msg, { maxline });
}
