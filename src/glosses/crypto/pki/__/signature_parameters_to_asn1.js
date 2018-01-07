const {
    is,
    crypto: {
        asn1,
        pki: { oids }
    }
} = adone;

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
                parts.push(
                    new asn1.Constructed({
                        idBlock: {
                            tagClass: 3, // CONTEXT_SPECIFIC
                            tagNumber: 0
                        },
                        value: [
                            new asn1.Sequence({
                                value: [
                                    new asn1.ObjectIdentifier({
                                        value: params.hash.algorithmOid
                                    }),
                                    new asn1.Null()
                                ]
                            })
                        ]
                    })
                );
            }

            if (!is.undefined(params.mgf.algorithmOid)) {
                parts.push(
                    new asn1.Constructed({
                        idBlock: {
                            tagClass: 3, // CONTEXT_SPECIFIC
                            tagNumber: 1
                        },
                        value: [
                            new asn1.Sequence({
                                value: [
                                    new asn1.ObjectIdentifier({
                                        value: params.mgf.algorithmOid
                                    }),
                                    new asn1.Sequence({
                                        value: [
                                            new asn1.ObjectIdentifier({
                                                value: params.mgf.hash.algorithmOid
                                            }),
                                            new asn1.Null()
                                        ]
                                    })
                                ]
                            })
                        ]
                    })
                );
            }

            if (!is.undefined(params.saltLength)) {
                parts.push(
                    new asn1.Constructed({
                        idBlock: {
                            tagClass: 3, // CONTEXT_SPECIFIC
                            tagNumber: 2
                        },
                        value: [
                            new asn1.Integer({
                                value: params.saltLength
                            })
                        ]
                    })
                );
            }

            return new asn1.Sequence({
                value: parts
            });
        }
        default:
            return new asn1.Null();
    }
}
