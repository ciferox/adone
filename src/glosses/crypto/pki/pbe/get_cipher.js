const {
    crypto: { pki }
} = adone;

/**
 * Get new Forge cipher object instance.
 *
 * @param oid the OID (in string notation).
 * @param params the ASN.1 params object.
 * @param password the password to decrypt with.
 *
 * @return new cipher object instance.
 */
export default function getCipher(oid, params, password) {
    switch (oid) {
        case pki.oids.pkcs5PBES2:
            return pki.pbe.getCipherForPBES2(oid, params, password);

        case pki.oids["pbeWithSHAAnd3-KeyTripleDES-CBC"]:
        case pki.oids["pbewithSHAAnd40BitRC2-CBC"]:
            return pki.pbe.getCipherForPKCS12PBE(oid, params, password);

        default: {
            const error = new Error("Cannot read encrypted PBE data block. Unsupported OID.");
            error.oid = oid;
            error.supportedOids = [
                "pkcs5PBES2",
                "pbeWithSHAAnd3-KeyTripleDES-CBC",
                "pbewithSHAAnd40BitRC2-CBC"
            ];
            throw error;
        }
    }
}
