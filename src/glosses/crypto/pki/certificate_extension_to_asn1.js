const {
    is,
    crypto: { asn1 }
} = adone;

/**
 * Converts a single certificate extension to ASN.1.
 *
 * @param ext the extension to convert.
 *
 * @return the extension in ASN.1 format.
 */
export default function certificateExtensionToAsn1(ext) {
    // create a sequence for each extension
    const extseq = new asn1.Sequence({
        value: [
            // extnID (OID)
            new asn1.ObjectIdentifier({
                value: ext.id
            })
        ]
    });

    // critical defaults to false
    if (ext.critical) {
        // critical BOOLEAN DEFAULT FALSE
        extseq.valueBlock.value.push(
            new asn1.Boolean({
                value: true
            })
        );
    }

    let value = ext.value;
    if (!is.string(ext.value)) {
        // value is asn.1
        value = value.toBER();
    } else {
        value = adone.util.bufferToArrayBuffer(Buffer.from(value, "binary"));
    }

    // extnValue (OCTET STRING)
    extseq.valueBlock.value.push(
        new asn1.OctetString({
            valueHex: value
        })
    );

    return extseq;
}
