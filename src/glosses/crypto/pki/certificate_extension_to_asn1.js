const {
    is
} = adone;

const forge = require("node-forge");
const asn1 = forge.asn1;

/**
 * Converts a single certificate extension to ASN.1.
 *
 * @param ext the extension to convert.
 *
 * @return the extension in ASN.1 format.
 */
export default function certificateExtensionToAsn1(ext) {
    // create a sequence for each extension
    const extseq = asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, []);

    // extnID (OID)
    extseq.value.push(asn1.create(
        asn1.Class.UNIVERSAL, asn1.Type.OID, false,
        asn1.oidToDer(ext.id).getBytes()));

    // critical defaults to false
    if (ext.critical) {
        // critical BOOLEAN DEFAULT FALSE
        extseq.value.push(asn1.create(
            asn1.Class.UNIVERSAL, asn1.Type.BOOLEAN, false,
            String.fromCharCode(0xFF)));
    }

    let value = ext.value;
    if (!is.string(ext.value)) {
        // value is asn.1
        value = asn1.toDer(value).getBytes();
    }

    // extnValue (OCTET STRING)
    extseq.value.push(asn1.create(
        asn1.Class.UNIVERSAL, asn1.Type.OCTETSTRING, false, value));

    return extseq;
}
