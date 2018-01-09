const {
    crypto: {
        pki,
        pem
    }
} = adone;

/**
 * Converts an RSA public key to PEM format (using an RSAPublicKey).
 *
 * @param key the public key.
 * @param maxline the maximum characters per line, defaults to 64.
 *
 * @return the PEM-formatted public key.
 */
export default function publicKeyToRSAPublicKeyPem(key, maxline) {
    // convert to ASN.1, then DER, then PEM-encode
    const msg = {
        type: "RSA PUBLIC KEY",
        body: Buffer.from(pki.publicKeyToRSAPublicKey(key).toBER())
    };
    return pem.encode(msg, { maxline });
}
