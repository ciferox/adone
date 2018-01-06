const {
    crypto: { pki }
} = adone;

const forge = require("node-forge");
const asn1 = forge.asn1;

/**
 * Converts an RSA public key to PEM format (using a SubjectPublicKeyInfo).
 *
 * @param key the public key.
 * @param maxline the maximum characters per line, defaults to 64.
 *
 * @return the PEM-formatted public key.
 */
export default function publicKeyToPem(key, maxline) {
    // convert to ASN.1, then DER, then PEM-encode
    const msg = {
        type: "PUBLIC KEY",
        body: asn1.toDer(pki.publicKeyToAsn1(key)).getBytes()
    };
    return forge.pem.encode(msg, { maxline });
}
