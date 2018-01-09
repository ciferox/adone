const {
    crypto,
    collection
} = adone;

/**
 * Encodes a message using PKCS#1 v1.5 padding.
 *
 * @param {Buffer} m the message to encode.
 * @param key the RSA key to use.
 * @param {number} bt the block type to use, i.e. either 0x01 (for signing) or 0x02 (for encryption).
 * @return the padded byte buffer.
 */
export default function encodePKCS1v1(m, key, bt) {
    // get the length of the modulus in bytes
    const k = Math.ceil(key.n.bitLength() / 8);

    /* use PKCS#1 v1.5 padding */
    if (m.length > (k - 11)) {
        const error = new Error("Message is too long for PKCS#1 v1.5 padding.");
        error.length = m.length;
        error.max = k - 11;
        throw error;
    }

    /**
     * A block type BT, a padding string PS, and the data D shall be
     * formatted into an octet string EB, the encryption block:
     *
     * EB = 00 || BT || PS || 00 || D
     *
     * The block type BT shall be a single octet indicating the structure of
     * the encryption block. For this version of the document it shall have
     * value 00, 01, or 02. For a private-key operation, the block type
     * shall be 00 or 01. For a public-key operation, it shall be 02.
     *
     * The padding string PS shall consist of k-3-||D|| octets. For block
     * type 00, the octets shall have value 00; for block type 01, they
     * shall have value FF; and for block type 02, they shall be
     * pseudorandomly generated and nonzero. This makes the length of the
     */

    const eb = new collection.ByteArray();

    // build the encryption block
    eb.writeUInt8(0x00);
    eb.writeUInt8(bt);

    // create the padding
    let padNum = k - 3 - m.length;
    let padByte;
    // private key op
    if (bt === 0x00 || bt === 0x01) {
        padByte = (bt === 0x00) ? 0x00 : 0xFF;
        for (let i = 0; i < padNum; ++i) {
            eb.writeUInt8(padByte);
        }
    } else {
        // public key op
        // pad with random non-zero values
        while (padNum > 0) {
            let numZeros = 0;
            const padBytes = crypto.random.getBytesSync(padNum);
            for (let i = 0; i < padNum; ++i) {
                padByte = padBytes[i];
                if (padByte === 0) {
                    ++numZeros;
                } else {
                    eb.writeUInt8(padByte);
                }
            }
            padNum = numZeros;
        }
    }

    // zero followed by message
    eb.writeUInt8(0x00);
    eb.writeBuffer(m);

    return eb.flip().toBuffer();
}
