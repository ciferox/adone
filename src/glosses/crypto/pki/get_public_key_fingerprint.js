const {
    crypto: { pki }
} = adone;

const forge = require("node-forge");
const asn1 = forge.asn1;

/**
 * Gets a fingerprint for the given public key.
 *
 * @param options the options to use.
 *          [md] the message digest object to use (defaults to forge.md.sha1).
 *          [type] the type of fingerprint, such as 'RSAPublicKey',
 *            'SubjectPublicKeyInfo' (defaults to 'RSAPublicKey').
 *          [encoding] an alternative output encoding, such as 'hex'
 *            (defaults to none, outputs a byte buffer).
 *          [delimiter] the delimiter to use between bytes for 'hex' encoded
 *            output, eg: ':' (defaults to none).
 *
 * @return the fingerprint as a byte buffer or other encoding based on options.
 */
export default function getPublicKeyFingerprint(key, options) {
    options = options || {};
    const md = options.md || forge.md.sha1.create();
    const type = options.type || "RSAPublicKey";

    let bytes;
    switch (type) {
        case "RSAPublicKey":
            bytes = asn1.toDer(pki.publicKeyToRSAPublicKey(key)).getBytes();
            break;
        case "SubjectPublicKeyInfo":
            bytes = asn1.toDer(pki.publicKeyToAsn1(key)).getBytes();
            break;
        default:
            throw new Error(`Unknown fingerprint type "${options.type}".`);
    }

    // hash public key bytes
    md.start();
    md.update(bytes);
    const digest = md.digest();
    if (options.encoding === "hex") {
        const hex = digest.toHex();
        if (options.delimiter) {
            return hex.match(/.{2}/g).join(options.delimiter);
        }
        return hex;
    } else if (options.encoding === "binary") {
        return digest.getBytes();
    } else if (options.encoding) {
        throw new Error(`Unknown encoding "${options.encoding}".`);
    }
    return digest;
}

