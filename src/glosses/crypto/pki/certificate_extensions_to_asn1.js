const {
    crypto: {
        pki,
        asn1
    }
} = adone;

/**
 * Converts X.509v3 certificate extensions to ASN.1.
 *
 * @param exts the extensions to convert.
 *
 * @return the extensions in ASN.1 format.
 */
export default function certificateExtensionsToAsn1(exts) {
    return new asn1.Constructed({
        idBlock: {
            tagClass: 3, // CONTEXT_SPECIFIC
            tagNumber: 3
        },
        value: [
            new asn1.Sequence({
                value: exts.map(pki.certificateExtensionToAsn1)
            })
        ]
    });
}
