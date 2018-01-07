const {
    crypto: {
        pki,
        pem
    }
} = adone;

/**
 * Converts an RSA private key to PEM format.
 *
 * @param key the private key.
 * @param maxline the maximum characters per line, defaults to 64.
 *
 * @return the PEM-formatted private key.
 */
export default function privateKeyToPem(key, maxline) {
    // convert to ASN.1, then DER, then PEM-encode
    const msg = {
        type: "RSA PRIVATE KEY",
        body: Buffer.from(pki.privateKeyToAsn1(key).toBER()).toString("binary")
    };
    return pem.encode(msg, { maxline });
}
