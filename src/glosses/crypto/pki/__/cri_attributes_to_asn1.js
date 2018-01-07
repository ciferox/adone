const {
    crypto: {
        asn1,
        pki
    }
} = adone;

const __ = adone.private(pki);

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
    const rval = new asn1.Constructed({
        idBlock: {
            tagClass: 3, // CONTEXT_SPECIFIC
            tagNumber: 0
        }
    });

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
        let valueTagClass = 12; // UTF8
        if ("valueTagClass" in attr) {
            valueTagClass = attr.valueTagClass;
        }
        if (valueTagClass === 12) { // UTF8
            value = __.encodeUtf8(value);
        }
        let valueConstructed = false;
        if ("valueConstructed" in attr) {
            valueConstructed = attr.valueConstructed;
        }
        // FIXME: handle more encodings

        // create a RelativeDistinguishedName set
        // each value in the set is an AttributeTypeAndValue first
        // containing the type (an OID) and second the value
        const idBlock = {
            tagClass: 1, // UNIVERSAL
            tagNumber: valueTagClass
        };

        let attrValue;
        if (valueConstructed) {
            attrValue = new asn1.Constructed({
                idBlock,
                value
            });
        } else {
            attrValue = new asn1.Primitive({
                idBlock,
                valueHex: adone.util.bufferToArrayBuffer(Buffer.from(value, "binary"))
            });
        }

        const seq = new asn1.Sequence({
            value: [
                // AttributeType
                new asn1.ObjectIdentifier({
                    value: attr.type
                }),
                new asn1.Set({
                    value: [
                        // AttributeValue
                        attrValue
                    ]
                })
            ]
        });
        rval.valueBlock.value.push(seq);
    }

    return rval;
}

