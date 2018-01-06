const forge = require("node-forge");
const asn1 = forge.asn1;

/**
 * Converts an X.509 subject or issuer to an ASN.1 RDNSequence.
 *
 * @param obj the subject or issuer (distinguished name).
 *
 * @return the ASN.1 RDNSequence.
 */
export default function dnToAsn1(obj) {
    // create an empty RDNSequence
    const rval = asn1.create(
        asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, []);

    // iterate over attributes
    let attr;
    let set;
    const attrs = obj.attributes;
    for (let i = 0; i < attrs.length; ++i) {
        attr = attrs[i];
        let value = attr.value;

        // reuse tag class for attribute value if available
        let valueTagClass = asn1.Type.PRINTABLESTRING;
        if ("valueTagClass" in attr) {
            valueTagClass = attr.valueTagClass;

            if (valueTagClass === asn1.Type.UTF8) {
                value = forge.util.encodeUtf8(value);
            }
        // FIXME: handle more encodings
        }

        // create a RelativeDistinguishedName set
        // each value in the set is an AttributeTypeAndValue first
        // containing the type (an OID) and second the value
        set = asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SET, true, [
            asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
                // AttributeType
                asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OID, false,
                    asn1.oidToDer(attr.type).getBytes()),
                // AttributeValue
                asn1.create(asn1.Class.UNIVERSAL, valueTagClass, false, value)
            ])
        ]);
        rval.value.push(set);
    }

    return rval;
}
