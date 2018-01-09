const {
    crypto: {
        pki,
        pem
    }
} = adone;

/**
 * Converts an RSA public key to PEM format (using a SubjectPublicKeyInfo).
 *
 * @param key the public key.
 * @param maxline the maximum characters per line, defaults to 64.
 *
 * @return the PEM-formatted public key.
 */
export default function publicKeyToPem(key, maxline) {
    // convert to ASN.1, then DER, then PEM-encode
    const msg = {
        type: "PUBLIC KEY",
        body: Buffer.from(pki.publicKeyToAsn1(key).toBER())
    };
    return pem.encode(msg, { maxline });
}
