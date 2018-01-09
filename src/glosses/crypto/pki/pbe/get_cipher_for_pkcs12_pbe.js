const {
    crypto: {
        pki,
        asn1
    }
} = adone;

const pkcs12PbeParamsValidator = new asn1.Sequence({
    value: [
        new asn1.OctetString({
            name: "salt"
        }),
        new asn1.Integer({
            name: "iterations"
        })
    ]
});

/**
 * Get new Forge cipher object instance for PKCS#12 PBE.
 *
 * The returned cipher instance is already started using the key & IV
 * derived from the provided password and PKCS#12 PBE salt.
 *
 * @param oid The PKCS#12 PBE OID (in string notation).
 * @param params The ASN.1 PKCS#12 PBE-params object.
 * @param {Buffer | string} password The password to decrypt with.
 *
 * @return the new cipher object instance.
 */
export default function getCipherForPKCS12PBE(oid, params, password) {
    const validation = asn1.compareSchema(params, params, pkcs12PbeParamsValidator);

    if (!validation.verified) {
        throw new Error("Cannot read password-based-encryption algorithm parameters. ASN.1 object is not a supported EncryptedPrivateKeyInfo.");
    }

    const { result } = validation;

    const salt = Buffer.from(result.salt.valueBlock.valueHex);
    const count = result.iterations.valueBlock.valueDec;

    let dkLen;
    let dIvLen;
    let algorithm;
    switch (oid) {
        case pki.oids["pbeWithSHAAnd3-KeyTripleDES-CBC"]:
            dkLen = 24;
            dIvLen = 8;
            algorithm = "des-ede3-cbc";
            break;

        case pki.oids["pbewithSHAAnd40BitRC2-CBC"]:
            dkLen = 5;
            dIvLen = 8;
            algorithm = "rc2-40-cbc";
            break;

        default: {
            const error = new Error("Cannot read PKCS #12 PBE data block. Unsupported OID.");
            error.oid = oid;
            throw error;
        }
    }

    // get PRF message digest
    const key = pki.pbe.generatePKCS12Key(password, salt, 1, count, dkLen);
    const iv = pki.pbe.generatePKCS12Key(password, salt, 2, count, dIvLen);

    return adone.std.crypto.createDecipheriv(algorithm, key, iv);
}
