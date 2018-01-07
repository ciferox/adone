const {
    crypto: {
        pem,
        asn1
    }
} = adone;

/**
 * Converts a PEM-encoded EncryptedPrivateKeyInfo to ASN.1 format. Decryption
 * is not performed.
 *
 * @param _pem the EncryptedPrivateKeyInfo in PEM-format.
 *
 * @return the ASN.1 EncryptedPrivateKeyInfo.
 */
export default function encryptedPrivateKeyFromPem(_pem) {
    const msg = pem.decode(_pem)[0];

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
    return asn1.fromBER(adone.util.bufferToArrayBuffer(Buffer.from(msg.body, "binary")));
}
