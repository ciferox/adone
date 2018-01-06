const {
    is,
    crypto: { pki }
} = adone;

const __ = adone.private(pki);
const forge = require("node-forge");
const asn1 = forge.asn1;

// validator for an SubjectPublicKeyInfo structure
// Note: Currently only works with an RSA public key
const publicKeyValidator = forge.pki.rsa.publicKeyValidator;

// validator for an X.509v3 certificate
const x509CertificateValidator = {
    name: "Certificate",
    tagClass: asn1.Class.UNIVERSAL,
    type: asn1.Type.SEQUENCE,
    constructed: true,
    value: [{
        name: "Certificate.TBSCertificate",
        tagClass: asn1.Class.UNIVERSAL,
        type: asn1.Type.SEQUENCE,
        constructed: true,
        captureAsn1: "tbsCertificate",
        value: [{
            name: "Certificate.TBSCertificate.version",
            tagClass: asn1.Class.CONTEXT_SPECIFIC,
            type: 0,
            constructed: true,
            optional: true,
            value: [{
                name: "Certificate.TBSCertificate.version.integer",
                tagClass: asn1.Class.UNIVERSAL,
                type: asn1.Type.INTEGER,
                constructed: false,
                capture: "certVersion"
            }]
        }, {
            name: "Certificate.TBSCertificate.serialNumber",
            tagClass: asn1.Class.UNIVERSAL,
            type: asn1.Type.INTEGER,
            constructed: false,
            capture: "certSerialNumber"
        }, {
            name: "Certificate.TBSCertificate.signature",
            tagClass: asn1.Class.UNIVERSAL,
            type: asn1.Type.SEQUENCE,
            constructed: true,
            value: [{
                name: "Certificate.TBSCertificate.signature.algorithm",
                tagClass: asn1.Class.UNIVERSAL,
                type: asn1.Type.OID,
                constructed: false,
                capture: "certinfoSignatureOid"
            }, {
                name: "Certificate.TBSCertificate.signature.parameters",
                tagClass: asn1.Class.UNIVERSAL,
                optional: true,
                captureAsn1: "certinfoSignatureParams"
            }]
        }, {
            name: "Certificate.TBSCertificate.issuer",
            tagClass: asn1.Class.UNIVERSAL,
            type: asn1.Type.SEQUENCE,
            constructed: true,
            captureAsn1: "certIssuer"
        }, {
            name: "Certificate.TBSCertificate.validity",
            tagClass: asn1.Class.UNIVERSAL,
            type: asn1.Type.SEQUENCE,
            constructed: true,
            // Note: UTC and generalized times may both appear so the capture
            // names are based on their detected order, the names used below
            // are only for the common case, which validity time really means
            // "notBefore" and which means "notAfter" will be determined by order
            value: [{
                // notBefore (Time) (UTC time case)
                name: "Certificate.TBSCertificate.validity.notBefore (utc)",
                tagClass: asn1.Class.UNIVERSAL,
                type: asn1.Type.UTCTIME,
                constructed: false,
                optional: true,
                capture: "certValidity1UTCTime"
            }, {
                // notBefore (Time) (generalized time case)
                name: "Certificate.TBSCertificate.validity.notBefore (generalized)",
                tagClass: asn1.Class.UNIVERSAL,
                type: asn1.Type.GENERALIZEDTIME,
                constructed: false,
                optional: true,
                capture: "certValidity2GeneralizedTime"
            }, {
                // notAfter (Time) (only UTC time is supported)
                name: "Certificate.TBSCertificate.validity.notAfter (utc)",
                tagClass: asn1.Class.UNIVERSAL,
                type: asn1.Type.UTCTIME,
                constructed: false,
                optional: true,
                capture: "certValidity3UTCTime"
            }, {
                // notAfter (Time) (only UTC time is supported)
                name: "Certificate.TBSCertificate.validity.notAfter (generalized)",
                tagClass: asn1.Class.UNIVERSAL,
                type: asn1.Type.GENERALIZEDTIME,
                constructed: false,
                optional: true,
                capture: "certValidity4GeneralizedTime"
            }]
        }, {
        // Name (subject) (RDNSequence)
            name: "Certificate.TBSCertificate.subject",
            tagClass: asn1.Class.UNIVERSAL,
            type: asn1.Type.SEQUENCE,
            constructed: true,
            captureAsn1: "certSubject"
        },
        // SubjectPublicKeyInfo
        publicKeyValidator,
        {
        // issuerUniqueID (optional)
            name: "Certificate.TBSCertificate.issuerUniqueID",
            tagClass: asn1.Class.CONTEXT_SPECIFIC,
            type: 1,
            constructed: true,
            optional: true,
            value: [{
                name: "Certificate.TBSCertificate.issuerUniqueID.id",
                tagClass: asn1.Class.UNIVERSAL,
                type: asn1.Type.BITSTRING,
                constructed: false,
                // TODO: support arbitrary bit length ids
                captureBitStringValue: "certIssuerUniqueId"
            }]
        }, {
        // subjectUniqueID (optional)
            name: "Certificate.TBSCertificate.subjectUniqueID",
            tagClass: asn1.Class.CONTEXT_SPECIFIC,
            type: 2,
            constructed: true,
            optional: true,
            value: [{
                name: "Certificate.TBSCertificate.subjectUniqueID.id",
                tagClass: asn1.Class.UNIVERSAL,
                type: asn1.Type.BITSTRING,
                constructed: false,
                // TODO: support arbitrary bit length ids
                captureBitStringValue: "certSubjectUniqueId"
            }]
        }, {
        // Extensions (optional)
            name: "Certificate.TBSCertificate.extensions",
            tagClass: asn1.Class.CONTEXT_SPECIFIC,
            type: 3,
            constructed: true,
            captureAsn1: "certExtensions",
            optional: true
        }]
    }, {
        // AlgorithmIdentifier (signature algorithm)
        name: "Certificate.signatureAlgorithm",
        tagClass: asn1.Class.UNIVERSAL,
        type: asn1.Type.SEQUENCE,
        constructed: true,
        value: [{
        // algorithm
            name: "Certificate.signatureAlgorithm.algorithm",
            tagClass: asn1.Class.UNIVERSAL,
            type: asn1.Type.OID,
            constructed: false,
            capture: "certSignatureOid"
        }, {
            name: "Certificate.TBSCertificate.signature.parameters",
            tagClass: asn1.Class.UNIVERSAL,
            optional: true,
            captureAsn1: "certSignatureParams"
        }]
    }, {
        // SignatureValue
        name: "Certificate.signatureValue",
        tagClass: asn1.Class.UNIVERSAL,
        type: asn1.Type.BITSTRING,
        constructed: false,
        captureBitStringValue: "certSignature"
    }]
};

/**
 * Converts an X.509v3 RSA certificate from an ASN.1 object.
 *
 * Note: If the certificate is to be verified then compute hash should
 * be set to true. There is currently no implementation for converting
 * a certificate back to ASN.1 so the TBSCertificate part of the ASN.1
 * object needs to be scanned before the cert object is created.
 *
 * @param obj the asn1 representation of an X.509v3 RSA certificate.
 * @param computeHash true to compute the hash for verification.
 *
 * @return the certificate.
 */
export default function certificateFromAsn1(obj, computeHash) {
    // validate certificate and capture data
    const capture = {};
    const errors = [];
    if (!asn1.validate(obj, x509CertificateValidator, capture, errors)) {
        const error = new Error("Cannot read X.509 certificate. ASN.1 object is not an X509v3 Certificate.");
        error.errors = errors;
        throw error;
    }

    // get oid
    const oid = asn1.derToOid(capture.publicKeyOid);
    if (oid !== pki.oids.rsaEncryption) {
        throw new Error("Cannot read public key. OID is not RSA.");
    }

    // create certificate
    const cert = pki.createCertificate();
    cert.version = capture.certVersion ?
        capture.certVersion.charCodeAt(0) : 0;
    const serial = forge.util.createBuffer(capture.certSerialNumber);
    cert.serialNumber = serial.toHex();
    cert.signatureOid = forge.asn1.derToOid(capture.certSignatureOid);
    cert.signatureParameters = __.readSignatureParameters(
        cert.signatureOid, capture.certSignatureParams, true);
    cert.siginfo.algorithmOid = forge.asn1.derToOid(capture.certinfoSignatureOid);
    cert.siginfo.parameters = __.readSignatureParameters(cert.siginfo.algorithmOid,
        capture.certinfoSignatureParams, false);
    cert.signature = capture.certSignature;

    const validity = [];
    if (!is.undefined(capture.certValidity1UTCTime)) {
        validity.push(asn1.utcTimeToDate(capture.certValidity1UTCTime));
    }
    if (!is.undefined(capture.certValidity2GeneralizedTime)) {
        validity.push(asn1.generalizedTimeToDate(
            capture.certValidity2GeneralizedTime));
    }
    if (!is.undefined(capture.certValidity3UTCTime)) {
        validity.push(asn1.utcTimeToDate(capture.certValidity3UTCTime));
    }
    if (!is.undefined(capture.certValidity4GeneralizedTime)) {
        validity.push(asn1.generalizedTimeToDate(
            capture.certValidity4GeneralizedTime));
    }
    if (validity.length > 2) {
        throw new Error("Cannot read notBefore/notAfter validity times; more " +
        "than two times were provided in the certificate.");
    }
    if (validity.length < 2) {
        throw new Error("Cannot read notBefore/notAfter validity times; they " +
        "were not provided as either UTCTime or GeneralizedTime.");
    }
    cert.validity.notBefore = validity[0];
    cert.validity.notAfter = validity[1];

    // keep TBSCertificate to preserve signature when exporting
    cert.tbsCertificate = capture.tbsCertificate;

    if (computeHash) {
        // check signature OID for supported signature types
        cert.md = null;
        if (cert.signatureOid in pki.oids) {
            switch (pki.oids[cert.signatureOid]) {
                case "sha1WithRSAEncryption":
                    cert.md = forge.md.sha1.create();
                    break;
                case "md5WithRSAEncryption":
                    cert.md = forge.md.md5.create();
                    break;
                case "sha256WithRSAEncryption":
                    cert.md = forge.md.sha256.create();
                    break;
                case "sha384WithRSAEncryption":
                    cert.md = forge.md.sha384.create();
                    break;
                case "sha512WithRSAEncryption":
                    cert.md = forge.md.sha512.create();
                    break;
                case "RSASSA-PSS":
                    cert.md = forge.md.sha256.create();
                    break;
            }
        }
        if (is.null(cert.md)) {
            const error = new Error("Could not compute certificate digest. " +
          "Unknown signature OID.");
            error.signatureOid = cert.signatureOid;
            throw error;
        }

        // produce DER formatted TBSCertificate and digest it
        const bytes = asn1.toDer(cert.tbsCertificate);
        cert.md.update(bytes.getBytes());
    }

    // handle issuer, build issuer message digest
    const imd = forge.md.sha1.create();
    cert.issuer.getField = function (sn) {
        return __.getAttribute(cert.issuer, sn);
    };
    cert.issuer.addField = function (attr) {
        __.fillMissingFields([attr]);
        cert.issuer.attributes.push(attr);
    };
    cert.issuer.attributes = pki.RDNAttributesAsArray(capture.certIssuer, imd);
    if (capture.certIssuerUniqueId) {
        cert.issuer.uniqueId = capture.certIssuerUniqueId;
    }
    cert.issuer.hash = imd.digest().toHex();

    // handle subject, build subject message digest
    const smd = forge.md.sha1.create();
    cert.subject.getField = function (sn) {
        return __.getAttribute(cert.subject, sn);
    };
    cert.subject.addField = function (attr) {
        __.fillMissingFields([attr]);
        cert.subject.attributes.push(attr);
    };
    cert.subject.attributes = pki.RDNAttributesAsArray(capture.certSubject, smd);
    if (capture.certSubjectUniqueId) {
        cert.subject.uniqueId = capture.certSubjectUniqueId;
    }
    cert.subject.hash = smd.digest().toHex();

    // handle extensions
    if (capture.certExtensions) {
        cert.extensions = pki.certificateExtensionsFromAsn1(capture.certExtensions);
    } else {
        cert.extensions = [];
    }

    // convert RSA public key from ASN.1
    cert.publicKey = pki.publicKeyFromAsn1(capture.subjectPublicKeyInfo);

    return cert;
}
