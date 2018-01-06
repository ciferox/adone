const {
    crypto: { pki }
} = adone;

const __ = adone.private(adone.crypto.pki);

const forge = require("node-forge");
const asn1 = forge.asn1;

/**
 * Converts an RDNSequence of ASN.1 DER-encoded RelativeDistinguishedName
 * sets into an array with objects that have type and value properties.
 *
 * @param rdn the RDNSequence to convert.
 * @param md a message digest to append type and value to if provided.
 */
export default function RDNAttributesAsArray(rdn, md) {
    const rval = [];

    // each value in 'rdn' in is a SET of RelativeDistinguishedName
    let set;
    let attr;
    let obj;
    for (let si = 0; si < rdn.value.length; ++si) {
        // get the RelativeDistinguishedName set
        set = rdn.value[si];

        // each value in the SET is an AttributeTypeAndValue sequence
        // containing first a type (an OID) and second a value (defined by
        // the OID)
        for (let i = 0; i < set.value.length; ++i) {
            obj = {};
            attr = set.value[i];
            obj.type = asn1.derToOid(attr.value[0].value);
            obj.value = attr.value[1].value;
            obj.valueTagClass = attr.value[1].type;
            // if the OID is known, get its name and short name
            if (obj.type in pki.oids) {
                obj.name = pki.oids[obj.type];
                if (obj.name in __.shortNames) {
                    obj.shortName = __.shortNames[obj.name];
                }
            }
            if (md) {
                md.update(obj.type);
                md.update(obj.value);
            }
            rval.push(obj);
        }
    }

    return rval;
}
