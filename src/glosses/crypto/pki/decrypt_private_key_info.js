const {
    crypto
} = adone;

const forge = require("node-forge");

const asn1 = crypto.asn1;

// validator for an EncryptedPrivateKeyInfo structure
// Note: Currently only works w/algorithm params
const encryptedPrivateKeyValidator = new asn1.Sequence({
    name: "EncryptedPrivateKeyInfo",
    value: [
        new asn1.Sequence({
            name: "encryptionAlgorithm",
            value: [
                new asn1.ObjectIdentifier({
                    name: "encryptionOid"
                }),
                new asn1.Sequence({
                    name: "encryptionParams"
                })
            ]
        }),
        new asn1.OctetString({
            name: "encryptedData"
        })
    ]
});

/**
 * Decrypts a ASN.1 PrivateKeyInfo object.
 *
 * @param obj the ASN.1 EncryptedPrivateKeyInfo object.
 * @param password the password to decrypt with.
 *
 * @return the ASN.1 PrivateKeyInfo on success, null on failure.
 */
export default function decryptPrivateKeyInfo(obj, password) {
    let rval = null;

    const epkValidation = asn1.compareSchema(obj, obj, encryptedPrivateKeyValidator);

    if (!epkValidation.verified) {
        throw new Error("Cannot read encrypted private key. ASN.1 object is not a supported EncryptedPrivateKeyInfo.")
    }

    const { result } = epkValidation;

    // get cipher
    const oid = result.encryptionOid.valueBlock.toString();
    const cipher = crypto.pki.pbe.getCipher(oid, result.encryptionParams, password);

    // get encrypted data
    const encrypted = forge.util.createBuffer(Buffer.from(result.encryptedData.valueBlock.valueHex).toString("binary"));

    cipher.update(encrypted);

    if (cipher.finish()) {
        const buf = adone.util.bufferToArrayBuffer(Buffer.from(cipher.output.getBytes(), "binary"));
        rval = asn1.fromBER(buf).result;
    }

    return rval;
}
