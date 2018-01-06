const {
    math: { BigNumber }
} = adone;

const __ = adone.private(adone.crypto.pki.rsa);

const forge = require("node-forge");

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
 * @param ed the encrypted data to decrypt in as a byte string.
 * @param key the RSA key to use.
 * @param pub true for a public key operation, false for private.
 * @param ml the message length, if known, false to disable padding.
 *
 * @return the decrypted message as a byte string.
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
    const y = BigNumber.fromBuffer(Buffer.from(forge.util.createBuffer(ed).toHex(), "hex"));

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
    const xhex = x.toString(16);
    const eb = forge.util.createBuffer();
    let zeros = k - Math.ceil(xhex.length / 2);
    while (zeros > 0) {
        eb.putByte(0x00);
        --zeros;
    }
    eb.putBytes(forge.util.hexToBytes(xhex));

    if (ml !== false) {
        // legacy, default to PKCS#1 v1.5 padding
        return __.decodePKCSv15(eb.getBytes(), key, pub);
    }

    // return message
    return eb.getBytes();
}

