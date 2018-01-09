const {
    crypto
} = adone;

const {
    pki,
    asn1
} = crypto;

// validator for a PBES2Algorithms structure
// Note: Currently only works w/PBKDF2 + AES encryption schemes
const PBES2AlgorithmsValidator = new asn1.Sequence({
    value: [
        new asn1.Sequence({
            name: "keyDerivationFunc",
            value: [
                new asn1.ObjectIdentifier({
                    name: "kdfOid"
                }),
                new asn1.Sequence({
                    name: "kdfParams",
                    value: [
                        new asn1.OctetString({
                            name: "kdfSalt"
                        }),
                        new asn1.Integer({
                            name: "kdfIterationCount"
                        }),
                        new asn1.Integer({
                            optional: true,
                            name: "keyLength"
                        }),
                        new asn1.Sequence({
                            // prf
                            optional: true,
                            value: [
                                new asn1.ObjectIdentifier({
                                    name: "prfOid"
                                })
                            ]
                        })
                    ]
                })
            ]
        }),
        new asn1.Sequence({
            value: [
                new asn1.ObjectIdentifier({
                    name: "encOid"
                }),
                new asn1.OctetString({
                    name: "encIv"
                })
            ]
        })
    ]
});

/**
 * Get new Forge cipher object instance according to PBES2 params block.
 *
 * The returned cipher instance is already started using the IV
 * from PBES2 parameter block.
 *
 * @param oid the PKCS#5 PBKDF2 OID (in string notation).
 * @param params the ASN.1 PBES2-params object.
 * @param password the password to decrypt with.
 *
 * @return new cipher object instance.
 */
export default function getCipherForPBES2(oid, params, password) {
    const validation = asn1.compareSchema(params, params, PBES2AlgorithmsValidator);

    if (!validation.verified) {
        throw new Error("Cannot read password-based-encryption algorithm parameters. ASN.1 object is not a supported EncryptedPrivateKeyInfo.");
    }

    const { result } = validation;

    // check oids
    oid = result.kdfOid.valueBlock.toString();
    if (oid !== pki.oids.pkcs5PBKDF2) {
        const error = new Error("Cannot read encrypted private key. Unsupported key derivation function OID.");
        error.oid = oid;
        error.supportedOids = ["pkcs5PBKDF2"];
        throw error;
    }
    oid = result.encOid.valueBlock.toString();

    if (
        oid !== pki.oids["aes128-CBC"]
        && oid !== pki.oids["aes192-CBC"]
        && oid !== pki.oids["aes256-CBC"]
        && oid !== pki.oids["des-EDE3-CBC"]
        && oid !== pki.oids.desCBC
    ) {
        const error = new Error("Cannot read encrypted private key. Unsupported encryption scheme OID.");
        error.oid = oid;
        error.supportedOids = ["aes128-CBC", "aes192-CBC", "aes256-CBC", "des-EDE3-CBC", "desCBC"];
        throw error;
    }

    // set PBE params
    const salt = Buffer.from(result.kdfSalt.valueBlock.valueHex);
    const count = result.kdfIterationCount.valueBlock.valueDec;

    let dkLen;
    let algorithm;
    switch (pki.oids[oid]) {
        case "aes128-CBC":
            dkLen = 16;
            // TODO: normalize it
            algorithm = "aes-128-cbc";
            break;
        case "aes192-CBC":
            dkLen = 24;
            algorithm = "aes-192-cbc";
            break;
        case "aes256-CBC":
            dkLen = 32;
            algorithm = "aes-256-cbc";
            break;
        case "des-EDE3-CBC":
            dkLen = 24;
            algorithm = "des-ede3-cbc";
            break;
        case "desCBC":
            dkLen = 8;
            algorithm = "des-cbc";
            break;
    }

    let mdAlgo;

    if (result.prfOid) {
        const prfOid = result.prfOid.valueBlock.toString();
        const algo = pki.oids[prfOid];
        if (!algo) {
            const error = new Error("Unsupported PRF OID.");
            error.oid = prfOid;
            error.supported = [
                "hmacWithSHA1",
                "hmacWithSHA224",
                "hmacWithSHA256",
                "hmacWithSHA384",
                "hmacWithSHA512"
            ];
            throw error;
        }
        mdAlgo = algo.slice(8); // TODO: normalize it
    } else {
        mdAlgo = "SHA1";
    }

    // decrypt private key using pbe with chosen PRF and AES/DES
    const dk = crypto.pkcs5.pbkdf2Sync(password, salt, count, dkLen, mdAlgo);
    const iv = Buffer.from(result.encIv.valueBlock.valueHex);

    return adone.std.crypto.createDecipheriv(algorithm, dk, iv);
}
