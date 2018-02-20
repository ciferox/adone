const {
    is,
    error,
    std
} = adone;

/**
 * Derives a PKCS#12 key.
 *
 * @param {Buffer | null} password the password to derive the key material from, null or undefined for none.
 * @param {Buffer} salt the salt
 * @param id the PKCS#12 ID byte (1 = key material, 2 = IV, 3 = MAC).
 * @param iter the iteration count.
 * @param n the number of bytes to derive from the password.
 * @param md the message digest to use, defaults to SHA-1.
 *
 * @return a ByteBuffer with the bytes derived from the password.
 */
export default function generatePKCS12Key(utf8password, salt, id, iter, n, md = "sha1") {
    let j;
    let l;

    const hMeta = adone.crypto.hash.meta(md);

    if (is.null(hMeta)) {
        throw new error.NotSupported(`"${md}" hash algorithm is not supported`);
    }

    const createHash = () => std.crypto.createHash(md);

    const u = hMeta.digestLength;
    const v = hMeta.blockLength;

    // In this specification however, all passwords are created from BMPStrings with a NULL
    // terminator. This means that each character in the original BMPString is encoded in 2
    // bytes in big-endian format (most-significant byte first). There are no Unicode byte order
    // marks. The 2 bytes produced from the last character in the BMPString are followed by
    // two additional bytes with the value 0x00.
    const password = Buffer.allocUnsafe(2 * utf8password.length + 2);
    for (l = 0; l < utf8password.length; ++l) {
        password.writeUInt16BE(utf8password.charCodeAt(l), 2 * l);
    }
    password.writeUInt16BE(0, utf8password.length * 2);

    /**
     * Length of salt and password in BYTES.
     */
    const p = password.length;
    const s = salt.length;

    /**
     * 1. Construct a string, D (the "diversifier"), by concatenating
     */
    const D = Buffer.alloc(v, id);

    /**
     * 2. Concatenate copies of the salt together to create a string S of length
     * v * ceil(s / v) bytes (the final copy of the salt may be trunacted
     * to create S).
     */
    const Slen = v * Math.ceil(s / v);
    const S = Buffer.allocUnsafe(Slen);
    for (l = 0; l < Slen; l++) {
        S.writeUInt8(salt[l % s], l);
    }

    /**
     * 3. Concatenate copies of the password together to create a string P of
     * length v * ceil(p / v) bytes (the final copy of the password may be
     * truncated to create P).
     */
    const Plen = v * Math.ceil(p / v);
    const P = Buffer.allocUnsafe(Plen);
    for (l = 0; l < Plen; l++) {
        P.writeUInt8(password[l % p], l);
    }

    /**
     * 4. Set I=S||P to be the concatenation of S and P.
     */
    let I = Buffer.concat([S, P]);

    /**
     * 5. Set c=ceil(n / u).
     */
    const c = Math.ceil(n / u);

    const resultBufs = [];

    /* 6. For i=1, 2, ..., c, do the following: */
    for (let i = 1; i <= c; i++) {
        /**
         * a) Set Ai=H^r(D||I). (l.e. the rth hash of D||I, H(H(H(...H(D||I))))
         */
        let Ai;
        {
            const H = createHash();
            H.update(D);
            H.update(I);
            Ai = H.digest();
        }

        for (let round = 1; round < iter; round++) {
            const H = createHash();
            H.update(Ai);
            Ai = H.digest();
        }

        /**
         * b) Concatenate copies of Ai to create a string B of length v bytes
         * (the final copy of Ai may be truncated to create B).
         */
        const B = Buffer.allocUnsafe(v);
        for (l = 0; l < v; l++) {
            B.writeUInt8(Ai[l % u], l);
        }

        /**
         * c) Treating I as a concatenation I0, I1, ..., Ik-1 of v-byte blocks,
         * where k=ceil(s / v) + ceil(p / v), modify I by setting
         */
        const k = Math.ceil(s / v) + Math.ceil(p / v);
        const bufs = [];
        for (j = 0; j < k; j++) {
            const chunk = Buffer.from(I);
            let x = 0x1ff;
            for (l = B.length - 1; l >= 0; l--) {
                x = x >> 8;
                x += B[l] + chunk[l];
                chunk[l] = x & 0xFF;
            }
            bufs.push(chunk);
        }
        I = Buffer.concat(bufs);

        /**
         * Add Ai to A.
         */
        resultBufs.push(I);
    }

    const resultBuf = Buffer.concat(resultBufs);

    return resultBuf.slice(0, n);
}
