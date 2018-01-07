const {
    is,
    crypto: {
        pki,
        asn1
    }
} = adone;

const __ = adone.private(pki);

const forge = require("node-forge");

/**
 * Fills in missing fields in certificate extensions.
 *
 * @param e the extension.
 * @param [options] the options to use.
 *          [cert] the certificate the extensions are for.
 *
 * @return the extension.
 */
export default function fillMissingExtensionFields(e, options) {
    options = options || {};

    // populate missing name
    if (is.undefined(e.name)) {
        if (e.id && e.id in pki.oids) {
            e.name = pki.oids[e.id];
        }
    }

    // populate missing id
    if (is.undefined(e.id)) {
        if (e.name && e.name in pki.oids) {
            e.id = pki.oids[e.name];
        } else {
            const error = new Error("Extension ID not specified.");
            error.extension = e;
            throw error;
        }
    }

    if (!is.undefined(e.value)) {
        return e;
    }

    // handle missing value:

    // value is a BIT STRING
    if (e.name === "keyUsage") {
        // build flags
        let unused = 0;
        let b2 = 0x00;
        let b3 = 0x00;
        if (e.digitalSignature) {
            b2 |= 0x80;
            unused = 7;
        }
        if (e.nonRepudiation) {
            b2 |= 0x40;
            unused = 6;
        }
        if (e.keyEncipherment) {
            b2 |= 0x20;
            unused = 5;
        }
        if (e.dataEncipherment) {
            b2 |= 0x10;
            unused = 4;
        }
        if (e.keyAgreement) {
            b2 |= 0x08;
            unused = 3;
        }
        if (e.keyCertSign) {
            b2 |= 0x04;
            unused = 2;
        }
        if (e.cRLSign) {
            b2 |= 0x02;
            unused = 1;
        }
        if (e.encipherOnly) {
            b2 |= 0x01;
            unused = 0;
        }
        if (e.decipherOnly) {
            b3 |= 0x80;
            unused = 7;
        }

        // create bit string
        let value = String.fromCharCode(unused);
        if (b3 !== 0) {
            value += String.fromCharCode(b2) + String.fromCharCode(b3);
        } else if (b2 !== 0) {
            value += String.fromCharCode(b2);
        }
        e.value = new asn1.BitString({
            valueHex: adone.util.bufferToArrayBuffer(Buffer.from(value, "binary"))
        });
    } else if (e.name === "basicConstraints") {
        // basicConstraints is a SEQUENCE
        e.value = new asn1.Sequence();
        // cA BOOLEAN flag defaults to false
        if (e.cA) {
            e.value.valueBlock.value.push(
                new asn1.Boolean({
                    value: true
                })
            );
        }
        if ("pathLenConstraint" in e) {
            e.value.valueBlock.value.push(
                new asn1.Integer({
                    value: e.pathLenConstraint
                })
            );
        }
    } else if (e.name === "extKeyUsage") {
        // extKeyUsage is a SEQUENCE of OIDs
        e.value = new asn1.Sequence();
        const seq = e.value.valueBlock.value;
        for (const key in e) {
            if (e[key] !== true) {
                continue;
            }
            // key is name in OID map
            if (key in pki.oids) {
                seq.push(
                    new asn1.ObjectIdentifier({
                        value: pki.oids[key]
                    })
                );
            } else if (key.includes(".")) {
                // assume key is an OID
                seq.push(
                    new asn1.ObjectIdentifier({
                        value: key
                    })
                );
            }
        }
    } else if (e.name === "nsCertType") {
        // nsCertType is a BIT STRING
        // build flags
        let unused = 0;
        let b2 = 0x00;

        if (e.client) {
            b2 |= 0x80;
            unused = 7;
        }
        if (e.server) {
            b2 |= 0x40;
            unused = 6;
        }
        if (e.email) {
            b2 |= 0x20;
            unused = 5;
        }
        if (e.objsign) {
            b2 |= 0x10;
            unused = 4;
        }
        if (e.reserved) {
            b2 |= 0x08;
            unused = 3;
        }
        if (e.sslCA) {
            b2 |= 0x04;
            unused = 2;
        }
        if (e.emailCA) {
            b2 |= 0x02;
            unused = 1;
        }
        if (e.objCA) {
            b2 |= 0x01;
            unused = 0;
        }

        // create bit string
        let value = String.fromCharCode(unused);
        if (b2 !== 0) {
            value += String.fromCharCode(b2);
        }
        e.value = new asn1.BitString({
            valueHex: adone.util.bufferToArrayBuffer(Buffer.from(value, "binary"))
        });
    } else if (e.name === "subjectAltName" || e.name === "issuerAltName") {
        // SYNTAX SEQUENCE
        e.value = new asn1.Sequence();

        let altName;
        for (let n = 0; n < e.altNames.length; ++n) {
            altName = e.altNames[n];
            let value = altName.value;
            // handle IP
            if (altName.type === 7 && altName.ip) {
                value = forge.util.bytesFromIP(altName.ip);
                if (is.null(value)) {
                    const error = new Error('Extension "ip" value is not a valid IPv4 or IPv6 address.');
                    error.extension = e;
                    throw error;
                }
                value = adone.util.bufferToArrayBuffer(Buffer.from(value, "binary"));
            } else if (altName.type === 8) {
                // handle OID
                if (altName.oid) {
                    value = new asn1.ObjectIdentifier({ value: altName.oid }).toBER();
                } else {
                    // deprecated ... convert value to OID
                    value = new asn1.ObjectIdentifier({ value }).toBER();
                }
            } else {
                value = adone.util.bufferToArrayBuffer(Buffer.from(value, "binary"));
            }

            e.value.valueBlock.value.push(new asn1.Primitive({
                idBlock: {
                    tagClass: 3, // CONTEXT_SPECIFIC
                    tagNumber: altName.type
                },
                valueHex: value
            }));
        }
    } else if (e.name === "subjectKeyIdentifier" && options.cert) {
        const ski = options.cert.generateSubjectKeyIdentifier();
        e.subjectKeyIdentifier = ski.toHex();
        // OCTETSTRING w/digest
        e.value = new asn1.OctetString({
            valueHex: adone.util.bufferToArrayBuffer(Buffer.from(ski.getBytes(), "binary"))
        });
    } else if (e.name === "authorityKeyIdentifier" && options.cert) {
        // SYNTAX SEQUENCE
        e.value = new asn1.Sequence();

        const seq = e.value.valueBlock.value;

        if (e.keyIdentifier) {
            const keyIdentifier = e.keyIdentifier === true
                ? options.cert.generateSubjectKeyIdentifier().getBytes()
                : e.keyIdentifier;

            seq.push(
                new asn1.Primitive({
                    idBlock: {
                        tagClass: 3, // CONTEXT_SPECIFIC
                        tagNumber: 0
                    },
                    valueHex: adone.util.bufferToArrayBuffer(Buffer.from(keyIdentifier, "binary"))
                })
            );
        }

        if (e.authorityCertIssuer) {
            seq.push(
                new asn1.Constructed({
                    idBlock: {
                        tagClass: 3, // CONTEXT_SPECIFIC
                        tagNumber: 1
                    },
                    value: [
                        new asn1.Constructed({
                            idBlock: {
                                tagClass: 3, // CONTEXT_SPECIFIC
                                tagNumber: 4
                            },
                            value: [
                                __.dnToAsn1(e.authorityCertIssuer === true ? options.cert.issuer : e.authorityCertIssuer)
                            ]
                        })
                    ]
                })
            );
        }

        if (e.serialNumber) {
            const serialNumber = forge.util.hexToBytes(e.serialNumber === true ? options.cert.serialNumber : e.serialNumber);
            seq.push(
                new asn1.Primitive({
                    idBlock: {
                        tagClass: 3, // CONTEXT_SPECIFIC
                        tagNumber: 2
                    },
                    valueHex: adone.util.bufferToArrayBuffer(Buffer.from(serialNumber, "binary"))
                })
            );
        }
    } else if (e.name === "cRLDistributionPoints") {
        e.value = new asn1.Sequence();

        // Create sub SEQUENCE of DistributionPointName
        const subSeq = new asn1.Sequence();

        // Create fullName CHOICE
        const fullNameGeneralNames = new asn1.Constructed({
            idBlock: {
                tagClass: 3, // CONTEXT_SPECIFIC
                tagNumber: 0
            }
        });
        let altName;
        for (let n = 0; n < e.altNames.length; ++n) {
            altName = e.altNames[n];
            let value = altName.value;
            // handle IP
            if (altName.type === 7 && altName.ip) {
                value = forge.util.bytesFromIP(altName.ip);
                if (is.null(value)) {
                    const error = new Error('Extension "ip" value is not a valid IPv4 or IPv6 address.');
                    error.extension = e;
                    throw error;
                }
            } else if (altName.type === 8) {
                // handle OID
                if (altName.oid) {
                    value = asn1.oidToDer(asn1.oidToDer(altName.oid));
                } else {
                    // deprecated ... convert value to OID
                    value = asn1.oidToDer(value);
                }
            }
            fullNameGeneralNames.valueBlock.value.push(
                new asn1.Primitive({
                    idBlock: {
                        tagClass: 3, // CONTEXT_SPECIFIC
                        tagNumber: altName.type
                    },
                    valueHex: adone.util.bufferToArrayBuffer(Buffer.from(value, "binary"))
                })
            );
        }

        // Add to the parent SEQUENCE
        subSeq.valueBlock.value.push(
            new asn1.Constructed({
                idBlock: {
                    tagClass: 3, // CONTEXT_SPECIFIC
                    tagNumber: 0
                },
                value: [fullNameGeneralNames]
            })
        );
        e.value.valueBlock.value.push(subSeq);
    }

    // ensure value has been defined by now
    if (is.undefined(e.value)) {
        const error = new Error("Extension value not specified.");
        error.extension = e;
        throw error;
    }

    return e;
}

