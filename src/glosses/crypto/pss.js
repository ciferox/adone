const {
    is,
    crypto
} = adone;

/**
 * Javascript implementation of PKCS#1 PSS signature padding.
 */

/**
 * Creates a PSS signature scheme object.
 *
 * There are several ways to provide a salt for encoding:
 *
 * 1. Specify the saltLength only and the built-in PRNG will generate it.
 * 2. Specify the saltLength and a custom PRNG with 'getBytesSync' defined that
 *   will be used.
 * 3. Specify the salt itself as a forge.util.ByteBuffer.
 *
 * @param options the options to use:
 *          md the message digest object to use, a forge md instance.
 *          mgf the mask generation function to use, a forge mgf instance.
 *          [saltLength] the length of the salt in octets.
 *          [prng] the pseudo-random number generator to use to produce a salt.
 *          [salt] the salt to use when encoding.
 *
 * @return a signature scheme object.
 */
export const create = function (options) {
    // backwards compatibility w/legacy args: hash, mgf, sLen
    if (arguments.length === 3) {
        options = {
            md: arguments[0],
            mgf: arguments[1],
            saltLength: arguments[2]
        };
    }

    const hMeta = adone.crypto.hash.meta(options.md);

    if (is.null(hMeta)) {
        throw new adone.error.NotSupportedException(`"${options.md} hash algorithm is not supported`);
    }

    const hLen = hMeta.digestLength;
    const hash = adone.crypto.hash[options.md];
    const mgf = options.mgf;

    let salt_ = options.salt || null;
    if (is.string(salt_)) {
        // assume binary-encoded string
        salt_ = Buffer.from(salt_, "binary");
    }

    let sLen;
    if ("saltLength" in options) {
        sLen = options.saltLength;
    } else if (!is.null(salt_)) {
        sLen = salt_.length;
    } else {
        throw new Error("Salt length not specified or specific salt not given.");
    }

    if (!is.null(salt_) && salt_.length !== sLen) {
        throw new Error("Given salt length does not match length of given salt.");
    }

    const prng = options.prng || crypto.random;

    const pssobj = {};

    /**
     * Encodes a PSS signature.
     *
     * This function implements EMSA-PSS-ENCODE as per RFC 3447, section 9.1.1.
     *
     * @param md the message digest object with the hash to sign.
     * @param modsBits the length of the RSA modulus in bits.
     *
     * @return the encoded message as a binary-encoded string of length
     *           ceil((modBits - 1) / 8).
     */
    pssobj.encode = function (md, modBits) {
        let i;
        const emBits = modBits - 1;
        const emLen = Math.ceil(emBits / 8);

        /**
         * 2. Let mHash = Hash(M), an octet string of length hLen.
         */
        const mHash = md.digest();

        /**
         * 3. If emLen < hLen + sLen + 2, output "encoding error" and stop.
         */
        if (emLen < hLen + sLen + 2) {
            throw new Error("Message is too long to encrypt.");
        }

        /**
         * 4. Generate a random octet string salt of length sLen; if sLen = 0,
         */
        let salt;
        if (is.null(salt_)) {
            salt = prng.getBytesSync(sLen);
        } else {
            salt = salt_;
        }

        /**
         * 5. Let M' = (0x)00 00 00 00 00 00 00 00 || mHash || salt;
         */
        const m_ = Buffer.concat([
            Buffer.alloc(8, 0),
            mHash,
            salt
        ]);

        /**
         * 6. Let H = Hash(M'), an octet string of length hLen.
         */
        const h = hash(m_);

        /**
         * 7. Generate an octet string PS consisting of emLen - sLen - hLen - 2
         */
        const ps = Buffer.alloc(emLen - sLen - hLen - 2, 0);

        /**
         * 8. Let DB = PS || 0x01 || salt; DB is an octet string of length
         */
        const db = Buffer.concat([
            ps,
            Buffer.from([0x01]),
            salt
        ]);

        /**
         * 9. Let dbMask = MGF(H, emLen - hLen - 1).
         */
        const maskLen = emLen - hLen - 1;
        const dbMask = mgf.generate(h, maskLen);

        /**
         * 10. Let maskedDB = DB \xor dbMask.
         */
        const maskedDB = Buffer.alloc(maskLen);
        for (i = 0; i < maskLen; i++) {
            maskedDB.writeUInt8(db[i] ^ dbMask[i], i);
        }

        /**
         * 11. Set the leftmost 8emLen - emBits bits of the leftmost octet in
         */
        const mask = (0xFF00 >> (8 * emLen - emBits)) & 0xFF;
        maskedDB.writeUInt8(maskedDB[0] & ~mask, 0);

        /**
         * 12. Let EM = maskedDB || H || 0xbc.
         */
        return Buffer.concat([
            maskedDB,
            h,
            Buffer.from([0xBC])
        ]);
    };

    /**
     * Verifies a PSS signature.
     *
     * This function implements EMSA-PSS-VERIFY as per RFC 3447, section 9.1.2.
     *
     * @param {Buffer} mHash the message digest hash, as a binary-encoded string, to
     *         compare against the signature.
     * @param {Buffer} em the encoded message, as a binary-encoded string
     *          (RSA decryption result).
     * @param modsBits the length of the RSA modulus in bits.
     *
     * @return true if the signature was verified, false if not.
     */
    pssobj.verify = function (mHash, em, modBits) {
        let i;
        const emBits = modBits - 1;
        const emLen = Math.ceil(emBits / 8);

        /**
         * c. Convert the message representative m to an encoded message EM
         *    of length emLen = ceil((modBits - 1) / 8) octets, where modBits
         */
        em = em.slice(-emLen);

        /**
         *  3. If emLen < hLen + sLen + 2, output "inconsistent" and stop.
         */
        if (emLen < hLen + sLen + 2) {
            throw new Error("Inconsistent parameters to PSS signature verification.");
        }

        /**
         * 4. If the rightmost octet of EM does not have hexadecimal value 0xbc, output "inconsistent" and stop.
         */
        if (em[emLen - 1] !== 0xbc) {
            throw new Error("Encoded message does not end in 0xBC.");
        }

        /**
         * 5. Let maskedDB be the leftmost emLen - hLen - 1 octets of EM, and
         */
        const maskLen = emLen - hLen - 1;
        const maskedDB = em.slice(0, maskLen);
        const h = em.slice(maskLen, maskLen + hLen);

        /**
         * 6. If the leftmost 8emLen - emBits bits of the leftmost octet in
         */
        const mask = (0xFF00 >> (8 * emLen - emBits)) & 0xFF;
        if ((maskedDB[0] & mask) !== 0) {
            throw new Error("Bits beyond keysize not zero as expected.");
        }

        /**
         * 7. Let dbMask = MGF(H, emLen - hLen - 1).
         */
        const dbMask = mgf.generate(h, maskLen);

        /**
         * 8. Let DB = maskedDB \xor dbMask.
         */
        const db = Buffer.alloc(maskLen, 0);
        for (i = 0; i < maskLen; i++) {
            db.writeUInt8(maskedDB[i] ^ dbMask[i], i);
        }

        /**
         * 9. Set the leftmost 8emLen - emBits bits of the leftmost octet
         */
        db.writeUInt8(db[0] & ~mask, 0);

        /**
         * 10. If the emLen - hLen - sLen - 2 leftmost octets of DB are not zero
         * or if the octet at position emLen - hLen - sLen - 1 (the leftmost
         * position is "position 1") does not have hexadecimal value 0x01,
         */
        const checkLen = emLen - hLen - sLen - 2;
        for (i = 0; i < checkLen; i++) {
            if (db[i] !== 0x00) {
                throw new Error("Leftmost octets not zero as expected");
            }
        }

        if (db[checkLen] !== 0x01) {
            throw new Error("Inconsistent PSS signature, 0x01 marker not found");
        }

        /**
         * 11. Let salt be the last sLen octets of DB.
         */
        const salt = db.slice(-sLen);

        /**
         * 12.  Let M' = (0x)00 00 00 00 00 00 00 00 || mHash || salt
         */
        const m_ = Buffer.concat([
            Buffer.alloc(8, 0),
            mHash,
            salt
        ]);

        /**
         * 13. Let H' = Hash(M'), an octet string of length hLen.
         */
        const h_ = hash(m_);

        /**
         * 14. If H = H', output "consistent." Otherwise, output "inconsistent."
         */
        return is.equalArrays(h, h_);
    };

    return pssobj;
};
