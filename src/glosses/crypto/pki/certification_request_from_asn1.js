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


// validator for a CertificationRequestInfo structure
const certificationRequestInfoValidator = {
    name: "CertificationRequestInfo",
    tagClass: asn1.Class.UNIVERSAL,
    type: asn1.Type.SEQUENCE,
    constructed: true,
    captureAsn1: "certificationRequestInfo",
    value: [{
        name: "CertificationRequestInfo.integer",
        tagClass: asn1.Class.UNIVERSAL,
        type: asn1.Type.INTEGER,
        constructed: false,
        capture: "certificationRequestInfoVersion"
    }, {
        // Name (subject) (RDNSequence)
        name: "CertificationRequestInfo.subject",
        tagClass: asn1.Class.UNIVERSAL,
        type: asn1.Type.SEQUENCE,
        constructed: true,
        captureAsn1: "certificationRequestInfoSubject"
    },
    // SubjectPublicKeyInfo
    publicKeyValidator,
    {
        name: "CertificationRequestInfo.attributes",
        tagClass: asn1.Class.CONTEXT_SPECIFIC,
        type: 0,
        constructed: true,
        optional: true,
        capture: "certificationRequestInfoAttributes",
        value: [{
            name: "CertificationRequestInfo.attributes",
            tagClass: asn1.Class.UNIVERSAL,
            type: asn1.Type.SEQUENCE,
            constructed: true,
            value: [{
                name: "CertificationRequestInfo.attributes.type",
                tagClass: asn1.Class.UNIVERSAL,
                type: asn1.Type.OID,
                constructed: false
            }, {
                name: "CertificationRequestInfo.attributes.value",
                tagClass: asn1.Class.UNIVERSAL,
                type: asn1.Type.SET,
                constructed: true
            }]
        }]
    }]
};

// validator for a CertificationRequest structure
const certificationRequestValidator = {
    name: "CertificationRequest",
    tagClass: asn1.Class.UNIVERSAL,
    type: asn1.Type.SEQUENCE,
    constructed: true,
    captureAsn1: "csr",
    value: [
        certificationRequestInfoValidator, {
            // AlgorithmIdentifier (signature algorithm)
            name: "CertificationRequest.signatureAlgorithm",
            tagClass: asn1.Class.UNIVERSAL,
            type: asn1.Type.SEQUENCE,
            constructed: true,
            value: [{
                // algorithm
                name: "CertificationRequest.signatureAlgorithm.algorithm",
                tagClass: asn1.Class.UNIVERSAL,
                type: asn1.Type.OID,
                constructed: false,
                capture: "csrSignatureOid"
            }, {
                name: "CertificationRequest.signatureAlgorithm.parameters",
                tagClass: asn1.Class.UNIVERSAL,
                optional: true,
                captureAsn1: "csrSignatureParams"
            }]
        }, {
            // signature
            name: "CertificationRequest.signature",
            tagClass: asn1.Class.UNIVERSAL,
            type: asn1.Type.BITSTRING,
            constructed: false,
            captureBitStringValue: "csrSignature"
        }]
};

/**
 * Converts a PKCS#10 certification request (CSR) from an ASN.1 object.
 *
 * Note: If the certification request is to be verified then compute hash
 * should be set to true. There is currently no implementation for converting
 * a certificate back to ASN.1 so the CertificationRequestInfo part of the
 * ASN.1 object needs to be scanned before the csr object is created.
 *
 * @param obj the asn1 representation of a PKCS#10 certification request (CSR).
 * @param computeHash true to compute the hash for verification.
 *
 * @return the certification request (CSR).
 */
export default function certificationRequestFromAsn1(obj, computeHash) {
    // validate certification request and capture data
    const capture = {};
    const errors = [];
    if (!asn1.validate(obj, certificationRequestValidator, capture, errors)) {
        const error = new Error("Cannot read PKCS#10 certificate request. ASN.1 object is not a PKCS#10 CertificationRequest.");
        error.errors = errors;
        throw error;
    }

    // get oid
    const oid = asn1.derToOid(capture.publicKeyOid);
    if (oid !== pki.oids.rsaEncryption) {
        throw new Error("Cannot read public key. OID is not RSA.");
    }

    // create certification request
    const csr = pki.createCertificationRequest();
    csr.version = capture.csrVersion ? capture.csrVersion.charCodeAt(0) : 0;
    csr.signatureOid = forge.asn1.derToOid(capture.csrSignatureOid);
    csr.signatureParameters = __.readSignatureParameters(
        csr.signatureOid, capture.csrSignatureParams, true);
    csr.siginfo.algorithmOid = forge.asn1.derToOid(capture.csrSignatureOid);
    csr.siginfo.parameters = __.readSignatureParameters(
        csr.siginfo.algorithmOid, capture.csrSignatureParams, false);
    csr.signature = capture.csrSignature;

    // keep CertificationRequestInfo to preserve signature when exporting
    csr.certificationRequestInfo = capture.certificationRequestInfo;

    if (computeHash) {
        // check signature OID for supported signature types
        csr.md = null;
        if (csr.signatureOid in pki.oids) {
            switch (pki.oids[csr.signatureOid]) {
                case "sha1WithRSAEncryption":
                    csr.md = forge.md.sha1.create();
                    break;
                case "md5WithRSAEncryption":
                    csr.md = forge.md.md5.create();
                    break;
                case "sha256WithRSAEncryption":
                    csr.md = forge.md.sha256.create();
                    break;
                case "sha384WithRSAEncryption":
                    csr.md = forge.md.sha384.create();
                    break;
                case "sha512WithRSAEncryption":
                    csr.md = forge.md.sha512.create();
                    break;
                case "RSASSA-PSS":
                    csr.md = forge.md.sha256.create();
                    break;
            }
        }
        if (is.null(csr.md)) {
            const error = new Error("Could not compute certification request digest. " +
          "Unknown signature OID.");
            error.signatureOid = csr.signatureOid;
            throw error;
        }

        // produce DER formatted CertificationRequestInfo and digest it
        const bytes = asn1.toDer(csr.certificationRequestInfo);
        csr.md.update(bytes.getBytes());
    }

    // handle subject, build subject message digest
    const smd = forge.md.sha1.create();
    csr.subject.getField = function (sn) {
        return __.getAttribute(csr.subject, sn);
    };
    csr.subject.addField = function (attr) {
        __.fillMissingFields([attr]);
        csr.subject.attributes.push(attr);
    };
    csr.subject.attributes = pki.RDNAttributesAsArray(
        capture.certificationRequestInfoSubject, smd);
    csr.subject.hash = smd.digest().toHex();

    // convert RSA public key from ASN.1
    csr.publicKey = pki.publicKeyFromAsn1(capture.subjectPublicKeyInfo);

    // convert attributes from ASN.1
    csr.getAttribute = function (sn) {
        return __.getAttribute(csr, sn);
    };
    csr.addAttribute = function (attr) {
        __.fillMissingFields([attr]);
        csr.attributes.push(attr);
    };
    csr.attributes = pki.CRIAttributesAsArray(
        capture.certificationRequestInfoAttributes || []);

    return csr;
}
