const {
    is,
    crypto: { pki }
} = adone;

const __ = adone.private(pki);

const forge = require("node-forge");
const asn1 = forge.asn1;

/**
 * Creates an empty X.509v3 RSA certificate.
 *
 * @return the certificate.
 */
export default function createCertificate() {
    const cert = {};
    cert.version = 0x02;
    cert.serialNumber = "00";
    cert.signatureOid = null;
    cert.signature = null;
    cert.siginfo = {};
    cert.siginfo.algorithmOid = null;
    cert.validity = {};
    cert.validity.notBefore = new Date();
    cert.validity.notAfter = new Date();

    cert.issuer = {};
    cert.issuer.getField = function (sn) {
        return __.getAttribute(cert.issuer, sn);
    };
    cert.issuer.addField = function (attr) {
        __.fillMissingFields([attr]);
        cert.issuer.attributes.push(attr);
    };
    cert.issuer.attributes = [];
    cert.issuer.hash = null;

    cert.subject = {};
    cert.subject.getField = function (sn) {
        return __.getAttribute(cert.subject, sn);
    };
    cert.subject.addField = function (attr) {
        __.fillMissingFields([attr]);
        cert.subject.attributes.push(attr);
    };
    cert.subject.attributes = [];
    cert.subject.hash = null;

    cert.extensions = [];
    cert.publicKey = null;
    cert.md = null;

    /**
     * Sets the subject of this certificate.
     *
     * @param attrs the array of subject attributes to use.
     * @param uniqueId an optional a unique ID to use.
     */
    cert.setSubject = function (attrs, uniqueId) {
        // set new attributes, clear hash
        __.fillMissingFields(attrs);
        cert.subject.attributes = attrs;
        delete cert.subject.uniqueId;
        if (uniqueId) {
        // TODO: support arbitrary bit length ids
            cert.subject.uniqueId = uniqueId;
        }
        cert.subject.hash = null;
    };

    /**
     * Sets the issuer of this certificate.
     *
     * @param attrs the array of issuer attributes to use.
     * @param uniqueId an optional a unique ID to use.
     */
    cert.setIssuer = function (attrs, uniqueId) {
        // set new attributes, clear hash
        __.fillMissingFields(attrs);
        cert.issuer.attributes = attrs;
        delete cert.issuer.uniqueId;
        if (uniqueId) {
        // TODO: support arbitrary bit length ids
            cert.issuer.uniqueId = uniqueId;
        }
        cert.issuer.hash = null;
    };

    /**
     * Sets the extensions of this certificate.
     *
     * @param exts the array of extensions to use.
     */
    cert.setExtensions = function (exts) {
        for (let i = 0; i < exts.length; ++i) {
            __.fillMissingExtensionFields(exts[i], { cert });
        }
        // set new extensions
        cert.extensions = exts;
    };

    /**
     * Gets an extension by its name or id.
     *
     * @param options the name to use or an object with:
     *          name the name to use.
     *          id the id to use.
     *
     * @return the extension or null if not found.
     */
    cert.getExtension = function (options) {
        if (is.string(options)) {
            options = { name: options };
        }

        let rval = null;
        let ext;
        for (let i = 0; is.null(rval) && i < cert.extensions.length; ++i) {
            ext = cert.extensions[i];
            if (options.id && ext.id === options.id) {
                rval = ext;
            } else if (options.name && ext.name === options.name) {
                rval = ext;
            }
        }
        return rval;
    };

    /**
     * Signs this certificate using the given private key.
     *
     * @param key the private key to sign with.
     * @param md the message digest object to use (defaults to forge.md.sha1).
     */
    cert.sign = function (key, md) {
        // TODO: get signature OID from private key
        cert.md = md || forge.md.sha1.create();
        const algorithmOid = pki.oids[`${cert.md.algorithm}WithRSAEncryption`];
        if (!algorithmOid) {
            const error = new Error("Could not compute certificate digest. " +
          "Unknown message digest algorithm OID.");
            error.algorithm = cert.md.algorithm;
            throw error;
        }
        cert.signatureOid = cert.siginfo.algorithmOid = algorithmOid;

        // get TBSCertificate, convert to DER
        cert.tbsCertificate = pki.getTBSCertificate(cert);
        const bytes = asn1.toDer(cert.tbsCertificate);

        // digest and sign
        cert.md.update(bytes.getBytes());
        cert.signature = key.sign(cert.md);
    };

    /**
     * Attempts verify the signature on the passed certificate using this
     * certificate's public key.
     *
     * @param child the certificate to verify.
     *
     * @return true if verified, false if not.
     */
    cert.verify = function (child) {
        let rval = false;

        if (!cert.issued(child)) {
            const issuer = child.issuer;
            const subject = cert.subject;
            const error = new Error("The parent certificate did not issue the given child certificate; the child certificate's issuer does not match the parent's subject.");
            error.expectedIssuer = issuer.attributes;
            error.actualIssuer = subject.attributes;
            throw error;
        }

        let md = child.md;
        if (is.null(md)) {
        // check signature OID for supported signature types
            if (child.signatureOid in pki.oids) {
                const oid = pki.oids[child.signatureOid];
                switch (oid) {
                    case "sha1WithRSAEncryption":
                        md = forge.md.sha1.create();
                        break;
                    case "md5WithRSAEncryption":
                        md = forge.md.md5.create();
                        break;
                    case "sha256WithRSAEncryption":
                        md = forge.md.sha256.create();
                        break;
                    case "sha384WithRSAEncryption":
                        md = forge.md.sha384.create();
                        break;
                    case "sha512WithRSAEncryption":
                        md = forge.md.sha512.create();
                        break;
                    case "RSASSA-PSS":
                        md = forge.md.sha256.create();
                        break;
                }
            }
            if (is.null(md)) {
                const error = new Error("Could not compute certificate digest. Unknown signature OID.");
                error.signatureOid = child.signatureOid;
                throw error;
            }

            // produce DER formatted TBSCertificate and digest it
            const tbsCertificate = child.tbsCertificate || pki.getTBSCertificate(child);
            const bytes = asn1.toDer(tbsCertificate);
            md.update(bytes.getBytes());
        }

        if (!is.null(md)) {
            let scheme;

            switch (child.signatureOid) {
                case pki.oids.sha1WithRSAEncryption:
                    scheme = undefined; /* use PKCS#1 v1.5 padding scheme */
                    break;
                case pki.oids["RSASSA-PSS"]: {
                    /**
                     * initialize mgf
                     */
                    let hash = pki.oids[child.signatureParameters.mgf.hash.algorithmOid];
                    if (is.undefined(hash) || is.undefined(forge.md[hash])) {
                        const error = new Error("Unsupported MGF hash function.");
                        error.oid = child.signatureParameters.mgf.hash.algorithmOid;
                        error.name = hash;
                        throw error;
                    }

                    let mgf = pki.oids[child.signatureParameters.mgf.algorithmOid];
                    if (is.undefined(mgf) || is.undefined(forge.mgf[mgf])) {
                        const error = new Error("Unsupported MGF function.");
                        error.oid = child.signatureParameters.mgf.algorithmOid;
                        error.name = mgf;
                        throw error;
                    }

                    mgf = forge.mgf[mgf].create(forge.md[hash].create());

                    /**
                     * initialize hash function
                     */
                    hash = pki.oids[child.signatureParameters.hash.algorithmOid];
                    if (is.undefined(hash) || is.undefined(forge.md[hash])) {
                        const error = new Error("Unsupported RSASSA-PSS hash function.");
                        error.oid = child.signatureParameters.hash.algorithmOid;
                        error.name = hash;
                        throw error;
                    }

                    scheme = forge.pss.create(forge.md[hash].create(), mgf,
                        child.signatureParameters.saltLength);
                    break;
                }
            }

            // verify signature on cert using public key
            rval = cert.publicKey.verify(
                md.digest().getBytes(), child.signature, scheme);
        }

        return rval;
    };

    /**
     * Returns true if this certificate's issuer matches the passed
     * certificate's subject. Note that no signature check is performed.
     *
     * @param parent the certificate to check.
     *
     * @return true if this certificate's issuer matches the passed certificate's
     *         subject.
     */
    cert.isIssuer = function (parent) {
        let rval = false;

        const i = cert.issuer;
        const s = parent.subject;

        // compare hashes if present
        if (i.hash && s.hash) {
            rval = (i.hash === s.hash);
        } else if (i.attributes.length === s.attributes.length) {
        // all attributes are the same so issuer matches subject
            rval = true;
            let iattr;
            let sattr;
            for (let n = 0; rval && n < i.attributes.length; ++n) {
                iattr = i.attributes[n];
                sattr = s.attributes[n];
                if (iattr.type !== sattr.type || iattr.value !== sattr.value) {
                    // attribute mismatch
                    rval = false;
                }
            }
        }

        return rval;
    };

    /**
     * Returns true if this certificate's subject matches the issuer of the
     * given certificate). Note that not signature check is performed.
     *
     * @param child the certificate to check.
     *
     * @return true if this certificate's subject matches the passed
     *         certificate's issuer.
     */
    cert.issued = function (child) {
        return child.isIssuer(cert);
    };

    /**
     * Generates the subjectKeyIdentifier for this certificate as byte buffer.
     *
     * @return the subjectKeyIdentifier for this certificate as byte buffer.
     */
    cert.generateSubjectKeyIdentifier = function () {
        /* See: 4.2.1.2 section of the the RFC3280, keyIdentifier is either:

        (1) The keyIdentifier is composed of the 160-bit SHA-1 hash of the
          value of the BIT STRING subjectPublicKey (excluding the tag,
          length, and number of unused bits).

        (2) The keyIdentifier is composed of a four bit type field with
          the value 0100 followed by the least significant 60 bits of the
          SHA-1 hash of the value of the BIT STRING subjectPublicKey
          (excluding the tag, length, and number of unused bit string bits).
      */

        // skipping the tag, length, and number of unused bits is the same
        // as just using the RSAPublicKey (for RSA keys, which are the
        // only ones supported)
        return pki.getPublicKeyFingerprint(cert.publicKey, { type: "RSAPublicKey" });
    };

    /**
     * Verifies the subjectKeyIdentifier extension value for this certificate
     * against its public key. If no extension is found, false will be
     * returned.
     *
     * @return true if verified, false if not.
     */
    cert.verifySubjectKeyIdentifier = function () {
        const oid = pki.oids.subjectKeyIdentifier;
        for (let i = 0; i < cert.extensions.length; ++i) {
            const ext = cert.extensions[i];
            if (ext.id === oid) {
                const ski = cert.generateSubjectKeyIdentifier().getBytes();
                return (forge.util.hexToBytes(ext.subjectKeyIdentifier) === ski);
            }
        }
        return false;
    };

    return cert;
}
