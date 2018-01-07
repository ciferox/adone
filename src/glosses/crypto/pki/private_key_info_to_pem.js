const {
    crypto
} = adone;

/**
 * Converts a PrivateKeyInfo to PEM format.
 *
 * @param pki the PrivateKeyInfo.
 * @param maxline the maximum characters per line, defaults to 64.
 *
 * @return the PEM-formatted private key.
 */
export default function PrivateKeyInfoToPem(pki, maxline) {
    // convert to DER, then PEM-encode
    const msg = {
        type: "PRIVATE KEY",
        body: Buffer.from(pki.toBER()).toString("binary")
    };
    return crypto.pem.encode(msg, { maxline });
}

