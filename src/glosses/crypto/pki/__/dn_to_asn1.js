const {
    crypto: {
        asn1
    }
} = adone;

/**
 * Converts an X.509 subject or issuer to an ASN.1 RDNSequence.
 *
 * @param obj the subject or issuer (distinguished name).
 *
 * @return the ASN.1 RDNSequence.
 */
export default function dnToAsn1(obj) {
    return new asn1.Sequence({
        value: obj.attributes.map((attr) => {
            const value = attr.value;
            // whether to support custom valueTagClass ??
            // create a RelativeDistinguishedName set
            // each value in the set is an AttributeTypeAndValue first
            // containing the type (an OID) and second the value
            return new asn1.Set({
                value: [
                    new asn1.Sequence({
                        value: [
                            // AttributeType
                            new asn1.ObjectIdentifier({
                                value: attr.type
                            }),
                            // AttributeValue
                            new asn1.PrintableString({
                                value
                            })
                        ]
                    })
                ]
            });
        })
    });
}
