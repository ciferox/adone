const {
    crypto: { pki }
} = adone;

const forge = require("node-forge");
const asn1 = forge.asn1;

/**
 * Converts an RSA private key to PEM format.
 *
 * @param key the private key.
 * @param maxline the maximum characters per line, defaults to 64.
 *
 * @return the PEM-formatted private key.
 */
export default function privateKeyToPem(key, maxline) {
    // convert to ASN.1, then DER, then PEM-encode
    const msg = {
        type: "RSA PRIVATE KEY",
        body: asn1.toDer(pki.privateKeyToAsn1(key)).getBytes()
    };
    return forge.pem.encode(msg, { maxline });
}
