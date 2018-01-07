const {
    crypto: { pki }
} = adone;

const forge = require("node-forge");

/**
 * Encrypts an RSA private key. By default, the key will be wrapped in
 * a PrivateKeyInfo and encrypted to produce a PKCS#8 EncryptedPrivateKeyInfo.
 * This is the standard, preferred way to encrypt a private key.
 *
 * To produce a non-standard PEM-encrypted private key that uses encapsulated
 * headers to indicate the encryption algorithm (old-style non-PKCS#8 OpenSSL
 * private key encryption), set the 'legacy' option to true. Note: Using this
 * option will cause the iteration count to be forced to 1.
 *
 * Note: The 'des' algorithm is supported, but it is not considered to be
 * secure because it only uses a single 56-bit key. If possible, it is highly
 * recommended that a different algorithm be used.
 *
 * @param rsaKey the RSA key to encrypt.
 * @param password the password to use.
 * @param options:
 *          algorithm: the encryption algorithm to use
 *            ('aes128', 'aes192', 'aes256', '3des', 'des').
 *          count: the iteration count to use.
 *          saltSize: the salt size to use.
 *          legacy: output an old non-PKCS#8 PEM-encrypted+encapsulated
 *            headers (DEK-Info) private key.
 *
 * @return the PEM-encoded ASN.1 EncryptedPrivateKeyInfo.
 */
export default function encryptRsaPrivateKey(rsaKey, password, options) {
    // standard PKCS#8
    options = options || {};
    if (!options.legacy) {
        // encrypt PrivateKeyInfo
        let rval = pki.wrapRsaPrivateKey(pki.privateKeyToAsn1(rsaKey));
        rval = pki.encryptPrivateKeyInfo(rval, password, options);
        return pki.encryptedPrivateKeyToPem(rval);
    }

    // legacy non-PKCS#8
    let algorithm;
    let iv;
    let dkLen;
    let cipherFn;
    switch (options.algorithm) {
        case "aes128":
            algorithm = "AES-128-CBC";
            dkLen = 16;
            iv = forge.random.getBytesSync(16);
            cipherFn = forge.aes.createEncryptionCipher;
            break;
        case "aes192":
            algorithm = "AES-192-CBC";
            dkLen = 24;
            iv = forge.random.getBytesSync(16);
            cipherFn = forge.aes.createEncryptionCipher;
            break;
        case "aes256":
            algorithm = "AES-256-CBC";
            dkLen = 32;
            iv = forge.random.getBytesSync(16);
            cipherFn = forge.aes.createEncryptionCipher;
            break;
        case "3des":
            algorithm = "DES-EDE3-CBC";
            dkLen = 24;
            iv = forge.random.getBytesSync(8);
            cipherFn = forge.des.createEncryptionCipher;
            break;
        case "des":
            algorithm = "DES-CBC";
            dkLen = 8;
            iv = forge.random.getBytesSync(8);
            cipherFn = forge.des.createEncryptionCipher;
            break;
        default: {
            const error = new Error(`Could not encrypt RSA private key; unsupported encryption algorithm ${options.algorithm}".`);
            error.algorithm = options.algorithm;
            throw error;
        }
    }

    // encrypt private key using OpenSSL legacy key derivation
    const dk = forge.pbe.opensslDeriveBytes(password, iv.substr(0, 8), dkLen);
    const cipher = cipherFn(dk);
    cipher.start(iv);
    cipher.update(forge.util.createBuffer(Buffer.from(pki.privateKeyToAsn1(rsaKey).toBER()).toString("binary")));
    cipher.finish();

    const msg = {
        type: "RSA PRIVATE KEY",
        procType: {
            version: "4",
            type: "ENCRYPTED"
        },
        dekInfo: {
            algorithm,
            parameters: forge.util.bytesToHex(iv).toUpperCase()
        },
        body: cipher.output.getBytes()
    };
    return forge.pem.encode(msg);
}
