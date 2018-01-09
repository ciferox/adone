const {
    is
} = adone;

/**
 * Decodes a message using PKCS#1 v1.5 padding.
 *
 * @param {Buffer} eb the message to decode.
 * @param key the RSA key to use.
 * @param pub true if the key is a public key, false if it is private.
 * @param ml the message length, if specified.
 *
 * @return the decoded bytes.
 */
export default function decodePKCS1v15(eb, key, pub, ml) {
    // get the length of the modulus in bytes
    const k = Math.ceil(key.n.bitLength() / 8);

    /**
     * It is an error if any of the following conditions occurs:
     *
     * 1. The encryption block EB cannot be parsed unambiguously.
     * 2. The padding string PS consists of fewer than eight octets
     * or is inconsisent with the block type BT.
     * 3. The decryption process is a public-key operation and the block
     * type BT is not 00 or 01, or the decryption process is a
     * private-key operation and the block type is not 02.
     */

    // parse the encryption block
    let _read = 0;

    const readByte = () => eb[_read++];
    const moveBack = () => --_read;
    const remaining = () => eb.length - _read;
    const getRest = () => eb.slice(_read);

    const first = readByte();
    const bt = readByte();
    if (first !== 0x00 || (pub && bt !== 0x00 && bt !== 0x01) || (!pub && bt !== 0x02) || (pub && bt === 0x00 && is.undefined(ml))) {
        throw new Error("Encryption block is invalid.");
    }

    let padNum = 0;
    if (bt === 0x00) {
        // check all padding bytes for 0x00
        padNum = k - 3 - ml;
        for (let i = 0; i < padNum; ++i) {
            if (readByte() !== 0x00) {
                throw new Error("Encryption block is invalid.");
            }
        }
    } else if (bt === 0x01) {
        // find the first byte that isn't 0xFF, should be after all padding
        padNum = 0;
        while (remaining() > 1) {
            if (readByte() !== 0xFF) {
                moveBack();
                break;
            }
            ++padNum;
        }
    } else if (bt === 0x02) {
        // look for 0x00 byte
        padNum = 0;
        while (remaining() > 1) {
            if (readByte() === 0x00) {
                moveBack();
                break;
            }
            ++padNum;
        }
    }

    // zero must be 0x00 and padNum must be (k - 3 - message length)
    const zero = readByte();
    if (zero !== 0x00 || padNum !== (k - 3 - remaining())) {
        throw new Error("Encryption block is invalid.");
    }

    return getRest();
}
