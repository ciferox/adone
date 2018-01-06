const forge = require("node-forge");
const asn1 = forge.asn1;

/**
 * Converts a certification request's attributes to an ASN.1 set of
 * CRIAttributes.
 *
 * @param csr certification request.
 *
 * @return the ASN.1 set of CRIAttributes.
 */
export default function CRIAttributesToAsn1(csr) {
    // create an empty context-specific container
    const rval = asn1.create(asn1.Class.CONTEXT_SPECIFIC, 0, true, []);

    // no attributes, return empty container
    if (csr.attributes.length === 0) {
        return rval;
    }

    // each attribute has a sequence with a type and a set of values
    const attrs = csr.attributes;
    for (let i = 0; i < attrs.length; ++i) {
        const attr = attrs[i];
        let value = attr.value;

        // reuse tag class for attribute value if available
        let valueTagClass = asn1.Type.UTF8;
        if ("valueTagClass" in attr) {
            valueTagClass = attr.valueTagClass;
        }
        if (valueTagClass === asn1.Type.UTF8) {
            value = forge.util.encodeUtf8(value);
        }
        let valueConstructed = false;
        if ("valueConstructed" in attr) {
            valueConstructed = attr.valueConstructed;
        }
        // FIXME: handle more encodings

        // create a RelativeDistinguishedName set
        // each value in the set is an AttributeTypeAndValue first
        // containing the type (an OID) and second the value
        const seq = asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
        // AttributeType
            asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OID, false,
                asn1.oidToDer(attr.type).getBytes()),
            asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SET, true, [
                // AttributeValue
                asn1.create(
                    asn1.Class.UNIVERSAL, valueTagClass, valueConstructed, value)
            ])
        ]);
        rval.value.push(seq);
    }

    return rval;
}

