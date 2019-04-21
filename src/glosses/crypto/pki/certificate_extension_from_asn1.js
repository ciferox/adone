const {
    crypto: {
        pki,
        asn1
    }
} = adone;

const __ = adone.getPrivate(pki);

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
    const vblock = ext.valueBlock;
    const e = {};
    e.id = vblock.value[0].valueBlock.toString();
    e.critical = false;
    if (vblock.value[1].idBlock.tagNumber === 1) { // BOOLEAN
        e.critical = vblock.value[1].valueBlock.value;
        e.value = Buffer.from(vblock.value[2].valueBlock.valueHex);
    } else {
        e.value = Buffer.from(vblock.value[1].valueBlock.valueHex);
    }
    // if the oid is known, get its name
    if (e.id in pki.oids) {
        e.name = pki.oids[e.id];

        // handle key usage
        if (e.name === "keyUsage") {
            // get value as BIT STRING
            const ev = asn1.fromBER(adone.util.buffer.toArrayBuffer(e.value)).result;
            let b2 = 0x00;
            let b3 = 0x00;
            if (ev.valueBlock.valueHex.length > 1) {
                const view = new Uint8Array(ev.valueBlock.valueHex);
                // skip first byte, just indicates unused bits which
                // will be padded with 0s anyway
                // get bytes with flag bits
                b2 = view[1];
                b3 = view.length > 2 ? view[2] : 0;
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
            const ev = asn1.fromBER(adone.util.buffer.toArrayBuffer(e.value)).result;

            // get cA BOOLEAN flag (defaults to false)
            if (ev.valueBlock.value.length > 0 && ev.valueBlock.value[0].idBlock.tagNumber === 1) { // BOOLEAN
                e.cA = ev.valueBlock.value[0].valueBlock.value;
            } else {
                e.cA = false;
            }
            // get path length constraint
            let value = null;
            if (ev.valueBlock.value.length > 0 && ev.valueBlock.value[0].idBlock.tagNumber === 2) { // INTEGER
                value = ev.valueBlock.value[0].valueBlock.valueDec;
            } else if (ev.valueBlock.value.length > 1) {
                value = ev.valueBlock.value[1].valueBlock.valueDec;
            }
            e.pathLenConstraint = value;
        } else if (e.name === "extKeyUsage") {
            // handle extKeyUsage
            // value is a SEQUENCE of OIDs
            const ev = asn1.fromBER(adone.util.buffer.toArrayBuffer(e.value)).result;
            for (let vi = 0; vi < ev.valueBlock.value.length; ++vi) {
                const oid = ev.valueBlock.value[vi].valueBlock.toString();
                if (oid in pki.oids) {
                    e[pki.oids[oid]] = true;
                } else {
                    e[oid] = true;
                }
            }
        } else if (e.name === "nsCertType") {
            // handle nsCertType
            // get value as BIT STRING
            const ev = asn1.fromBER(adone.util.buffer.toArrayBuffer(e.value)).result;
            let b2 = 0x00;
            if (ev.valueBlock.valueHex.length > 1) {
                // skip first byte, just indicates unused bits which
                // will be padded with 0s anyway
                // get bytes with flag bits
                const view = new Uint8Array(ev.valueBlock.valueHex);
                b2 = view[1];
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
        } else if (e.name === "subjectAltName" || e.name === "issuerAltName") {
            // handle subjectAltName/issuerAltName
            e.altNames = [];

            // ev is a SYNTAX SEQUENCE
            let gn;
            const ev = asn1.fromBER(adone.util.buffer.toArrayBuffer(e.value)).result;
            for (let n = 0; n < ev.valueBlock.value.length; ++n) {
                // get GeneralName
                gn = ev.valueBlock.value[n];

                const altName = {
                    type: gn.idBlock.tagNumber,
                    value: Buffer.from(gn.valueBlock.valueHex)
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
                        altName.ip = __.bytesToIP(Buffer.from(gn.valueBlock.valueHex).toString("binary"));
                        break;
                        // registeredID
                    case 8:
                        altName.oid = gn.valueBlock.toString();
                        break;
                    default:
                        // unsupported
                }
            }
        } else if (e.name === "subjectKeyIdentifier") {
            // value is an OCTETSTRING w/the hash of the key-type specific
            // public key structure (eg: RSAPublicKey)
            const ev = asn1.fromBER(adone.util.buffer.toArrayBuffer(e.value)).result;
            e.subjectKeyIdentifier = Buffer.from(ev.valueBlock.valueHex).toString("hex");
        }
    }
    return e;
}
