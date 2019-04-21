const {
    is,
    crypto: {
        pki,
        pkcs1
    }
} = adone;

const __ = adone.getPrivate(pki.rsa);

/**
 * Sets an RSA private key from BigIntegers modulus, exponent, primes,
 * prime exponents, and modular multiplicative inverse.
 *
 * @param n the modulus.
 * @param e the public exponent.
 * @param d the private exponent ((inverse of e) mod n).
 * @param p the first prime.
 * @param q the second prime.
 * @param dP exponent1 (d mod (p-1)).
 * @param dQ exponent2 (d mod (q-1)).
 * @param qInv ((inverse of q) mod p)
 *
 * @return the private key.
 */
export default function setPrivateKey(n, e, d, p, q, dP, dQ, qInv) {
    const key = {
        n,
        e,
        d,
        p,
        q,
        dP,
        dQ,
        qInv
    };

    /**
     * Decrypts the given data with this private key. The decryption scheme
     * must match the one used to encrypt the data.
     *
     * @param {Buffer} data data to decrypt.
     * @param scheme the decryption scheme to use:
     *          'RSAES-PKCS1-V1_5' (default),
     *          'RSA-OAEP',
     *          'RAW', 'NONE', or null to perform raw RSA decryption.
     * @param schemeOptions any scheme-specific options.
     *
     * @return the decrypted byte string.
     */
    key.decrypt = function (data, scheme, schemeOptions) {
        if (is.string(scheme)) {
            scheme = scheme.toUpperCase();
        } else if (is.undefined(scheme)) {
            scheme = "RSAES-PKCS1-V1_5";
        }

        // do rsa decryption w/o any decoding
        const d = pki.rsa.decrypt(data, key, false, false);

        if (scheme === "RSAES-PKCS1-V1_5") {
            scheme = {
                decode: (d, key, pub) => {
                    return __.decodePKCS1v15(d, key, pub);
                }
            };
        } else if (scheme === "RSA-OAEP" || scheme === "RSAES-OAEP") {
            scheme = {
                decode(d, key) {
                    return pkcs1.decodeRSAOAEP(key, d, schemeOptions);
                }
            };
        } else if (["RAW", "NONE", "NULL", null].includes(scheme)) {
            scheme = {
                decode(d) {
                    return d;
                }
            };
        } else {
            throw new Error(`Unsupported encryption scheme: "${scheme}".`);
        }

        // decode according to scheme
        return scheme.decode(d, key, false);
    };

    /**
     * Signs the given digest, producing a signature.
     *
     * PKCS#1 supports multiple (currently two) signature schemes:
     * RSASSA-PKCS1-V1_5 and RSASSA-PSS.
     *
     * By default this implementation uses the "old scheme", i.e.
     * RSASSA-PKCS1-V1_5. In order to generate a PSS signature, provide
     * an instance of Forge PSS object as the scheme parameter.
     *
     * @param md the message digest object with the hash to sign.
     * @param scheme the signature scheme to use:
     *          'RSASSA-PKCS1-V1_5' or undefined for RSASSA PKCS#1 v1.5,
     *          a Forge PSS object for RSASSA-PSS,
     *          'NONE' or null for none, DigestInfo will not be used but
     *            PKCS#1 v1.5 padding will still be used.
     *
     * @return the signature as a byte string.
     */
    key.sign = function (md, scheme) {
        /**
         * Note: The internal implementation of RSA operations is being
         * transitioned away from a PKCS#1 v1.5 hard-coded scheme. Some legacy
         * code like the use of an encoding block identifier 'bt' will eventually
         */

        // private key operation
        let bt = false;

        if (is.string(scheme)) {
            scheme = scheme.toUpperCase();
        }

        if (is.undefined(scheme) || scheme === "RSASSA-PKCS1-V1_5") {
            scheme = {
                encode: (md) => {
                    return __.emsaPKCS1v15encode(md);
                }
            };
            bt = 0x01;
        } else if (scheme === "NONE" || scheme === "NULL" || is.null(scheme)) {
            scheme = {
                encode() {
                    return md;
                }
            };
            bt = 0x01;
        }

        // encode and then encrypt
        const d = scheme.encode(md, key.n.bitLength());
        return pki.rsa.encrypt(d, key, bt);
    };

    return key;
}
