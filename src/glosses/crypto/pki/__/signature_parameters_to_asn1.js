const {
    is,
    crypto: {
        pki: { oids }
    }
} = adone;

const forge = require("node-forge");
const asn1 = forge.asn1;

/**
 * Convert signature parameters object to ASN.1
 *
 * @param {String} oid Signature algorithm OID
 * @param params The signature parametrs object
 * @return ASN.1 object representing signature parameters
 */
export default function signatureParametersToAsn1(oid, params) {
    switch (oid) {
        case oids["RSASSA-PSS"]: {
            const parts = [];

            if (!is.undefined(params.hash.algorithmOid)) {
                parts.push(asn1.create(asn1.Class.CONTEXT_SPECIFIC, 0, true, [
                    asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
                        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OID, false,
                            asn1.oidToDer(params.hash.algorithmOid).getBytes()),
                        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.NULL, false, "")
                    ])
                ]));
            }

            if (!is.undefined(params.mgf.algorithmOid)) {
                parts.push(asn1.create(asn1.Class.CONTEXT_SPECIFIC, 1, true, [
                    asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
                        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OID, false,
                            asn1.oidToDer(params.mgf.algorithmOid).getBytes()),
                        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
                            asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OID, false,
                                asn1.oidToDer(params.mgf.hash.algorithmOid).getBytes()),
                            asn1.create(asn1.Class.UNIVERSAL, asn1.Type.NULL, false, "")
                        ])
                    ])
                ]));
            }

            if (!is.undefined(params.saltLength)) {
                parts.push(asn1.create(asn1.Class.CONTEXT_SPECIFIC, 2, true, [
                    asn1.create(asn1.Class.UNIVERSAL, asn1.Type.INTEGER, false,
                        asn1.integerToDer(params.saltLength).getBytes())
                ]));
            }

            return asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, parts);
        }
        default:
            return asn1.create(asn1.Class.UNIVERSAL, asn1.Type.NULL, false, "");
    }
}
