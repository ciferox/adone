const {
    is
} = adone;

const forge = require("node-forge");

/**
 * Derives a PKCS#12 key.
 *
 * @param password the password to derive the key material from, null or
 *          undefined for none.
 * @param salt the salt, as a ByteBuffer, to use.
 * @param id the PKCS#12 ID byte (1 = key material, 2 = IV, 3 = MAC).
 * @param iter the iteration count.
 * @param n the number of bytes to derive from the password.
 * @param md the message digest to use, defaults to SHA-1.
 *
 * @return a ByteBuffer with the bytes derived from the password.
 */
export default function generatePKCS12Key(password, salt, id, iter, n, md) {
    let j;
    let l;

    if (is.nil(md)) {
        if (!("sha1" in forge.md)) {
            throw new Error('"sha1" hash algorithm unavailable.');
        }
        md = forge.md.sha1.create();
    }

    const u = md.digestLength;
    const v = md.blockLength;
    const result = new forge.util.ByteBuffer();

    /**
     * Convert password to Unicode byte buffer + trailing 0-byte.
     */
    const passBuf = new forge.util.ByteBuffer();
    if (!is.nil(password)) {
        for (l = 0; l < password.length; l++) {
            passBuf.putInt16(password.charCodeAt(l));
        }
        passBuf.putInt16(0);
    }

    /**
     * Length of salt and password in BYTES.
     */
    const p = passBuf.length();
    const s = salt.length();

    /**
     * 1. Construct a string, D (the "diversifier"), by concatenating
     */
    const D = new forge.util.ByteBuffer();
    D.fillWithByte(id, v);

    /**
     * 2. Concatenate copies of the salt together to create a string S of length
     * v * ceil(s / v) bytes (the final copy of the salt may be trunacted
     * to create S).
     */
    const Slen = v * Math.ceil(s / v);
    const S = new forge.util.ByteBuffer();
    for (l = 0; l < Slen; l++) {
        S.putByte(salt.at(l % s));
    }

    /**
     * 3. Concatenate copies of the password together to create a string P of
     * length v * ceil(p / v) bytes (the final copy of the password may be
     * truncated to create P).
     */
    const Plen = v * Math.ceil(p / v);
    const P = new forge.util.ByteBuffer();
    for (l = 0; l < Plen; l++) {
        P.putByte(passBuf.at(l % p));
    }

    /**
     * 4. Set I=S||P to be the concatenation of S and P.
     */
    let I = S;
    I.putBuffer(P);

    /**
     * 5. Set c=ceil(n / u).
     */
    const c = Math.ceil(n / u);

    /* 6. For i=1, 2, ..., c, do the following: */
    for (let i = 1; i <= c; i++) {
        /**
         * a) Set Ai=H^r(D||I). (l.e. the rth hash of D||I, H(H(H(...H(D||I))))
         */
        let buf = new forge.util.ByteBuffer();
        buf.putBytes(D.bytes());
        buf.putBytes(I.bytes());
        for (let round = 0; round < iter; round++) {
            md.start();
            md.update(buf.getBytes());
            buf = md.digest();
        }

        /**
         * b) Concatenate copies of Ai to create a string B of length v bytes (the
         */
        const B = new forge.util.ByteBuffer();
        for (l = 0; l < v; l++) {
            B.putByte(buf.at(l % u));
        }

        /**
         * c) Treating I as a concatenation I0, I1, ..., Ik-1 of v-byte blocks,
         * where k=ceil(s / v) + ceil(p / v), modify I by setting
         */
        const k = Math.ceil(s / v) + Math.ceil(p / v);
        const Inew = new forge.util.ByteBuffer();
        for (j = 0; j < k; j++) {
            const chunk = new forge.util.ByteBuffer(I.getBytes(v));
            let x = 0x1ff;
            for (l = B.length() - 1; l >= 0; l--) {
                x = x >> 8;
                x += B.at(l) + chunk.at(l);
                chunk.setAt(l, x & 0xff);
            }
            Inew.putBuffer(chunk);
        }
        I = Inew;

        /**
         * Add Ai to A.
         */
        result.putBuffer(buf);
    }

    result.truncate(result.length() - n);
    return result;
}
