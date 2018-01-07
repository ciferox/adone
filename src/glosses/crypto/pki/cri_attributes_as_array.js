const {
    crypto: { pki }
} = adone;

const __ = adone.private(pki);

/**
 * Converts ASN.1 CRIAttributes into an array with objects that have type and
 * value properties.
 *
 * @param attributes the CRIAttributes to convert.
 */
export default function CRIAttributesAsArray(attributes) {
    const rval = [];

    // each value in 'attributes' in is a SEQUENCE with an OID and a SET
    attributes = attributes.valueBlock.value;
    for (let si = 0; si < attributes.length; ++si) {
        // get the attribute sequence
        const seq = attributes[si];

        // each value in the SEQUENCE containing first a type (an OID) and
        // second a set of values (defined by the OID)
        const svalue = seq.valueBlock.value;
        const type = svalue[0].valueBlock.toString();

        const s1value = svalue[1].valueBlock.value;
        for (let vi = 0; vi < s1value.length; ++vi) {
            const obj = {};
            obj.type = type;
            const value = s1value[vi].valueBlock.value;
            obj.valueTagClass = s1value[vi].idBlock.tagNumber;
            // if the OID is known, get its name and short name
            if (obj.type in pki.oids) {
                obj.name = pki.oids[obj.type];
                if (obj.name in __.shortNames) {
                    obj.shortName = __.shortNames[obj.name];
                }
            }
            // parse extensions
            if (obj.type === pki.oids.extensionRequest) {
                obj.extensions = [];
                for (let ei = 0; ei < value.length; ++ei) {
                    obj.extensions.push(pki.certificateExtensionFromAsn1(value[ei]));
                }
            } else {
                obj.value = value;
            }
            rval.push(obj);
        }
    }

    return rval;
}
