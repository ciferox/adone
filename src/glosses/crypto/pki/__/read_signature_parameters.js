const {
    is,
    crypto: { pki }
} = adone;

const forge = require("node-forge");
const asn1 = forge.asn1;

const rsassaPssParameterValidator = {
    name: "rsapss",
    tagClass: asn1.Class.UNIVERSAL,
    type: asn1.Type.SEQUENCE,
    constructed: true,
    value: [{
        name: "rsapss.hashAlgorithm",
        tagClass: asn1.Class.CONTEXT_SPECIFIC,
        type: 0,
        constructed: true,
        value: [{
            name: "rsapss.hashAlgorithm.AlgorithmIdentifier",
            tagClass: asn1.Class.UNIVERSAL,
            type: asn1.Class.SEQUENCE,
            constructed: true,
            optional: true,
            value: [{
                name: "rsapss.hashAlgorithm.AlgorithmIdentifier.algorithm",
                tagClass: asn1.Class.UNIVERSAL,
                type: asn1.Type.OID,
                constructed: false,
                capture: "hashOid"
                /* parameter block omitted, for SHA1 NULL anyhow. */
            }]
        }]
    }, {
        name: "rsapss.maskGenAlgorithm",
        tagClass: asn1.Class.CONTEXT_SPECIFIC,
        type: 1,
        constructed: true,
        value: [{
            name: "rsapss.maskGenAlgorithm.AlgorithmIdentifier",
            tagClass: asn1.Class.UNIVERSAL,
            type: asn1.Class.SEQUENCE,
            constructed: true,
            optional: true,
            value: [{
                name: "rsapss.maskGenAlgorithm.AlgorithmIdentifier.algorithm",
                tagClass: asn1.Class.UNIVERSAL,
                type: asn1.Type.OID,
                constructed: false,
                capture: "maskGenOid"
            }, {
                name: "rsapss.maskGenAlgorithm.AlgorithmIdentifier.params",
                tagClass: asn1.Class.UNIVERSAL,
                type: asn1.Type.SEQUENCE,
                constructed: true,
                value: [{
                    name: "rsapss.maskGenAlgorithm.AlgorithmIdentifier.params.algorithm",
                    tagClass: asn1.Class.UNIVERSAL,
                    type: asn1.Type.OID,
                    constructed: false,
                    capture: "maskGenHashOid"
                    /* parameter block omitted, for SHA1 NULL anyhow. */
                }]
            }]
        }]
    }, {
        name: "rsapss.saltLength",
        tagClass: asn1.Class.CONTEXT_SPECIFIC,
        type: 2,
        optional: true,
        value: [{
            name: "rsapss.saltLength.saltLength",
            tagClass: asn1.Class.UNIVERSAL,
            type: asn1.Class.INTEGER,
            constructed: false,
            capture: "saltLength"
        }]
    }, {
        name: "rsapss.trailerField",
        tagClass: asn1.Class.CONTEXT_SPECIFIC,
        type: 3,
        optional: true,
        value: [{
            name: "rsapss.trailer.trailer",
            tagClass: asn1.Class.UNIVERSAL,
            type: asn1.Class.INTEGER,
            constructed: false,
            capture: "trailer"
        }]
    }]
};

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

    const capture = {};
    const errors = [];
    if (!asn1.validate(obj, rsassaPssParameterValidator, capture, errors)) {
        const error = new Error("Cannot read RSASSA-PSS parameter block.");
        error.errors = errors;
        throw error;
    }

    if (!is.undefined(capture.hashOid)) {
        params.hash = params.hash || {};
        params.hash.algorithmOid = asn1.derToOid(capture.hashOid);
    }

    if (!is.undefined(capture.maskGenOid)) {
        params.mgf = params.mgf || {};
        params.mgf.algorithmOid = asn1.derToOid(capture.maskGenOid);
        params.mgf.hash = params.mgf.hash || {};
        params.mgf.hash.algorithmOid = asn1.derToOid(capture.maskGenHashOid);
    }

    if (!is.undefined(capture.saltLength)) {
        params.saltLength = capture.saltLength.charCodeAt(0);
    }

    return params;
}

