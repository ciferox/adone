/**
 * Javascript implementation of PKCS#1 PSS signature padding.
 *
 * @author Stefan Siegl
 *
 * Copyright (c) 2012 Stefan Siegl <stesie@brokenpipe.de>
 */

const {
    is,
    crypto
} = adone;

/**
 * Creates a PSS signature scheme object.
 *
 * There are several ways to provide a salt for encoding:
 *
 * 1. Specify the saltLength only and the built-in PRNG will generate it.
 * 2. Specify the saltLength and a custom PRNG with 'getBytesSync' defined that
 *   will be used.
 * 3. Specify the salt itself as a crypto.util.ByteBuffer.
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

    const hash = options.md;
    const mgf = options.mgf;
    const hLen = hash.digestLength;

    let salt_ = options.salt || null;
    if (is.string(salt_)) {
    // assume binary-encoded string
        salt_ = crypto.util.createBuffer(salt_);
    }

    let sLen;
    if ("saltLength" in options) {
        sLen = options.saltLength;
    } else if (!is.null(salt_)) {
        sLen = salt_.length();
    } else {
        throw new Error("Salt length not specified or specific salt not given.");
    }

    if (!is.null(salt_) && salt_.length() !== sLen) {
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
        const mHash = md.digest().getBytes();

        /* 3. If emLen < hLen + sLen + 2, output "encoding error" and stop. */
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
            salt = salt_.bytes();
        }

        /**
         * 5. Let M' = (0x)00 00 00 00 00 00 00 00 || mHash || salt;
         */
        const m_ = new crypto.util.ByteBuffer();
        m_.fillWithByte(0, 8);
        m_.putBytes(mHash);
        m_.putBytes(salt);

        /**
         * 6. Let H = Hash(M'), an octet string of length hLen.
         */
        hash.start();
        hash.update(m_.getBytes());
        const h = hash.digest().getBytes();

        /**
         * 7. Generate an octet string PS consisting of emLen - sLen - hLen - 2
         */
        const ps = new crypto.util.ByteBuffer();
        ps.fillWithByte(0, emLen - sLen - hLen - 2);

        /**
         * 8. Let DB = PS || 0x01 || salt; DB is an octet string of length
         */
        ps.putByte(0x01);
        ps.putBytes(salt);
        const db = ps.getBytes();

        /**
         * 9. Let dbMask = MGF(H, emLen - hLen - 1).
         */
        const maskLen = emLen - hLen - 1;
        const dbMask = mgf.generate(h, maskLen);

        /**
         * 10. Let maskedDB = DB \xor dbMask.
         */
        let maskedDB = "";
        for (i = 0; i < maskLen; i++) {
            maskedDB += String.fromCharCode(db.charCodeAt(i) ^ dbMask.charCodeAt(i));
        }

        /**
         * 11. Set the leftmost 8emLen - emBits bits of the leftmost octet in
         */
        const mask = (0xFF00 >> (8 * emLen - emBits)) & 0xFF;
        maskedDB = String.fromCharCode(maskedDB.charCodeAt(0) & ~mask) +
      maskedDB.substr(1);

        /* 12. Let EM = maskedDB || H || 0xbc.
     * 13. Output EM. */
        return maskedDB + h + String.fromCharCode(0xbc);
    };

    /**
     * Verifies a PSS signature.
     *
     * This function implements EMSA-PSS-VERIFY as per RFC 3447, section 9.1.2.
     *
     * @param mHash the message digest hash, as a binary-encoded string, to
     *         compare against the signature.
     * @param em the encoded message, as a binary-encoded string
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
        em = em.substr(-emLen);

        /* 3. If emLen < hLen + sLen + 2, output "inconsistent" and stop. */
        if (emLen < hLen + sLen + 2) {
            throw new Error("Inconsistent parameters to PSS signature verification.");
        }

        /* 4. If the rightmost octet of EM does not have hexadecimal value
     *    0xbc, output "inconsistent" and stop. */
        if (em.charCodeAt(emLen - 1) !== 0xbc) {
            throw new Error("Encoded message does not end in 0xBC.");
        }

        /**
         * 5. Let maskedDB be the leftmost emLen - hLen - 1 octets of EM, and
         */
        const maskLen = emLen - hLen - 1;
        const maskedDB = em.substr(0, maskLen);
        const h = em.substr(maskLen, hLen);

        /**
         * 6. If the leftmost 8emLen - emBits bits of the leftmost octet in
         */
        const mask = (0xFF00 >> (8 * emLen - emBits)) & 0xFF;
        if ((maskedDB.charCodeAt(0) & mask) !== 0) {
            throw new Error("Bits beyond keysize not zero as expected.");
        }

        /**
         * 7. Let dbMask = MGF(H, emLen - hLen - 1).
         */
        const dbMask = mgf.generate(h, maskLen);

        /**
         * 8. Let DB = maskedDB \xor dbMask.
         */
        let db = "";
        for (i = 0; i < maskLen; i++) {
            db += String.fromCharCode(maskedDB.charCodeAt(i) ^ dbMask.charCodeAt(i));
        }

        /**
         * 9. Set the leftmost 8emLen - emBits bits of the leftmost octet
         */
        db = String.fromCharCode(db.charCodeAt(0) & ~mask) + db.substr(1);

        /**
         * 10. If the emLen - hLen - sLen - 2 leftmost octets of DB are not zero
         * or if the octet at position emLen - hLen - sLen - 1 (the leftmost
         * position is "position 1") does not have hexadecimal value 0x01,
         */
        const checkLen = emLen - hLen - sLen - 2;
        for (i = 0; i < checkLen; i++) {
            if (db.charCodeAt(i) !== 0x00) {
                throw new Error("Leftmost octets not zero as expected");
            }
        }

        if (db.charCodeAt(checkLen) !== 0x01) {
            throw new Error("Inconsistent PSS signature, 0x01 marker not found");
        }

        /**
         * 11. Let salt be the last sLen octets of DB.
         */
        const salt = db.substr(-sLen);

        /**
         * 12.  Let M' = (0x)00 00 00 00 00 00 00 00 || mHash || salt
         */
        const m_ = new crypto.util.ByteBuffer();
        m_.fillWithByte(0, 8);
        m_.putBytes(mHash);
        m_.putBytes(salt);

        /**
         * 13. Let H' = Hash(M'), an octet string of length hLen.
         */
        hash.start();
        hash.update(m_.getBytes());
        const h_ = hash.digest().getBytes();

        /* 14. If H = H', output "consistent." Otherwise, output "inconsistent." */
        return h === h_;
    };

    return pssobj;
};
