const {
    crypto: { pki }
} = adone;

const forge = require("node-forge");
const asn1 = forge.asn1;

/**
 * Converts X.509v3 certificate extensions to ASN.1.
 *
 * @param exts the extensions to convert.
 *
 * @return the extensions in ASN.1 format.
 */
export default function certificateExtensionsToAsn1(exts) {
    // create top-level extension container
    const rval = asn1.create(asn1.Class.CONTEXT_SPECIFIC, 3, true, []);

    // create extension sequence (stores a sequence for each extension)
    const seq = asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, []);
    rval.value.push(seq);

    for (let i = 0; i < exts.length; ++i) {
        seq.value.push(pki.certificateExtensionToAsn1(exts[i]));
    }

    return rval;
}
