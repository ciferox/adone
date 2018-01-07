const {
    crypto: {
        pki,
        asn1
    }
} = adone;

const rsassaPssParameterValidator = new asn1.Sequence({
    name: "rsapss",
    value: [
        new asn1.Constructed({
            name: "hashAlgorithm",
            idBlock: {
                tagClass: 3, // CONTEXT_SPECIFIC
                tagNumber: 0
            },
            value: [
                new asn1.Sequence({
                    value: [
                        new asn1.ObjectIdentifier({
                            name: "hashOid"
                            /* parameter block omitted, for SHA1 NULL anyhow. */
                        })
                    ]
                })
            ]
        }),
        new asn1.Constructed({
            name: "maskGenAlgorithm",
            idBlock: {
                tagClass: 3, // CONTEXT_SPECIFIC
                tagNumber: 1
            },
            value: [
                new asn1.Sequence({
                    optional: true,
                    value: [
                        new asn1.ObjectIdentifier({
                            name: "maskGenOid"
                        }),
                        new asn1.Sequence({
                            value: [
                                new asn1.ObjectIdentifier({
                                    name: "maskGenHashOid"
                                    /* parameter block omitted, for SHA1 NULL anyhow. */
                                })
                            ]
                        })
                    ]
                })
            ]
        }),
        new asn1.Constructed({
            idBlock: {
                tagClass: 3, // CONTEXT_SPECIFIC
                tagNumber: 2
            },
            optional: true,
            value: [
                new asn1.Integer({
                    name: "saltLength"
                })
            ]
        }),
        new asn1.Constructed({
            idBlock: {
                tagClass: 3, // CONTEXT_SPECIFIC
                tagNumber: 3
            },
            optional: true,
            value: [
                new asn1.Integer({
                    name: "trailer"
                })
            ]
        })
    ]
});

/**
 * Converts signature parameters from ASN.1 structure.
 *
 * Currently only RSASSA-PSS supported.  The PKCS#1 v1.5 signature scheme had
 * no parameters.
 *
 * RSASSA-PSS-params  ::=  SEQUENCE  {
 *   hashAlgorithm      [0] HashAlgorithm DEFAULT
 *                             sha1Identifier,
 *   maskGenAlgorithm   [1] MaskGenAlgorithm DEFAULT
 *                             mgf1SHA1Identifier,
 *   saltLength         [2] INTEGER DEFAULT 20,
 *   trailerField       [3] INTEGER DEFAULT 1
 * }
 *
 * HashAlgorithm  ::=  AlgorithmIdentifier
 *
 * MaskGenAlgorithm  ::=  AlgorithmIdentifier
 *
 * AlgorithmIdentifer ::= SEQUENCE {
 *   algorithm OBJECT IDENTIFIER,
 *   parameters ANY DEFINED BY algorithm OPTIONAL
 * }
 *
 * @param oid The OID specifying the signature algorithm
 * @param obj The ASN.1 structure holding the parameters
 * @param fillDefaults Whether to use return default values where omitted
 * @return signature parameter object
 */
export default function readSignatureParameters(oid, obj, fillDefaults) {
    let params = {};

    if (oid !== pki.oids["RSASSA-PSS"]) {
        return params;
    }

    if (fillDefaults) {
        params = {
            hash: {
                algorithmOid: pki.oids.sha1
            },
            mgf: {
                algorithmOid: pki.oids.mgf1,
                hash: {
                    algorithmOid: pki.oids.sha1
                }
            },
            saltLength: 20
        };
    }

    const validation = asn1.compareSchema(obj, obj, rsassaPssParameterValidator);
    if (!validation.verified) {
        throw new Error("Cannot read RSASSA-PSS parameter block.");
    }

    const { result } = validation;

    if (result.hashOid) {
        params.hash = params.hash || {};
        params.hash.algorithmOid = result.hashOid.valueBlock.toString();
    }

    if (result.maskGenOid) {
        params.mgf = params.mgf || {};
        params.mgf.algorithmOid = result.maskGenOid.valueBlock.toString();
        params.mgf.hash = params.mgf.hash || {};
        params.mgf.hash.algorithmOid = result.maskGenHashOid.valueBlock.toString();
    }

    if (result.saltLength) {
        params.saltLength = result.saltLength.valueBlock.valueDec;
    }

    return params;
}

