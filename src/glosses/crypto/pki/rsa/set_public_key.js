const {
    is,
    crypto: {
        pki,
        pkcs1
    }
} = adone;

const __ = adone.private(adone.crypto.pki.rsa);

const forge = require("node-forge");
const asn1 = forge.asn1;

/**
 * Sets an RSA public key from BigIntegers modulus and exponent.
 *
 * @param n the modulus.
 * @param e the exponent.
 *
 * @return the public key.
 */
export default function setPublicKey(n, e) {
    const key = {
        n,
        e
    };

    /**
     * Encrypts the given data with this public key. Newer applications
     * should use the 'RSA-OAEP' decryption scheme, 'RSAES-PKCS1-V1_5' is for
     * legacy applications.
     *
     * @param data the byte string to encrypt.
     * @param scheme the encryption scheme to use:
     *          'RSAES-PKCS1-V1_5' (default),
     *          'RSA-OAEP',
     *          'RAW', 'NONE', or null to perform raw RSA encryption,
     *          an object with an 'encode' property set to a function
     *          with the signature 'function(data, key)' that returns
     *          a binary-encoded string representing the encoded data.
     * @param schemeOptions any scheme-specific options.
     *
     * @return the encrypted byte string.
     */
    key.encrypt = function (data, scheme, schemeOptions) {
        if (is.string(scheme)) {
            scheme = scheme.toUpperCase();
        } else if (is.undefined(scheme)) {
            scheme = "RSAES-PKCS1-V1_5";
        }

        if (scheme === "RSAES-PKCS1-V1_5") {
            scheme = {
                encode(m, key, pub) {
                    return __.encodePKCS1v15(m, key, 0x02).getBytes();
                }
            };
        } else if (scheme === "RSA-OAEP" || scheme === "RSAES-OAEP") {
            scheme = {
                encode(m, key) {
                    return pkcs1.encodeRSAOAEP(key, m, schemeOptions);
                }
            };
        } else if (["RAW", "NONE", "NULL", null].includes(scheme)) {
            scheme = { encode(e) {
                return e;
            } };
        } else if (is.string(scheme)) {
            throw new Error(`Unsupported encryption scheme: "${scheme}".`);
        }

        // do scheme-based encoding then rsa encryption
        const e = scheme.encode(data, key, true);
        return pki.rsa.encrypt(e, key, true);
    };

    /**
     * Verifies the given signature against the given digest.
     *
     * PKCS#1 supports multiple (currently two) signature schemes:
     * RSASSA-PKCS1-V1_5 and RSASSA-PSS.
     *
     * By default this implementation uses the "old scheme", i.e.
     * RSASSA-PKCS1-V1_5, in which case once RSA-decrypted, the
     * signature is an OCTET STRING that holds a DigestInfo.
     *
     * DigestInfo ::= SEQUENCE {
     *   digestAlgorithm DigestAlgorithmIdentifier,
     *   digest Digest
     * }
     * DigestAlgorithmIdentifier ::= AlgorithmIdentifier
     * Digest ::= OCTET STRING
     *
     * To perform PSS signature verification, provide an instance
     * of Forge PSS object as the scheme parameter.
     *
     * @param digest the message digest hash to compare against the signature,
     *          as a binary-encoded string.
     * @param signature the signature to verify, as a binary-encoded string.
     * @param scheme signature verification scheme to use:
     *          'RSASSA-PKCS1-V1_5' or undefined for RSASSA PKCS#1 v1.5,
     *          a Forge PSS object for RSASSA-PSS,
     *          'NONE' or null for none, DigestInfo will not be expected, but
     *            PKCS#1 v1.5 padding will still be used.
     *
     * @return true if the signature was verified, false if not.
     */
    key.verify = function (digest, signature, scheme) {
        if (is.string(scheme)) {
            scheme = scheme.toUpperCase();
        } else if (is.undefined(scheme)) {
            scheme = "RSASSA-PKCS1-V1_5";
        }

        if (scheme === "RSASSA-PKCS1-V1_5") {
            scheme = {
                verify(digest, d) {
                    // remove padding
                    d = __.decodePKCS1v15(d, key, true);
                    // d is ASN.1 BER-encoded DigestInfo
                    const obj = asn1.fromDer(d);
                    // compare the given digest to the decrypted one
                    return digest === obj.value[1].value;
                }
            };
        } else if (scheme === "NONE" || scheme === "NULL" || is.null(scheme)) {
            scheme = {
                verify(digest, d) {
                    // remove padding
                    d = __.decodePKCS1v15(d, key, true);
                    return digest === d;
                }
            };
        }

        // do rsa decryption w/o any decoding, then verify -- which does decoding
        const d = pki.rsa.decrypt(signature, key, true, false);
        return scheme.verify(digest, d, key.n.bitLength());
    };

    return key;
}
