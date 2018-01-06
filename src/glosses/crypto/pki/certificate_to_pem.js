const {
    crypto: { pki }
} = adone;

const forge = require("node-forge");
const asn1 = forge.asn1;

/**
 * Converts an X.509 certificate to PEM format.
 *
 * @param cert the certificate.
 * @param maxline the maximum characters per line, defaults to 64.
 *
 * @return the PEM-formatted certificate.
 */
export default function certificateToPem(cert, maxline) {
    // convert to ASN.1, then DER, then PEM-encode
    const msg = {
        type: "CERTIFICATE",
        body: asn1.toDer(pki.certificateToAsn1(cert)).getBytes()
    };
    return forge.pem.encode(msg, { maxline });
}
