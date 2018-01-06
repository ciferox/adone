const forge = require("node-forge");
const asn1 = forge.asn1;

/**
 * Converts a PEM-encoded EncryptedPrivateKeyInfo to ASN.1 format. Decryption
 * is not performed.
 *
 * @param pem the EncryptedPrivateKeyInfo in PEM-format.
 *
 * @return the ASN.1 EncryptedPrivateKeyInfo.
 */
export default function encryptedPrivateKeyFromPem(pem) {
    const msg = forge.pem.decode(pem)[0];

    if (msg.type !== "ENCRYPTED PRIVATE KEY") {
        const error = new Error('Could not convert encrypted private key from PEM; PEM header type is "ENCRYPTED PRIVATE KEY".');
        error.headerType = msg.type;
        throw error;
    }
    if (msg.procType && msg.procType.type === "ENCRYPTED") {
        throw new Error("Could not convert encrypted private key from PEM; " +
        "PEM is encrypted.");
    }

    // convert DER to ASN.1 object
    return asn1.fromDer(msg.body);
}
