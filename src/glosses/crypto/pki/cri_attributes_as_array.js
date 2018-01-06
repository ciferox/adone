const {
    crypto: { pki }
} = adone;

const __ = adone.private(pki);
const forge = require("node-forge");
const asn1 = forge.asn1;

/**
 * Converts ASN.1 CRIAttributes into an array with objects that have type and
 * value properties.
 *
 * @param attributes the CRIAttributes to convert.
 */
export default function CRIAttributesAsArray(attributes) {
    const rval = [];

    // each value in 'attributes' in is a SEQUENCE with an OID and a SET
    for (let si = 0; si < attributes.length; ++si) {
        // get the attribute sequence
        const seq = attributes[si];

        // each value in the SEQUENCE containing first a type (an OID) and
        // second a set of values (defined by the OID)
        const type = asn1.derToOid(seq.value[0].value);
        const values = seq.value[1].value;
        for (let vi = 0; vi < values.length; ++vi) {
            const obj = {};
            obj.type = type;
            obj.value = values[vi].value;
            obj.valueTagClass = values[vi].type;
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
                for (let ei = 0; ei < obj.value.length; ++ei) {
                    obj.extensions.push(pki.certificateExtensionFromAsn1(obj.value[ei]));
                }
            }
            rval.push(obj);
        }
    }

    return rval;
}
