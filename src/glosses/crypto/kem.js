/**
 * Javascript implementation of RSA-KEM.
 *
 * @author Lautaro Cozzani Rodriguez
 * @author Dave Longley
 *
 * Copyright (c) 2014 Lautaro Cozzani <lautaro.cozzani@scytl.com>
 * Copyright (c) 2014 Digital Bazaar, Inc.
 */

const {
    crypto
} = adone;

const { BigInteger } = crypto.jsbn;

/**
 * The API for the RSA Key Encapsulation Mechanism (RSA-KEM) from ISO 18033-2.
 */
export const rsa = {};

/**
 * Creates an RSA KEM API object for generating a secret asymmetric key.
 *
 * The symmetric key may be generated via a call to 'encrypt', which will
 * produce a ciphertext to be transmitted to the recipient and a key to be
 * kept secret. The ciphertext is a parameter to be passed to 'decrypt' which
 * will produce the same secret key for the recipient to use to decrypt a
 * message that was encrypted with the secret key.
 *
 * @param kdf the KDF API to use (eg: new forge.kem.kdf1()).
 * @param options the options to use.
 *          [prng] a custom crypto-secure pseudo-random number generator to use,
 *            that must define "getBytesSync".
 */
rsa.create = function (kdf, options) {
    options = options || {};
    const prng = options.prng || crypto.random;

    const kem = {};

    /**
     * Generates a secret key and its encapsulation.
     *
     * @param publicKey the RSA public key to encrypt with.
     * @param keyLength the length, in bytes, of the secret key to generate.
     *
     * @return an object with:
     *   encapsulation: the ciphertext for generating the secret key, as a
     *     binary-encoded string of bytes.
     *   key: the secret key to use for encrypting a message.
     */
    kem.encrypt = function (publicKey, keyLength) {
        // generate a random r where 1 < r < n
        const byteLength = Math.ceil(publicKey.n.bitLength() / 8);
        let r;
        do {
            r = new BigInteger(
                crypto.util.bytesToHex(prng.getBytesSync(byteLength)),
                16).mod(publicKey.n);
        } while (r.compareTo(BigInteger.ONE) <= 0);

        // prepend r with zeros
        r = crypto.util.hexToBytes(r.toString(16));
        const zeros = byteLength - r.length;
        if (zeros > 0) {
            r = crypto.util.fillString(String.fromCharCode(0), zeros) + r;
        }

        // encrypt the random
        const encapsulation = publicKey.encrypt(r, "NONE");

        // generate the secret key
        const key = kdf.generate(r, keyLength);

        return { encapsulation, key };
    };

    /**
     * Decrypts an encapsulated secret key.
     *
     * @param privateKey the RSA private key to decrypt with.
     * @param encapsulation the ciphertext for generating the secret key, as
     *          a binary-encoded string of bytes.
     * @param keyLength the length, in bytes, of the secret key to generate.
     *
     * @return the secret key as a binary-encoded string of bytes.
     */
    kem.decrypt = function (privateKey, encapsulation, keyLength) {
        // decrypt the encapsulation and generate the secret key
        const r = privateKey.decrypt(encapsulation, "NONE");
        return kdf.generate(r, keyLength);
    };

    return kem;
};

// TODO: add crypto.kem.kdf.create('KDF1', {md: ..., ...}) API?

/**
 * Creates a key derivation API object that implements KDF1 per ISO 18033-2.
 *
 * @param md the hash API to use.
 * @param [digestLength] an optional digest length that must be positive and
 *          less than or equal to md.digestLength.
 *
 * @return a KDF1 API object.
 */
export const kdf1 = function (md, digestLength) {
    _createKDF(this, md, 0, digestLength || md.digestLength);
};

/**
 * Creates a key derivation API object that implements KDF2 per ISO 18033-2.
 *
 * @param md the hash API to use.
 * @param [digestLength] an optional digest length that must be positive and
 *          less than or equal to md.digestLength.
 *
 * @return a KDF2 API object.
 */
export const kdf2 = function (md, digestLength) {
    _createKDF(this, md, 1, digestLength || md.digestLength);
};

/**
 * Creates a KDF1 or KDF2 API object.
 *
 * @param md the hash API to use.
 * @param counterStart the starting index for the counter.
 * @param digestLength the digest length to use.
 *
 * @return the KDF API object.
 */
function _createKDF(kdf, md, counterStart, digestLength) {
    /**
     * Generate a key of the specified length.
     *
     * @param x the binary-encoded byte string to generate a key from.
     * @param length the number of bytes to generate (the size of the key).
     *
     * @return the key as a binary-encoded string.
     */
    kdf.generate = function (x, length) {
        const key = new crypto.util.ByteBuffer();

        // run counter from counterStart to ceil(length / Hash.len)
        const k = Math.ceil(length / digestLength) + counterStart;

        const c = new crypto.util.ByteBuffer();
        for (let i = counterStart; i < k; ++i) {
            // I2OSP(i, 4): convert counter to an octet string of 4 octets
            c.putInt32(i);

            // digest 'x' and the counter and add the result to the key
            md.start();
            md.update(x + c.getBytes());
            const hash = md.digest();
            key.putBytes(hash.getBytes(digestLength));
        }

        // truncate to the correct key length
        key.truncate(key.length() - length);
        return key.getBytes();
    };
}
