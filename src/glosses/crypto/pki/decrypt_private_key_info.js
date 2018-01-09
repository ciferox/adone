const {
    crypto: {
        pki,
        asn1
    }
} = adone;

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
 * @param {Buffer | string} password the password to decrypt with
 *
 * @return the ASN.1 PrivateKeyInfo on success, null on failure.
 */
export default function decryptPrivateKeyInfo(obj, password) {
    const epkValidation = asn1.compareSchema(obj, obj, encryptedPrivateKeyValidator);

    if (!epkValidation.verified) {
        throw new Error("Cannot read encrypted private key. ASN.1 object is not a supported EncryptedPrivateKeyInfo.")
    }

    const { result } = epkValidation;

    // get cipher
    const oid = result.encryptionOid.valueBlock.toString();
    const cipher = pki.pbe.getCipher(oid, result.encryptionParams, password);

    // get encrypted data
    const firstBlock = cipher.update(new Uint8Array(result.encryptedData.valueBlock.valueHex));
    const secondBlock = cipher.final();

    const buf = adone.util.buffer.toArrayBuffer(Buffer.concat([firstBlock, secondBlock]));

    return asn1.fromBER(buf).result;
}
