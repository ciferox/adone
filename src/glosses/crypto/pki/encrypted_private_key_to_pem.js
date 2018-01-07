const {
    crypto: {
        pem
    }
} = adone;

/**
 * Converts a EncryptedPrivateKeyInfo to PEM format.
 *
 * @param epki the EncryptedPrivateKeyInfo.
 * @param maxline the maximum characters per line, defaults to 64.
 *
 * @return the PEM-formatted encrypted private key.
 */
export default function encryptedPrivateKeyToPem(epki, maxline) {
    // convert to DER, then PEM-encode
    const msg = {
        type: "ENCRYPTED PRIVATE KEY",
        body: Buffer.from(epki.toBER()).toString("binary")
    };
    return pem.encode(msg, { maxline });
}
