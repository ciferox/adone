const {
    crypto
} = adone;

/**
 * Converts an RSA private key from PEM format.
 *
 * @param pem the PEM-formatted private key.
 *
 * @return the private key.
 */
export default function privateKeyFromPem(pem) {
    const msg = crypto.pem.decode(pem)[0];

    if (msg.type !== "PRIVATE KEY" && msg.type !== "RSA PRIVATE KEY") {
        const error = new Error("Could not convert private key from PEM; PEM " +
        'header type is not "PRIVATE KEY" or "RSA PRIVATE KEY".');
        error.headerType = msg.type;
        throw error;
    }
    if (msg.procType && msg.procType.type === "ENCRYPTED") {
        throw new Error("Could not convert private key from PEM; PEM is encrypted.");
    }

    // convert DER to ASN.1 object
    // const obj = asn1.fromDer(msg.body);

    const ar = adone.util.bufferToArrayBuffer(Buffer.from(msg.body, "binary"));
    const obj = adone.crypto.asn1.fromBER(ar);

    return crypto.pki.privateKeyFromAsn1(obj.result);
}
