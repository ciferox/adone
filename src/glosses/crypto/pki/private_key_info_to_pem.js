const {
    crypto
} = adone;

const forge = require("node-forge");
const asn1 = forge.asn1;

/**
 * Converts a PrivateKeyInfo to PEM format.
 *
 * @param pki the PrivateKeyInfo.
 * @param maxline the maximum characters per line, defaults to 64.
 *
 * @return the PEM-formatted private key.
 */
export default function PrivateKeyInfoToPem(pki, maxline) {
    // convert to DER, then PEM-encode
    const msg = {
        type: "PRIVATE KEY",
        body: asn1.toDer(pki).getBytes()
    };
    return crypto.pem.encode(msg, { maxline });
}

