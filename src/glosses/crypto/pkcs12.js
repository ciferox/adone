/**
 * Javascript implementation of PKCS#12.
 *
 * @author Dave Longley
 * @author Stefan Siegl <stesie@brokenpipe.de>
 *
 * Copyright (c) 2010-2014 Digital Bazaar, Inc.
 * Copyright (c) 2012 Stefan Siegl <stesie@brokenpipe.de>
 *
 * The ASN.1 representation of PKCS#12 is as follows
 * (see ftp://ftp.rsasecurity.com/pub/pkcs/pkcs-12/pkcs-12-tc1.pdf for details)
 *
 * PFX ::= SEQUENCE {
 *   version  INTEGER {v3(3)}(v3,...),
 *   authSafe ContentInfo,
 *   macData  MacData OPTIONAL
 * }
 *
 * MacData ::= SEQUENCE {
 *   mac DigestInfo,
 *   macSalt OCTET STRING,
 *   iterations INTEGER DEFAULT 1
 * }
 * Note: The iterations default is for historical reasons and its use is
 * deprecated. A higher value, like 1024, is recommended.
 *
 * DigestInfo is defined in PKCS#7 as follows:
 *
 * DigestInfo ::= SEQUENCE {
 *   digestAlgorithm DigestAlgorithmIdentifier,
 *   digest Digest
 * }
 *
 * DigestAlgorithmIdentifier ::= AlgorithmIdentifier
 *
 * The AlgorithmIdentifier contains an Object Identifier (OID) and parameters
 * for the algorithm, if any. In the case of SHA1 there is none.
 *
 * AlgorithmIdentifer ::= SEQUENCE {
 *    algorithm OBJECT IDENTIFIER,
 *    parameters ANY DEFINED BY algorithm OPTIONAL
 * }
 *
 * Digest ::= OCTET STRING
 *
 *
 * ContentInfo ::= SEQUENCE {
 *   contentType ContentType,
 *   content     [0] EXPLICIT ANY DEFINED BY contentType OPTIONAL
 * }
 *
 * ContentType ::= OBJECT IDENTIFIER
 *
 * AuthenticatedSafe ::= SEQUENCE OF ContentInfo
 * -- Data if unencrypted
 * -- EncryptedData if password-encrypted
 * -- EnvelopedData if public key-encrypted
 *
 *
 * SafeContents ::= SEQUENCE OF SafeBag
 *
 * SafeBag ::= SEQUENCE {
 *   bagId     BAG-TYPE.&id ({PKCS12BagSet})
 *   bagValue  [0] EXPLICIT BAG-TYPE.&Type({PKCS12BagSet}{@bagId}),
 *   bagAttributes SET OF PKCS12Attribute OPTIONAL
 * }
 *
 * PKCS12Attribute ::= SEQUENCE {
 *   attrId ATTRIBUTE.&id ({PKCS12AttrSet}),
 *   attrValues SET OF ATTRIBUTE.&Type ({PKCS12AttrSet}{@attrId})
 * } -- This type is compatible with the X.500 type ’Attribute’
 *
 * PKCS12AttrSet ATTRIBUTE ::= {
 *   friendlyName | -- from PKCS #9
 *   localKeyId, -- from PKCS #9
 *   ... -- Other attributes are allowed
 * }
 *
 * CertBag ::= SEQUENCE {
 *   certId    BAG-TYPE.&id   ({CertTypes}),
 *   certValue [0] EXPLICIT BAG-TYPE.&Type ({CertTypes}{@certId})
 * }
 *
 * x509Certificate BAG-TYPE ::= {OCTET STRING IDENTIFIED BY {certTypes 1}}
 *   -- DER-encoded X.509 certificate stored in OCTET STRING
 *
 * sdsiCertificate BAG-TYPE ::= {IA5String IDENTIFIED BY {certTypes 2}}
 * -- Base64-encoded SDSI certificate stored in IA5String
 *
 * CertTypes BAG-TYPE ::= {
 *   x509Certificate |
 *   sdsiCertificate,
 *   ... -- For future extensions
 * }
 */

const {
    is,
    crypto
} = adone;

// shortcut for asn.1 & PKI API
const { asn1, pki } = crypto;

const contentInfoValidator = {
    name: "ContentInfo",
    tagClass: asn1.Class.UNIVERSAL,
    type: asn1.Type.SEQUENCE, // a ContentInfo
    constructed: true,
    value: [{
        name: "ContentInfo.contentType",
        tagClass: asn1.Class.UNIVERSAL,
        type: asn1.Type.OID,
        constructed: false,
        capture: "contentType"
    }, {
        name: "ContentInfo.content",
        tagClass: asn1.Class.CONTEXT_SPECIFIC,
        constructed: true,
        captureAsn1: "content"
    }]
};

const pfxValidator = {
    name: "PFX",
    tagClass: asn1.Class.UNIVERSAL,
    type: asn1.Type.SEQUENCE,
    constructed: true,
    value: [{
        name: "PFX.version",
        tagClass: asn1.Class.UNIVERSAL,
        type: asn1.Type.INTEGER,
        constructed: false,
        capture: "version"
    },
        contentInfoValidator, {
        name: "PFX.macData",
        tagClass: asn1.Class.UNIVERSAL,
        type: asn1.Type.SEQUENCE,
        constructed: true,
        optional: true,
        captureAsn1: "mac",
        value: [{
            name: "PFX.macData.mac",
            tagClass: asn1.Class.UNIVERSAL,
            type: asn1.Type.SEQUENCE, // DigestInfo
            constructed: true,
            value: [{
                name: "PFX.macData.mac.digestAlgorithm",
                tagClass: asn1.Class.UNIVERSAL,
                type: asn1.Type.SEQUENCE, // DigestAlgorithmIdentifier
                constructed: true,
                value: [{
                    name: "PFX.macData.mac.digestAlgorithm.algorithm",
                    tagClass: asn1.Class.UNIVERSAL,
                    type: asn1.Type.OID,
                    constructed: false,
                    capture: "macAlgorithm"
                }, {
                    name: "PFX.macData.mac.digestAlgorithm.parameters",
                    tagClass: asn1.Class.UNIVERSAL,
                    captureAsn1: "macAlgorithmParameters"
                }]
            }, {
                name: "PFX.macData.mac.digest",
                tagClass: asn1.Class.UNIVERSAL,
                type: asn1.Type.OCTETSTRING,
                constructed: false,
                capture: "macDigest"
            }]
        }, {
            name: "PFX.macData.macSalt",
            tagClass: asn1.Class.UNIVERSAL,
            type: asn1.Type.OCTETSTRING,
            constructed: false,
            capture: "macSalt"
        }, {
            name: "PFX.macData.iterations",
            tagClass: asn1.Class.UNIVERSAL,
            type: asn1.Type.INTEGER,
            constructed: false,
            optional: true,
            capture: "macIterations"
        }]
    }]
};

const safeBagValidator = {
    name: "SafeBag",
    tagClass: asn1.Class.UNIVERSAL,
    type: asn1.Type.SEQUENCE,
    constructed: true,
    value: [{
        name: "SafeBag.bagId",
        tagClass: asn1.Class.UNIVERSAL,
        type: asn1.Type.OID,
        constructed: false,
        capture: "bagId"
    }, {
        name: "SafeBag.bagValue",
        tagClass: asn1.Class.CONTEXT_SPECIFIC,
        constructed: true,
        captureAsn1: "bagValue"
    }, {
        name: "SafeBag.bagAttributes",
        tagClass: asn1.Class.UNIVERSAL,
        type: asn1.Type.SET,
        constructed: true,
        optional: true,
        capture: "bagAttributes"
    }]
};

const attributeValidator = {
    name: "Attribute",
    tagClass: asn1.Class.UNIVERSAL,
    type: asn1.Type.SEQUENCE,
    constructed: true,
    value: [{
        name: "Attribute.attrId",
        tagClass: asn1.Class.UNIVERSAL,
        type: asn1.Type.OID,
        constructed: false,
        capture: "oid"
    }, {
        name: "Attribute.attrValues",
        tagClass: asn1.Class.UNIVERSAL,
        type: asn1.Type.SET,
        constructed: true,
        capture: "values"
    }]
};

const certBagValidator = {
    name: "CertBag",
    tagClass: asn1.Class.UNIVERSAL,
    type: asn1.Type.SEQUENCE,
    constructed: true,
    value: [{
        name: "CertBag.certId",
        tagClass: asn1.Class.UNIVERSAL,
        type: asn1.Type.OID,
        constructed: false,
        capture: "certId"
    }, {
        name: "CertBag.certValue",
        tagClass: asn1.Class.CONTEXT_SPECIFIC,
        constructed: true,
        /* So far we only support X.509 certificates (which are wrapped in
       an OCTET STRING, hence hard code that here). */
        value: [{
            name: "CertBag.certValue[0]",
            tagClass: asn1.Class.UNIVERSAL,
            type: asn1.Class.OCTETSTRING,
            constructed: false,
            capture: "cert"
        }]
    }]
};

/**
 * Search SafeContents structure for bags with matching attributes.
 *
 * The search can optionally be narrowed by a certain bag type.
 *
 * @param safeContents the SafeContents structure to search in.
 * @param attrName the name of the attribute to compare against.
 * @param attrValue the attribute value to search for.
 * @param [bagType] bag type to narrow search by.
 *
 * @return an array of matching bags.
 */
function _getBagsByAttribute(safeContents, attrName, attrValue, bagType) {
    const result = [];

    for (let i = 0; i < safeContents.length; i++) {
        for (let j = 0; j < safeContents[i].safeBags.length; j++) {
            const bag = safeContents[i].safeBags[j];
            if (!is.undefined(bagType) && bag.type !== bagType) {
                continue;
            }
            // only filter by bag type, no attribute specified
            if (is.null(attrName)) {
                result.push(bag);
                continue;
            }
            if (!is.undefined(bag.attributes[attrName]) &&
                bag.attributes[attrName].indexOf(attrValue) >= 0) {
                result.push(bag);
            }
        }
    }

    return result;
}

/**
 * Converts a PKCS#12 PFX in ASN.1 notation into a PFX object.
 *
 * @param obj The PKCS#12 PFX in ASN.1 notation.
 * @param strict true to use strict DER decoding, false not to (default: true).
 * @param {String} password Password to decrypt with (optional).
 *
 * @return PKCS#12 PFX object.
 */
export const pkcs12FromAsn1 = function (obj, strict, password) {
    // handle args
    if (is.string(strict)) {
        password = strict;
        strict = true;
    } else if (is.undefined(strict)) {
        strict = true;
    }

    // validate PFX and capture data
    const capture = {};
    const errors = [];
    if (!asn1.validate(obj, pfxValidator, capture, errors)) {
        var error = new Error("Cannot read PKCS#12 PFX. " +
            "ASN.1 object is not an PKCS#12 PFX.");
        error.errors = error;
        throw error;
    }

    var pfx = {
        version: capture.version.charCodeAt(0),
        safeContents: [],

        /**
     * Gets bags with matching attributes.
     *
     * @param filter the attributes to filter by:
     *          [localKeyId] the localKeyId to search for.
     *          [localKeyIdHex] the localKeyId in hex to search for.
     *          [friendlyName] the friendly name to search for.
     *          [bagType] bag type to narrow each attribute search by.
     *
     * @return a map of attribute type to an array of matching bags or, if no
     *           attribute was given but a bag type, the map key will be the
     *           bag type.
     */
        getBags(filter) {
            const rval = {};

            let localKeyId;
            if ("localKeyId" in filter) {
                localKeyId = filter.localKeyId;
            } else if ("localKeyIdHex" in filter) {
                localKeyId = crypto.util.hexToBytes(filter.localKeyIdHex);
            }

            // filter on bagType only
            if (is.undefined(localKeyId) && !("friendlyName" in filter) &&
                "bagType" in filter) {
                rval[filter.bagType] = _getBagsByAttribute(
                    pfx.safeContents, null, null, filter.bagType);
            }

            if (!is.undefined(localKeyId)) {
                rval.localKeyId = _getBagsByAttribute(
                    pfx.safeContents, "localKeyId",
                    localKeyId, filter.bagType);
            }
            if ("friendlyName" in filter) {
                rval.friendlyName = _getBagsByAttribute(
                    pfx.safeContents, "friendlyName",
                    filter.friendlyName, filter.bagType);
            }

            return rval;
        },

        /**
     * DEPRECATED: use getBags() instead.
     *
     * Get bags with matching friendlyName attribute.
     *
     * @param friendlyName the friendly name to search for.
     * @param [bagType] bag type to narrow search by.
     *
     * @return an array of bags with matching friendlyName attribute.
     */
        getBagsByFriendlyName(friendlyName, bagType) {
            return _getBagsByAttribute(
                pfx.safeContents, "friendlyName", friendlyName, bagType);
        },

        /**
     * DEPRECATED: use getBags() instead.
     *
     * Get bags with matching localKeyId attribute.
     *
     * @param localKeyId the localKeyId to search for.
     * @param [bagType] bag type to narrow search by.
     *
     * @return an array of bags with matching localKeyId attribute.
     */
        getBagsByLocalKeyId(localKeyId, bagType) {
            return _getBagsByAttribute(
                pfx.safeContents, "localKeyId", localKeyId, bagType);
        }
    };

    if (capture.version.charCodeAt(0) !== 3) {
        var error = new Error("PKCS#12 PFX of version other than 3 not supported.");
        error.version = capture.version.charCodeAt(0);
        throw error;
    }

    if (asn1.derToOid(capture.contentType) !== pki.oids.data) {
        var error = new Error("Only PKCS#12 PFX in password integrity mode supported.");
        error.oid = asn1.derToOid(capture.contentType);
        throw error;
    }

    let data = capture.content.value[0];
    if (data.tagClass !== asn1.Class.UNIVERSAL ||
        data.type !== asn1.Type.OCTETSTRING) {
        throw new Error("PKCS#12 authSafe content data is not an OCTET STRING.");
    }
    data = _decodePkcs7Data(data);

    // check for MAC
    if (capture.mac) {
        let md = null;
        let macKeyBytes = 0;
        const macAlgorithm = asn1.derToOid(capture.macAlgorithm);
        switch (macAlgorithm) {
            case pki.oids.sha1:
                md = crypto.md.sha1.create();
                macKeyBytes = 20;
                break;
            case pki.oids.sha256:
                md = crypto.md.sha256.create();
                macKeyBytes = 32;
                break;
            case pki.oids.sha384:
                md = crypto.md.sha384.create();
                macKeyBytes = 48;
                break;
            case pki.oids.sha512:
                md = crypto.md.sha512.create();
                macKeyBytes = 64;
                break;
            case pki.oids.md5:
                md = crypto.md.md5.create();
                macKeyBytes = 16;
                break;
        }
        if (is.null(md)) {
            throw new Error(`PKCS#12 uses unsupported MAC algorithm: ${macAlgorithm}`);
        }

        // verify MAC (iterations default to 1)
        const macSalt = new crypto.util.ByteBuffer(capture.macSalt);
        const macIterations = (("macIterations" in capture) ?
            parseInt(crypto.util.bytesToHex(capture.macIterations), 16) : 1);
        const macKey = generateKey(
            password, macSalt, 3, macIterations, macKeyBytes, md);
        const mac = crypto.hmac.create();
        mac.start(md, macKey);
        mac.update(data.value);
        const macValue = mac.getMac();
        if (macValue.getBytes() !== capture.macDigest) {
            throw new Error("PKCS#12 MAC could not be verified. Invalid password?");
        }
    }

    _decodeAuthenticatedSafe(pfx, data.value, strict, password);
    return pfx;
};

/**
 * Decodes PKCS#7 Data. PKCS#7 (RFC 2315) defines "Data" as an OCTET STRING,
 * but it is sometimes an OCTET STRING that is composed/constructed of chunks,
 * each its own OCTET STRING. This is BER-encoding vs. DER-encoding. This
 * function transforms this corner-case into the usual simple,
 * non-composed/constructed OCTET STRING.
 *
 * This function may be moved to ASN.1 at some point to better deal with
 * more BER-encoding issues, should they arise.
 *
 * @param data the ASN.1 Data object to transform.
 */
function _decodePkcs7Data(data) {
    // handle special case of "chunked" data content: an octet string composed
    // of other octet strings
    if (data.composed || data.constructed) {
        const value = crypto.util.createBuffer();
        for (let i = 0; i < data.value.length; ++i) {
            value.putBytes(data.value[i].value);
        }
        data.composed = data.constructed = false;
        data.value = value.getBytes();
    }
    return data;
}

/**
 * Decode PKCS#12 AuthenticatedSafe (BER encoded) into PFX object.
 *
 * The AuthenticatedSafe is a BER-encoded SEQUENCE OF ContentInfo.
 *
 * @param pfx The PKCS#12 PFX object to fill.
 * @param {String} authSafe BER-encoded AuthenticatedSafe.
 * @param strict true to use strict DER decoding, false not to.
 * @param {String} password Password to decrypt with (optional).
 */
function _decodeAuthenticatedSafe(pfx, authSafe, strict, password) {
    authSafe = asn1.fromDer(authSafe, strict); /* actually it's BER encoded */

    if (authSafe.tagClass !== asn1.Class.UNIVERSAL ||
        authSafe.type !== asn1.Type.SEQUENCE ||
        authSafe.constructed !== true) {
        throw new Error("PKCS#12 AuthenticatedSafe expected to be a " +
            "SEQUENCE OF ContentInfo");
    }

    for (let i = 0; i < authSafe.value.length; i++) {
        const contentInfo = authSafe.value[i];

        // validate contentInfo and capture data
        const capture = {};
        const errors = [];
        if (!asn1.validate(contentInfo, contentInfoValidator, capture, errors)) {
            var error = new Error("Cannot read ContentInfo.");
            error.errors = errors;
            throw error;
        }

        const obj = {
            encrypted: false
        };
        let safeContents = null;
        const data = capture.content.value[0];
        switch (asn1.derToOid(capture.contentType)) {
            case pki.oids.data:
                if (data.tagClass !== asn1.Class.UNIVERSAL ||
                    data.type !== asn1.Type.OCTETSTRING) {
                    throw new Error("PKCS#12 SafeContents Data is not an OCTET STRING.");
                }
                safeContents = _decodePkcs7Data(data).value;
                break;
            case pki.oids.encryptedData:
                safeContents = _decryptSafeContents(data, password);
                obj.encrypted = true;
                break;
            default:
                var error = new Error("Unsupported PKCS#12 contentType.");
                error.contentType = asn1.derToOid(capture.contentType);
                throw error;
        }

        obj.safeBags = _decodeSafeContents(safeContents, strict, password);
        pfx.safeContents.push(obj);
    }
}

/**
 * Decrypt PKCS#7 EncryptedData structure.
 *
 * @param data ASN.1 encoded EncryptedContentInfo object.
 * @param password The user-provided password.
 *
 * @return The decrypted SafeContents (ASN.1 object).
 */
function _decryptSafeContents(data, password) {
    const capture = {};
    const errors = [];
    if (!asn1.validate(
        data, crypto.pkcs7.asn1.encryptedDataValidator, capture, errors)) {
        var error = new Error("Cannot read EncryptedContentInfo.");
        error.errors = errors;
        throw error;
    }

    let oid = asn1.derToOid(capture.contentType);
    if (oid !== pki.oids.data) {
        var error = new Error(
            "PKCS#12 EncryptedContentInfo ContentType is not Data.");
        error.oid = oid;
        throw error;
    }

    // get cipher
    oid = asn1.derToOid(capture.encAlgorithm);
    const cipher = pki.pbe.getCipher(oid, capture.encParameter, password);

    // get encrypted data
    const encryptedContentAsn1 = _decodePkcs7Data(capture.encryptedContentAsn1);
    const encrypted = crypto.util.createBuffer(encryptedContentAsn1.value);

    cipher.update(encrypted);
    if (!cipher.finish()) {
        throw new Error("Failed to decrypt PKCS#12 SafeContents.");
    }

    return cipher.output.getBytes();
}

/**
 * Decode PKCS#12 SafeContents (BER-encoded) into array of Bag objects.
 *
 * The safeContents is a BER-encoded SEQUENCE OF SafeBag.
 *
 * @param {String} safeContents BER-encoded safeContents.
 * @param strict true to use strict DER decoding, false not to.
 * @param {String} password Password to decrypt with (optional).
 *
 * @return {Array} Array of Bag objects.
 */
function _decodeSafeContents(safeContents, strict, password) {
    // if strict and no safe contents, return empty safes
    if (!strict && safeContents.length === 0) {
        return [];
    }

    // actually it's BER-encoded
    safeContents = asn1.fromDer(safeContents, strict);

    if (safeContents.tagClass !== asn1.Class.UNIVERSAL ||
        safeContents.type !== asn1.Type.SEQUENCE ||
        safeContents.constructed !== true) {
        throw new Error(
            "PKCS#12 SafeContents expected to be a SEQUENCE OF SafeBag.");
    }

    const res = [];
    for (let i = 0; i < safeContents.value.length; i++) {
        const safeBag = safeContents.value[i];

        // validate SafeBag and capture data
        var capture = {};
        const errors = [];
        if (!asn1.validate(safeBag, safeBagValidator, capture, errors)) {
            var error = new Error("Cannot read SafeBag.");
            error.errors = errors;
            throw error;
        }

        /**
         * Create bag object and push to result array.
         */
        var bag = {
            type: asn1.derToOid(capture.bagId),
            attributes: _decodeBagAttributes(capture.bagAttributes)
        };
        res.push(bag);

        var validator, decoder;
        let bagAsn1 = capture.bagValue.value[0];
        switch (bag.type) {
            case pki.oids.pkcs8ShroudedKeyBag:
                /**
                 * bagAsn1 has a EncryptedPrivateKeyInfo, which we need to decrypt.
                 * Afterwards we can handle it like a keyBag,
                 */
                bagAsn1 = pki.decryptPrivateKeyInfo(bagAsn1, password);
                if (is.null(bagAsn1)) {
                    throw new Error(
                        "Unable to decrypt PKCS#8 ShroudedKeyBag, wrong password?");
                }

            /* fall through */
            case pki.oids.keyBag:
                /* A PKCS#12 keyBag is a simple PrivateKeyInfo as understood by our
           PKI module, hence we don't have to do validation/capturing here,
           just pass what we already got. */
                try {
                    bag.key = pki.privateKeyFromAsn1(bagAsn1);
                } catch (e) {
                    // ignore unknown key type, pass asn1 value
                    bag.key = null;
                    bag.asn1 = bagAsn1;
                }
                continue; /* Nothing more to do. */

            case pki.oids.certBag:
                /**
                 * A PKCS#12 certBag can wrap both X.509 and sdsi certificates.
                 * Therefore put the SafeBag content through another validator to
                 */
                validator = certBagValidator;
                decoder = function () {
                    if (asn1.derToOid(capture.certId) !== pki.oids.x509Certificate) {
                        const error = new Error(
                            "Unsupported certificate type, only X.509 supported.");
                        error.oid = asn1.derToOid(capture.certId);
                        throw error;
                    }

                    // true=produce cert hash
                    const certAsn1 = asn1.fromDer(capture.cert, strict);
                    try {
                        bag.cert = pki.certificateFromAsn1(certAsn1, true);
                    } catch (e) {
                        // ignore unknown cert type, pass asn1 value
                        bag.cert = null;
                        bag.asn1 = certAsn1;
                    }
                };
                break;

            default:
                var error = new Error("Unsupported PKCS#12 SafeBag type.");
                error.oid = bag.type;
                throw error;
        }

        /* Validate SafeBag value (i.e. CertBag, etc.) and capture data if needed. */
        if (!is.undefined(validator) &&
            !asn1.validate(bagAsn1, validator, capture, errors)) {
            var error = new Error(`Cannot read PKCS#12 ${validator.name}`);
            error.errors = errors;
            throw error;
        }

        /**
         * Call decoder function from above to store the results.
         */
        decoder();
    }

    return res;
}

/**
 * Decode PKCS#12 SET OF PKCS12Attribute into JavaScript object.
 *
 * @param attributes SET OF PKCS12Attribute (ASN.1 object).
 *
 * @return the decoded attributes.
 */
function _decodeBagAttributes(attributes) {
    const decodedAttrs = {};

    if (!is.undefined(attributes)) {
        for (let i = 0; i < attributes.length; ++i) {
            const capture = {};
            const errors = [];
            if (!asn1.validate(attributes[i], attributeValidator, capture, errors)) {
                const error = new Error("Cannot read PKCS#12 BagAttribute.");
                error.errors = errors;
                throw error;
            }

            const oid = asn1.derToOid(capture.oid);
            if (is.undefined(pki.oids[oid])) {
                // unsupported attribute type, ignore.
                continue;
            }

            decodedAttrs[pki.oids[oid]] = [];
            for (let j = 0; j < capture.values.length; ++j) {
                decodedAttrs[pki.oids[oid]].push(capture.values[j].value);
            }
        }
    }

    return decodedAttrs;
}

/**
 * Wraps a private key and certificate in a PKCS#12 PFX wrapper. If a
 * password is provided then the private key will be encrypted.
 *
 * An entire certificate chain may also be included. To do this, pass
 * an array for the "cert" parameter where the first certificate is
 * the one that is paired with the private key and each subsequent one
 * verifies the previous one. The certificates may be in PEM format or
 * have been already parsed by Forge.
 *
 * @todo implement password-based-encryption for the whole package
 *
 * @param key the private key.
 * @param cert the certificate (may be an array of certificates in order
 *          to specify a certificate chain).
 * @param password the password to use, null for none.
 * @param options:
 *          algorithm the encryption algorithm to use
 *            ('aes128', 'aes192', 'aes256', '3des'), defaults to 'aes128'.
 *          count the iteration count to use.
 *          saltSize the salt size to use.
 *          useMac true to include a MAC, false not to, defaults to true.
 *          localKeyId the local key ID to use, in hex.
 *          friendlyName the friendly name to use.
 *          generateLocalKeyId true to generate a random local key ID,
 *            false not to, defaults to true.
 *
 * @return the PKCS#12 PFX ASN.1 object.
 */
export const toPkcs12Asn1 = function (key, cert, password, options) {
    // set default options
    options = options || {};
    options.saltSize = options.saltSize || 8;
    options.count = options.count || 2048;
    options.algorithm = options.algorithm || options.encAlgorithm || "aes128";
    if (!("useMac" in options)) {
        options.useMac = true;
    }
    if (!("localKeyId" in options)) {
        options.localKeyId = null;
    }
    if (!("generateLocalKeyId" in options)) {
        options.generateLocalKeyId = true;
    }

    let localKeyId = options.localKeyId;
    let bagAttrs;
    if (!is.null(localKeyId)) {
        localKeyId = crypto.util.hexToBytes(localKeyId);
    } else if (options.generateLocalKeyId) {
        // use SHA-1 of paired cert, if available
        if (cert) {
            let pairedCert = crypto.util.isArray(cert) ? cert[0] : cert;
            if (is.string(pairedCert)) {
                pairedCert = pki.certificateFromPem(pairedCert);
            }
            var sha1 = crypto.md.sha1.create();
            sha1.update(asn1.toDer(pki.certificateToAsn1(pairedCert)).getBytes());
            localKeyId = sha1.digest().getBytes();
        } else {
            // FIXME: consider using SHA-1 of public key (which can be generated
            // from private key components), see: cert.generateSubjectKeyIdentifier
            // generate random bytes
            localKeyId = crypto.random.getBytes(20);
        }
    }

    const attrs = [];
    if (!is.null(localKeyId)) {
        attrs.push(
            // localKeyID
            asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
                // attrId
                asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OID, false,
                    asn1.oidToDer(pki.oids.localKeyId).getBytes()),
                // attrValues
                asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SET, true, [
                    asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OCTETSTRING, false,
                        localKeyId)
                ])
            ]));
    }
    if ("friendlyName" in options) {
        attrs.push(
            // friendlyName
            asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
                // attrId
                asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OID, false,
                    asn1.oidToDer(pki.oids.friendlyName).getBytes()),
                // attrValues
                asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SET, true, [
                    asn1.create(asn1.Class.UNIVERSAL, asn1.Type.BMPSTRING, false,
                        options.friendlyName)
                ])
            ]));
    }

    if (attrs.length > 0) {
        bagAttrs = asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SET, true, attrs);
    }

    // collect contents for AuthenticatedSafe
    const contents = [];

    // create safe bag(s) for certificate chain
    let chain = [];
    if (!is.null(cert)) {
        if (crypto.util.isArray(cert)) {
            chain = cert;
        } else {
            chain = [cert];
        }
    }

    const certSafeBags = [];
    for (let i = 0; i < chain.length; ++i) {
        // convert cert from PEM as necessary
        cert = chain[i];
        if (is.string(cert)) {
            cert = pki.certificateFromPem(cert);
        }

        // SafeBag
        const certBagAttrs = (i === 0) ? bagAttrs : undefined;
        const certAsn1 = pki.certificateToAsn1(cert);
        const certSafeBag =
            asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
                // bagId
                asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OID, false,
                    asn1.oidToDer(pki.oids.certBag).getBytes()),
                // bagValue
                asn1.create(asn1.Class.CONTEXT_SPECIFIC, 0, true, [
                    // CertBag
                    asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
                        // certId
                        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OID, false,
                            asn1.oidToDer(pki.oids.x509Certificate).getBytes()),
                        // certValue (x509Certificate)
                        asn1.create(asn1.Class.CONTEXT_SPECIFIC, 0, true, [
                            asn1.create(
                                asn1.Class.UNIVERSAL, asn1.Type.OCTETSTRING, false,
                                asn1.toDer(certAsn1).getBytes())
                        ])])]),
                // bagAttributes (OPTIONAL)
                certBagAttrs
            ]);
        certSafeBags.push(certSafeBag);
    }

    if (certSafeBags.length > 0) {
        // SafeContents
        const certSafeContents = asn1.create(
            asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, certSafeBags);

        // ContentInfo
        const certCI =
            // PKCS#7 ContentInfo
            asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
                // contentType
                asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OID, false,
                    // OID for the content type is 'data'
                    asn1.oidToDer(pki.oids.data).getBytes()),
                // content
                asn1.create(asn1.Class.CONTEXT_SPECIFIC, 0, true, [
                    asn1.create(
                        asn1.Class.UNIVERSAL, asn1.Type.OCTETSTRING, false,
                        asn1.toDer(certSafeContents).getBytes())
                ])
            ]);
        contents.push(certCI);
    }

    // create safe contents for private key
    let keyBag = null;
    if (!is.null(key)) {
        // SafeBag
        const pkAsn1 = pki.wrapRsaPrivateKey(pki.privateKeyToAsn1(key));
        if (is.null(password)) {
            // no encryption
            keyBag = asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
                // bagId
                asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OID, false,
                    asn1.oidToDer(pki.oids.keyBag).getBytes()),
                // bagValue
                asn1.create(asn1.Class.CONTEXT_SPECIFIC, 0, true, [
                    // PrivateKeyInfo
                    pkAsn1
                ]),
                // bagAttributes (OPTIONAL)
                bagAttrs
            ]);
        } else {
            // encrypted PrivateKeyInfo
            keyBag = asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
                // bagId
                asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OID, false,
                    asn1.oidToDer(pki.oids.pkcs8ShroudedKeyBag).getBytes()),
                // bagValue
                asn1.create(asn1.Class.CONTEXT_SPECIFIC, 0, true, [
                    // EncryptedPrivateKeyInfo
                    pki.encryptPrivateKeyInfo(pkAsn1, password, options)
                ]),
                // bagAttributes (OPTIONAL)
                bagAttrs
            ]);
        }

        // SafeContents
        const keySafeContents =
            asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [keyBag]);

        // ContentInfo
        const keyCI =
            // PKCS#7 ContentInfo
            asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
                // contentType
                asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OID, false,
                    // OID for the content type is 'data'
                    asn1.oidToDer(pki.oids.data).getBytes()),
                // content
                asn1.create(asn1.Class.CONTEXT_SPECIFIC, 0, true, [
                    asn1.create(
                        asn1.Class.UNIVERSAL, asn1.Type.OCTETSTRING, false,
                        asn1.toDer(keySafeContents).getBytes())
                ])
            ]);
        contents.push(keyCI);
    }

    // create AuthenticatedSafe by stringing together the contents
    const safe = asn1.create(
        asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, contents);

    let macData;
    if (options.useMac) {
        // MacData
        var sha1 = crypto.md.sha1.create();
        const macSalt = new crypto.util.ByteBuffer(
            crypto.random.getBytes(options.saltSize));
        const count = options.count;
        // 160-bit key
        var key = generateKey(password, macSalt, 3, count, 20);
        const mac = crypto.hmac.create();
        mac.start(sha1, key);
        mac.update(asn1.toDer(safe).getBytes());
        const macValue = mac.getMac();
        macData = asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
            // mac DigestInfo
            asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
                // digestAlgorithm
                asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
                    // algorithm = SHA-1
                    asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OID, false,
                        asn1.oidToDer(pki.oids.sha1).getBytes()),
                    // parameters = Null
                    asn1.create(asn1.Class.UNIVERSAL, asn1.Type.NULL, false, "")
                ]),
                // digest
                asn1.create(
                    asn1.Class.UNIVERSAL, asn1.Type.OCTETSTRING,
                    false, macValue.getBytes())
            ]),
            // macSalt OCTET STRING
            asn1.create(
                asn1.Class.UNIVERSAL, asn1.Type.OCTETSTRING, false, macSalt.getBytes()),
            // iterations INTEGER (XXX: Only support count < 65536)
            asn1.create(asn1.Class.UNIVERSAL, asn1.Type.INTEGER, false,
                asn1.integerToDer(count).getBytes()
            )
        ]);
    }

    // PFX
    return asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
        // version (3)
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.INTEGER, false,
            asn1.integerToDer(3).getBytes()),
        // PKCS#7 ContentInfo
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
            // contentType
            asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OID, false,
                // OID for the content type is 'data'
                asn1.oidToDer(pki.oids.data).getBytes()),
            // content
            asn1.create(asn1.Class.CONTEXT_SPECIFIC, 0, true, [
                asn1.create(
                    asn1.Class.UNIVERSAL, asn1.Type.OCTETSTRING, false,
                    asn1.toDer(safe).getBytes())
            ])
        ]),
        macData
    ]);
};

/**
 * Derives a PKCS#12 key.
 *
 * @param password the password to derive the key material from, null or
 *          undefined for none.
 * @param salt the salt, as a ByteBuffer, to use.
 * @param id the PKCS#12 ID byte (1 = key material, 2 = IV, 3 = MAC).
 * @param iter the iteration count.
 * @param n the number of bytes to derive from the password.
 * @param md the message digest to use, defaults to SHA-1.
 *
 * @return a ByteBuffer with the bytes derived from the password.
 */
export const generateKey = crypto.pbe.generatePkcs12Key;
