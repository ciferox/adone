const {
    is,
    crypto: { pki }
} = adone;

const forge = require("node-forge");
const asn1 = forge.asn1;

/**
 * Parses a single certificate extension from ASN.1.
 *
 * @param ext the extension in ASN.1 format.
 *
 * @return the parsed extension as an object.
 */
export default function certificateExtensionFromAsn1(ext) {
    // an extension has:
    // [0] extnID      OBJECT IDENTIFIER
    // [1] critical    BOOLEAN DEFAULT FALSE
    // [2] extnValue   OCTET STRING
    const e = {};
    e.id = asn1.derToOid(ext.value[0].value);
    e.critical = false;
    if (ext.value[1].type === asn1.Type.BOOLEAN) {
        e.critical = (ext.value[1].value.charCodeAt(0) !== 0x00);
        e.value = ext.value[2].value;
    } else {
        e.value = ext.value[1].value;
    }
    // if the oid is known, get its name
    if (e.id in pki.oids) {
        e.name = pki.oids[e.id];

        // handle key usage
        if (e.name === "keyUsage") {
        // get value as BIT STRING
            const ev = asn1.fromDer(e.value);
            let b2 = 0x00;
            let b3 = 0x00;
            if (ev.value.length > 1) {
                // skip first byte, just indicates unused bits which
                // will be padded with 0s anyway
                // get bytes with flag bits
                b2 = ev.value.charCodeAt(1);
                b3 = ev.value.length > 2 ? ev.value.charCodeAt(2) : 0;
            }
            // set flags
            e.digitalSignature = (b2 & 0x80) === 0x80;
            e.nonRepudiation = (b2 & 0x40) === 0x40;
            e.keyEncipherment = (b2 & 0x20) === 0x20;
            e.dataEncipherment = (b2 & 0x10) === 0x10;
            e.keyAgreement = (b2 & 0x08) === 0x08;
            e.keyCertSign = (b2 & 0x04) === 0x04;
            e.cRLSign = (b2 & 0x02) === 0x02;
            e.encipherOnly = (b2 & 0x01) === 0x01;
            e.decipherOnly = (b3 & 0x80) === 0x80;
        } else if (e.name === "basicConstraints") {
            // handle basic constraints
            // get value as SEQUENCE
            const ev = asn1.fromDer(e.value);
            // get cA BOOLEAN flag (defaults to false)
            if (ev.value.length > 0 && ev.value[0].type === asn1.Type.BOOLEAN) {
                e.cA = (ev.value[0].value.charCodeAt(0) !== 0x00);
            } else {
                e.cA = false;
            }
            // get path length constraint
            let value = null;
            if (ev.value.length > 0 && ev.value[0].type === asn1.Type.INTEGER) {
                value = ev.value[0].value;
            } else if (ev.value.length > 1) {
                value = ev.value[1].value;
            }
            if (!is.null(value)) {
                e.pathLenConstraint = asn1.derToInteger(value);
            }
        } else if (e.name === "extKeyUsage") {
            // handle extKeyUsage
            // value is a SEQUENCE of OIDs
            const ev = asn1.fromDer(e.value);
            for (let vi = 0; vi < ev.value.length; ++vi) {
                const oid = asn1.derToOid(ev.value[vi].value);
                if (oid in pki.oids) {
                    e[pki.oids[oid]] = true;
                } else {
                    e[oid] = true;
                }
            }
        } else if (e.name === "nsCertType") {
            // handle nsCertType
            // get value as BIT STRING
            const ev = asn1.fromDer(e.value);
            let b2 = 0x00;
            if (ev.value.length > 1) {
                // skip first byte, just indicates unused bits which
                // will be padded with 0s anyway
                // get bytes with flag bits
                b2 = ev.value.charCodeAt(1);
            }
            // set flags
            e.client = (b2 & 0x80) === 0x80;
            e.server = (b2 & 0x40) === 0x40;
            e.email = (b2 & 0x20) === 0x20;
            e.objsign = (b2 & 0x10) === 0x10;
            e.reserved = (b2 & 0x08) === 0x08;
            e.sslCA = (b2 & 0x04) === 0x04;
            e.emailCA = (b2 & 0x02) === 0x02;
            e.objCA = (b2 & 0x01) === 0x01;
        } else if (
            e.name === "subjectAltName" ||
            e.name === "issuerAltName") {
            // handle subjectAltName/issuerAltName
            e.altNames = [];

            // ev is a SYNTAX SEQUENCE
            let gn;
            const ev = asn1.fromDer(e.value);
            for (let n = 0; n < ev.value.length; ++n) {
                // get GeneralName
                gn = ev.value[n];

                const altName = {
                    type: gn.type,
                    value: gn.value
                };
                e.altNames.push(altName);

                // Note: Support for types 1,2,6,7,8
                switch (gn.type) {
                    // rfc822Name
                    case 1:
                        // dNSName
                    case 2:
                        // uniformResourceIdentifier (URI)
                    case 6:
                        break;
                        // IPAddress
                    case 7:
                        // convert to IPv4/IPv6 string representation
                        altName.ip = forge.util.bytesToIP(gn.value);
                        break;
                        // registeredID
                    case 8:
                        altName.oid = asn1.derToOid(gn.value);
                        break;
                    default:
            // unsupported
                }
            }
        } else if (e.name === "subjectKeyIdentifier") {
            // value is an OCTETSTRING w/the hash of the key-type specific
            // public key structure (eg: RSAPublicKey)
            const ev = asn1.fromDer(e.value);
            e.subjectKeyIdentifier = forge.util.bytesToHex(ev.value);
        }
    }
    return e;
}
