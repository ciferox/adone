const forge = require("node-forge");
const asn1 = forge.asn1;

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
        body: asn1.toDer(epki).getBytes()
    };
    return forge.pem.encode(msg, { maxline });
}
