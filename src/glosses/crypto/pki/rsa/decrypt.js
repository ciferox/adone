const {
    math: { BigNumber }
} = adone;

const __ = adone.private(adone.crypto.pki.rsa);

/**
 * NOTE: THIS METHOD IS DEPRECATED, use 'decrypt' on a private key object or
 * 'verify' on a public key object instead.
 *
 * Performs RSA decryption.
 *
 * The parameter ml controls whether to apply PKCS#1 v1.5 padding
 * or not.  Set ml = false to disable padding removal completely
 * (in order to handle e.g. EMSA-PSS later on) and simply pass back
 * the RSA encryption block.
 *
 * @param {Buffer} ed the encrypted data to decrypt in as a byte string.
 * @param key the RSA key to use.
 * @param pub true for a public key operation, false for private.
 * @param ml the message length, if known, false to disable padding.
 *
 * @return {Buffer} the decrypted message
 */
export default function decrypt(ed, key, pub, ml) {
    // get the length of the modulus in bytes
    const k = Math.ceil(key.n.bitLength() / 8);

    // error if the length of the encrypted data ED is not k
    if (ed.length !== k) {
        const error = new Error("Encrypted message length is invalid.");
        error.length = ed.length;
        error.expected = k;
        throw error;
    }

    // convert encrypted data into a big integer
    // FIXME: hex conversion inefficient, get BigInteger w/byte strings
    const y = BigNumber.fromBuffer(ed);

    // y must be less than the modulus or it wasn't the result of
    // a previous mod operation (encryption) using that modulus
    if (y.cmp(key.n) >= 0) {
        throw new Error("Encrypted message is invalid.");
    }

    // do RSA decryption
    const x = __.modPow(y, key, pub);

    // create the encryption block, if x is shorter in bytes than k, then
    // prepend zero bytes to fill up eb
    // FIXME: hex conversion inefficient, get BigInteger w/byte strings
    const eb = new adone.collection.ByteArray();
    let zeros = k - Math.ceil(x.bitLength() / 8);
    while (zeros > 0) {
        eb.writeUInt8(0x00);
        --zeros;
    }
    eb.writeBuffer(x.toBuffer());

    const res = eb.flip().toBuffer();

    if (ml !== false) {
        // legacy, default to PKCS#1 v1.5 padding
        return __.decodePKCSv15(res, key, pub);
    }

    // return message
    return res;
}

