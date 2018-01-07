const {
    crypto: {
        pki,
        asn1,
        pem
    }
} = adone;

/**
 * Converts an RSA public key from PEM format.
 *
 * @param _pem the PEM-formatted public key.
 *
 * @return the public key.
 */
export default function publicKeyFromPem(_pem) {
    const msg = pem.decode(_pem)[0];

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
    const buf = adone.util.bufferToArrayBuffer(Buffer.from(msg.body, "binary"));
    const obj = asn1.fromBER(buf).result;

    return pki.publicKeyFromAsn1(obj);
}
