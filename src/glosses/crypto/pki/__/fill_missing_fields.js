const {
    is,
    crypto: { pki }
} = adone;

const __ = adone.private(pki);

const forge = require("node-forge");
const asn1 = forge.asn1;

/**
 * Fills in missing fields in attributes.
 *
 * @param attrs the attributes to fill missing fields in.
 */
export default function fillMissingFields(attrs) {
    let attr;
    for (let i = 0; i < attrs.length; ++i) {
        attr = attrs[i];

        // populate missing name
        if (is.undefined(attr.name)) {
            if (attr.type && attr.type in pki.oids) {
                attr.name = pki.oids[attr.type];
            } else if (attr.shortName && attr.shortName in __.shortNames) {
                attr.name = pki.oids[__.shortNames[attr.shortName]];
            }
        }

        // populate missing type (OID)
        if (is.undefined(attr.type)) {
            if (attr.name && attr.name in pki.oids) {
                attr.type = pki.oids[attr.name];
            } else {
                const error = new Error("Attribute type not specified.");
                error.attribute = attr;
                throw error;
            }
        }

        // populate missing shortname
        if (is.undefined(attr.shortName)) {
            if (attr.name && attr.name in __.shortNames) {
                attr.shortName = __.shortNames[attr.name];
            }
        }

        // convert extensions to value
        if (attr.type === pki.oids.extensionRequest) {
            attr.valueConstructed = true;
            attr.valueTagClass = asn1.Type.SEQUENCE;
            if (!attr.value && attr.extensions) {
                attr.value = [];
                for (let ei = 0; ei < attr.extensions.length; ++ei) {
                    attr.value.push(pki.certificateExtensionToAsn1(__.fillMissingExtensionFields(attr.extensions[ei])));
                }
            }
        }

        if (is.undefined(attr.value)) {
            const error = new Error("Attribute value not specified.");
            error.attribute = attr;
            throw error;
        }
    }
}
