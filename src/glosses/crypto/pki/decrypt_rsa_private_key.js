const {
    is,
    crypto: {
        pki,
        asn1
    }
} = adone;

const forge = require("node-forge");

/**
 * Decrypts an RSA private key.
 *
 * @param pem the PEM-formatted EncryptedPrivateKeyInfo to decrypt.
 * @param password the password to use.
 *
 * @return the RSA key on success, null on failure.
 */
export default function decryptRsaPrivateKey(pem, password) {
    let rval = null;

    const msg = forge.pem.decode(pem)[0];

    if (msg.type !== "ENCRYPTED PRIVATE KEY" &&
      msg.type !== "PRIVATE KEY" &&
      msg.type !== "RSA PRIVATE KEY") {
        const error = new Error('Could not convert private key from PEM; PEM header type is not "ENCRYPTED PRIVATE KEY", "PRIVATE KEY", or "RSA PRIVATE KEY".');
        error.headerType = error;
        throw error;
    }

    if (msg.procType && msg.procType.type === "ENCRYPTED") {
        let dkLen;
        let cipherFn;
        switch (msg.dekInfo.algorithm) {
            case "DES-CBC":
                dkLen = 8;
                cipherFn = forge.des.createDecryptionCipher;
                break;
            case "DES-EDE3-CBC":
                dkLen = 24;
                cipherFn = forge.des.createDecryptionCipher;
                break;
            case "AES-128-CBC":
                dkLen = 16;
                cipherFn = forge.aes.createDecryptionCipher;
                break;
            case "AES-192-CBC":
                dkLen = 24;
                cipherFn = forge.aes.createDecryptionCipher;
                break;
            case "AES-256-CBC":
                dkLen = 32;
                cipherFn = forge.aes.createDecryptionCipher;
                break;
            case "RC2-40-CBC":
                dkLen = 5;
                cipherFn = function (key) {
                    return forge.rc2.createDecryptionCipher(key, 40);
                };
                break;
            case "RC2-64-CBC":
                dkLen = 8;
                cipherFn = function (key) {
                    return forge.rc2.createDecryptionCipher(key, 64);
                };
                break;
            case "RC2-128-CBC":
                dkLen = 16;
                cipherFn = function (key) {
                    return forge.rc2.createDecryptionCipher(key, 128);
                };
                break;
            default: {
                const error = new Error(`Could not decrypt private key; unsupported encryption algorithm  ${msg.dekInfo.algorithm}".`);
                error.algorithm = msg.dekInfo.algorithm;
                throw error;
            }
        }

        // use OpenSSL legacy key derivation
        const iv = forge.util.hexToBytes(msg.dekInfo.parameters);
        const dk = forge.pbe.opensslDeriveBytes(password, iv.substr(0, 8), dkLen);
        const cipher = cipherFn(dk);
        cipher.start(iv);
        cipher.update(forge.util.createBuffer(msg.body));
        if (cipher.finish()) {
            rval = cipher.output.getBytes();
        } else {
            return rval;
        }
    } else {
        rval = msg.body;
    }

    const buf = adone.util.bufferToArrayBuffer(Buffer.from(rval, "binary"));
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
