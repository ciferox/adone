const {
    math: { BigNumber }
} = adone;

const __ = adone.private(adone.crypto.pki.rsa);

/**
 * NOTE: THIS METHOD IS DEPRECATED, use 'sign' on a private key object or
 * 'encrypt' on a public key object instead.
 *
 * Performs RSA encryption.
 *
 * The parameter bt controls whether to put padding bytes before the
 * message passed in. Set bt to either true or false to disable padding
 * completely (in order to handle e.g. EMSA-PSS encoding seperately before),
 * signaling whether the encryption operation is a public key operation
 * (i.e. encrypting data) or not, i.e. private key operation (data signing).
 *
 * For PKCS#1 v1.5 padding pass in the block type to use, i.e. either 0x01
 * (for signing) or 0x02 (for encryption). The key operation mode (private
 * or public) is derived from this flag in that case).
 *
 * @param {Buffer} m the message to encrypt
 * @param key the RSA key to use.
 * @param bt for PKCS#1 v1.5 padding, the block type to use
 *   (0x01 for private key, 0x02 for public),
 *   to disable padding: true = public key, false = private key.
 *
 * @return {Buffer} the encrypted bytes
 */
export default function encrypt(m, key, bt) {
    let pub = bt;
    let eb;

    // get the length of the modulus in bytes
    const k = Math.ceil(key.n.bitLength() / 8);

    if (bt !== false && bt !== true) {
        // legacy, default to PKCS#1 v1.5 padding
        pub = bt === 0x02;
        eb = __.encodePKCS1v15(m, key, bt);
    } else {
        eb = m;
    }

    // load encryption block as big integer 'x'
    // FIXME: hex conversion inefficient, get BigInteger w/byte strings
    const x = BigNumber.fromBuffer(eb);

    // do RSA encryption
    const y = __.modPow(x, key, pub);

    // convert y into the encrypted data byte string, if y is shorter in
    // bytes than k, then prepend zero bytes to fill up ed
    // FIXME: hex conversion inefficient, get BigInteger w/byte strings
    const ed = new adone.collection.ByteArray();
    let zeros = k - Math.ceil(y.bitLength() / 8);
    while (zeros > 0) {
        ed.writeUInt8(0x00);
        --zeros;
    }
    ed.writeBuffer(y.toBuffer());

    return ed.toBuffer();
}
