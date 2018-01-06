const {
    crypto: { pki }
} = adone;

const forge = require("node-forge");
const asn1 = forge.asn1;

/**
 * Converts an RSA public key from PEM format.
 *
 * @param pem the PEM-formatted public key.
 *
 * @return the public key.
 */
export default function publicKeyFromPem(pem) {
    const msg = forge.pem.decode(pem)[0];

    if (msg.type !== "PUBLIC KEY" && msg.type !== "RSA PUBLIC KEY") {
        const error = new Error("Could not convert public key from PEM; PEM header " +
        'type is not "PUBLIC KEY" or "RSA PUBLIC KEY".');
        error.headerType = msg.type;
        throw error;
    }
    if (msg.procType && msg.procType.type === "ENCRYPTED") {
        throw new Error("Could not convert public key from PEM; PEM is encrypted.");
    }

    // convert DER to ASN.1 object
    const obj = asn1.fromDer(msg.body);

    return pki.publicKeyFromAsn1(obj);
}
