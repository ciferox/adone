const {
    is,
    crypto: {
        pki,
        asn1,
        pem
    }
} = adone;

/**
 * Decrypts an RSA private key.
 *
 * @param _pem the PEM-formatted EncryptedPrivateKeyInfo to decrypt.
 * @param password the password to use.
 *
 * @return the RSA key on success, null on failure.
 */
export default function decryptRsaPrivateKey(_pem, password) {
    let rval = null;

    const msg = pem.decode(_pem)[0];

    if (
        msg.type !== "ENCRYPTED PRIVATE KEY"
        && msg.type !== "PRIVATE KEY"
        && msg.type !== "RSA PRIVATE KEY"
    ) {
        const error = new Error('Could not convert private key from PEM; PEM header type is not "ENCRYPTED PRIVATE KEY", "PRIVATE KEY", or "RSA PRIVATE KEY".');
        error.headerType = error;
        throw error;
    }

    if (msg.procType && msg.procType.type === "ENCRYPTED") {
        let dkLen;
        switch (msg.dekInfo.algorithm) {
            case "DES-CBC":
                dkLen = 8;
                break;
            case "DES-EDE3-CBC":
                dkLen = 24;
                break;
            case "AES-128-CBC":
                dkLen = 16;
                break;
            case "AES-192-CBC":
                dkLen = 24;
                break;
            case "AES-256-CBC":
                dkLen = 32;
                break;
            case "RC2-40-CBC":
                dkLen = 5;
                break;
            case "RC2-64-CBC":
                dkLen = 8;
                break;
            default: {
                const error = new Error(`Could not decrypt private key; unsupported encryption algorithm  ${msg.dekInfo.algorithm}".`);
                error.algorithm = msg.dekInfo.algorithm;
                throw error;
            }
        }

        // use OpenSSL legacy key derivation
        const iv = Buffer.from(msg.dekInfo.parameters, "hex");
        const dk = pki.pbe.opensslDeriveBytes(password, iv.slice(0, 8), dkLen);
        const cipher = adone.std.crypto.createDecipheriv(msg.dekInfo.algorithm, dk, iv);
        const firstBlock = cipher.update(msg.body);
        const secondBlock = cipher.final();

        rval = Buffer.concat([firstBlock, secondBlock]);
    } else {
        rval = msg.body;
    }

    const buf = adone.util.buffer.toArrayBuffer(rval);
    if (msg.type === "ENCRYPTED PRIVATE KEY") {
        rval = pki.decryptPrivateKeyInfo(asn1.fromBER(buf).result, password);
    } else {
        // decryption already performed above
        rval = asn1.fromBER(buf).result;
    }

    if (!is.null(rval)) {
        rval = pki.privateKeyFromAsn1(rval);
    }

    return rval;
}
