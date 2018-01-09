const {
    is,
    crypto
} = adone;

const hash = (md, bytes) => md.start().update(bytes).digest().toString("binary");

/**
 * OpenSSL's legacy key derivation function.
 *
 * See: http://www.openssl.org/docs/crypto/EVP_BytesToKey.html
 *
 * @param password the password to derive the key from.
 * @param salt the salt to use, null for none.
 * @param dkLen the number of bytes needed for the derived key.
 * @param [options] the options to use:
 *          [md] an optional message digest object to use.
 */
export default function opensslDeriveBytes(password, salt, dkLen, md) {
    if (is.nil(md)) {
        if (!("md5" in crypto.md)) {
            throw new Error('"md5" hash algorithm unavailable.');
        }
        md = crypto.md.md5.create();
    }
    if (is.buffer(salt)) {
        salt = salt.toString("binary");
    }
    if (is.null(salt)) {
        salt = "";
    }
    const digests = [hash(md, password + salt)];
    for (let length = 16, i = 1; length < dkLen; ++i, length += 16) {
        digests.push(hash(md, digests[i - 1] + password + salt));
    }
    return Buffer.from(digests.join("").substr(0, dkLen), "binary");
}
