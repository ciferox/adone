const {
    crypto
} = adone;

const {
    pki,
    asn1
} = crypto;

const createPbkdf2Params = (salt, countBytes, dkLen, prfAlgorithm) => {
    const params = new asn1.Sequence({
        value: [
            // salt
            new asn1.OctetString({
                valueHex: adone.util.buffer.toArrayBuffer(salt)
            }),
            // iteration count
            new asn1.Integer({
                value: countBytes
            })
        ]
    });
    // when PRF algorithm is not SHA-1 default, add key length and PRF algorithm
    if (prfAlgorithm !== "hmacWithSHA1") {
        params.valueBlock.value.push(
            // key length
            new asn1.Integer({
                value: dkLen
            }),
            // AlgorithmIdentifier
            new asn1.Sequence({
                value: [
                    // algorithm
                    new asn1.ObjectIdentifier({
                        value: pki.oids[prfAlgorithm]
                    }),
                    // parameters (null)
                    new asn1.Null()
                ]
            })
        );
    }
    return params;
};


/**
 * Encrypts a ASN.1 PrivateKeyInfo object, producing an EncryptedPrivateKeyInfo.
 *
 * PBES2Algorithms ALGORITHM-IDENTIFIER ::=
 *   { {PBES2-params IDENTIFIED BY id-PBES2}, ...}
 *
 * id-PBES2 OBJECT IDENTIFIER ::= {pkcs-5 13}
 *
 * PBES2-params ::= SEQUENCE {
 *   keyDerivationFunc AlgorithmIdentifier {{PBES2-KDFs}},
 *   encryptionScheme AlgorithmIdentifier {{PBES2-Encs}}
 * }
 *
 * PBES2-KDFs ALGORITHM-IDENTIFIER ::=
 *   { {PBKDF2-params IDENTIFIED BY id-PBKDF2}, ... }
 *
 * PBES2-Encs ALGORITHM-IDENTIFIER ::= { ... }
 *
 * PBKDF2-params ::= SEQUENCE {
 *   salt CHOICE {
 *     specified OCTET STRING,
 *     otherSource AlgorithmIdentifier {{PBKDF2-SaltSources}}
 *   },
 *   iterationCount INTEGER (1..MAX),
 *   keyLength INTEGER (1..MAX) OPTIONAL,
 *   prf AlgorithmIdentifier {{PBKDF2-PRFs}} DEFAULT algid-hmacWithSHA1
 * }
 *
 * @param obj the ASN.1 PrivateKeyInfo object.
 * @param password the password to encrypt with.
 * @param options:
 *          algorithm the encryption algorithm to use
 *            ('aes128', 'aes192', 'aes256', '3des'), defaults to 'aes128'.
 *          count the iteration count to use.
 *          saltSize the salt size to use.
 *          prfAlgorithm the PRF message digest algorithm to use
 *            ('sha1', 'sha224', 'sha256', 'sha384', 'sha512')
 *
 * @return the ASN.1 EncryptedPrivateKeyInfo.
 */
export default function encryptPrivateKeyInfo(obj, password, options) {
    // set default options
    options = options || {};
    options.saltSize = options.saltSize || 8;
    options.count = options.count || 2048;
    options.algorithm = options.algorithm || "aes128";
    options.prfAlgorithm = options.prfAlgorithm || "sha1";

    // generate PBE params
    const salt = crypto.random.getBytesSync(options.saltSize);
    const count = options.count;
    let dkLen;
    let encryptionAlgorithm;
    let encryptedData;
    if (options.algorithm.startsWith("aes") || options.algorithm === "des") {
        // do PBES2
        let ivLen;
        let algorithm;
        let encOid;
        switch (options.algorithm) {
            case "aes128":
                dkLen = 16;
                ivLen = 16;
                algorithm = "aes-128-cbc";
                // TODO: normalize names
                encOid = pki.oids["aes128-CBC"];
                break;
            case "aes192":
                dkLen = 24;
                ivLen = 16;
                algorithm = "aes-192-cbc";
                encOid = pki.oids["aes192-CBC"];
                break;
            case "aes256":
                dkLen = 32;
                ivLen = 16;
                algorithm = "aes-256-cbc";
                encOid = pki.oids["aes256-CBC"];
                break;
            case "des":
                dkLen = 8;
                ivLen = 8;
                algorithm = "des-cbc";
                encOid = pki.oids.desCBC;
                break;
            default: {
                const error = new Error("Cannot encrypt private key. Unknown encryption algorithm.");
                error.algorithm = options.algorithm;
                throw error;
            }
        }

        // get PRF message digest
        const prfAlgorithm = `hmacWith${options.prfAlgorithm.toUpperCase()}`;

        // encrypt private key using pbe SHA-1 and AES/DES
        const dk = crypto.pkcs5.pbkdf2Sync(password, salt, count, dkLen, options.prfAlgorithm.toUpperCase());
        const iv = crypto.random.getBytesSync(ivLen);
        const cipher = adone.std.crypto.createCipheriv(algorithm, dk, iv);
        const firstBlock = cipher.update(new Uint8Array(obj.toBER()));
        const secondBlock = cipher.final();
        encryptedData = Buffer.concat([firstBlock, secondBlock]);

        encryptionAlgorithm = new asn1.Sequence({
            value: [
                new asn1.ObjectIdentifier({
                    value: pki.oids.pkcs5PBES2
                }),
                new asn1.Sequence({
                    value: [
                        // keyDerivationFunc
                        new asn1.Sequence({
                            value: [
                                new asn1.ObjectIdentifier({
                                    value: pki.oids.pkcs5PBKDF2
                                }),
                                createPbkdf2Params(salt, count, dkLen, prfAlgorithm)
                            ]
                        }),
                        // encryptionScheme
                        new asn1.Sequence({
                            value: [
                                new asn1.ObjectIdentifier({
                                    value: encOid
                                }),
                                // iv
                                new asn1.OctetString({
                                    valueHex: adone.util.buffer.toArrayBuffer(iv)
                                })
                            ]
                        })
                    ]
                })
            ]
        });
    } else if (options.algorithm === "3des") {
        // Do PKCS12 PBE
        const dk = pki.pbe.generatePKCS12Key(password, salt, 1, count, 24);
        const iv = pki.pbe.generatePKCS12Key(password, salt, 2, count, 8);

        const cipher = adone.std.crypto.createCipheriv("des-ede3-cbc", dk, iv);

        const firstBlock = cipher.update(new Uint8Array(obj.toBER()));
        const secondBlock = cipher.final();

        encryptedData = Buffer.concat([firstBlock, secondBlock]);

        encryptionAlgorithm = new asn1.Sequence({
            value: [
                new asn1.ObjectIdentifier({
                    value: pki.oids["pbeWithSHAAnd3-KeyTripleDES-CBC"]
                }),
                // pkcs-12PbeParams
                new asn1.Sequence({
                    value: [
                        // salt
                        new asn1.OctetString({
                            valueHex: adone.util.buffer.toArrayBuffer(salt)
                        }),
                        // iteration count
                        new asn1.Integer({
                            value: count
                        })
                    ]
                })
            ]
        });
    } else {
        const error = new Error("Cannot encrypt private key. Unknown encryption algorithm.");
        error.algorithm = options.algorithm;
        throw error;
    }

    // EncryptedPrivateKeyInfo
    return new asn1.Sequence({
        value: [
            encryptionAlgorithm,
            // encryptedData
            new asn1.OctetString({
                valueHex: adone.util.buffer.toArrayBuffer(encryptedData)
            })
        ]
    });
}
