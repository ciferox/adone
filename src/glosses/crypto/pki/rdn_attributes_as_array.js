const {
    crypto: { pki }
} = adone;

const __ = adone.getPrivate(adone.crypto.pki);

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
    const value = rdn.valueBlock.value;
    for (let si = 0; si < value.length; ++si) {
        // get the RelativeDistinguishedName set
        set = value[si];

        // each value in the SET is an AttributeTypeAndValue sequence
        // containing first a type (an OID) and second a value (defined by
        // the OID)
        const svalue = set.valueBlock.value;
        for (let i = 0; i < svalue.length; ++i) {
            obj = {};
            attr = svalue[i];
            const vblock = attr.valueBlock;
            obj.type = vblock.value[0].valueBlock.toString();
            obj.value = vblock.value[1].valueBlock.value;
            obj.valueTagClass = vblock.value[1].idBlock.tagNumber;
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
