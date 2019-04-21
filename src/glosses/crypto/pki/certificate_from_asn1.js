const {
    is,
    crypto
} = adone;

const {
    pki,
    asn1
} = crypto;

const __ = adone.getPrivate(pki);

// validator for an X.509v3 certificate
const x509CertificateValidator = new asn1.Sequence({
    value: [
        new asn1.Sequence({
            name: "tbsCertificate",
            value: [
                new asn1.Constructed({
                    idBlock: {
                        tagClass: 3, // CONTEXT_SPECIFIC
                        tagNumber: 0
                    },
                    optional: true,
                    value: [
                        new asn1.Integer({
                            name: "certVersion"
                        })
                    ]
                }),
                new asn1.Integer({
                    name: "certSerialNumber"
                }),
                new asn1.Sequence({
                    value: [
                        new asn1.ObjectIdentifier({
                            name: "certinfoSignatureOid"
                        }),
                        new asn1.Any({
                            optional: true,
                            name: "certinfoSignatureParams"
                        })
                    ]
                }),
                new asn1.Sequence({
                    name: "certIssuer"
                }),
                new asn1.Sequence({
                    // Note: UTC and generalized times may both appear so the capture
                    // names are based on their detected order, the names used below
                    // are only for the common case, which validity time really means
                    // "notBefore" and which means "notAfter" will be determined by order
                    value: [
                        new asn1.UTCTime({
                            // notBefore (Time) (UTC time case)
                            optional: true,
                            name: "certValidity1UTCTime"
                        }),
                        new asn1.GeneralizedTime({
                            // notBefore (Time) (generalized time case)
                            optional: true,
                            name: "certValidity2GeneralizedTime"
                        }),
                        new asn1.UTCTime({
                            // notAfter (Time) (only UTC time is supported)
                            optional: true,
                            name: "certValidity3UTCTime"
                        }),
                        new asn1.GeneralizedTime({
                            // notAfter (Time) (only UTC time is supported)
                            optional: true,
                            name: "certValidity4GeneralizedTime"
                        })
                    ]
                }),
                new asn1.Sequence({
                    // Name (subject) (RDNSequence)
                    name: "certSubject"
                }),
                // SubjectPublicKeyInfo
                __.publicKeyValidator,
                new asn1.Constructed({
                    // issuerUniqueID (optional)
                    idBlock: {
                        tagClass: 3, // CONTEXT_SPECIFIC
                        tagNumber: 1
                    },
                    optional: true,
                    value: [
                        new asn1.BitString({
                            // TODO: support arbitrary bit length ids
                            name: "certIssuerUniqueId"
                        })
                    ]
                }),
                new asn1.Constructed({
                    // subjectUniqueID (optional)
                    idBlock: {
                        tagClass: 3, // CONTEXT_SPECIFIC
                        tagNumber: 2
                    },
                    optional: true,
                    value: [
                        new asn1.BitString({
                            // TODO: support arbitrary bit length ids
                            name: "certSubjectUniqueId"
                        })
                    ]
                }),
                new asn1.Constructed({
                    idBlock: {
                        tagClass: 3, // CONTEXT_SPECIFIC
                        tagNumber: 3
                    },
                    // Extensions (optional)
                    optional: true,
                    name: "certExtensions"
                })
            ]
        }),
        new asn1.Sequence({
            // AlgorithmIdentifier (signature algorithm)
            value: [
                new asn1.ObjectIdentifier({
                    // algorithm
                    name: "certSignatureOid"
                }),
                new asn1.Any({
                    optional: true,
                    name: "certSignatureParams"
                })
            ]
        }),
        new asn1.BitString({
            // SignatureValue
            name: "certSignature"
        })
    ]
});

const utcTimeToDate = ({ year, month, day, hour, minute, second }) => {
    return new Date(Date.UTC(year, month - 1, day, hour, minute, second));
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
    const validation = asn1.compareSchema(obj, obj, x509CertificateValidator);
    if (!validation.verified) {
        throw new Error("Cannot read X.509 certificate. ASN.1 object is not an X509v3 Certificate.");
    }

    const { result } = validation;

    // get oid
    const oid = result.publicKeyOid.valueBlock.toString();

    if (oid !== pki.oids.rsaEncryption) {
        throw new Error("Cannot read public key. OID is not RSA.");
    }

    // create certificate
    const cert = pki.createCertificate();
    cert.version = result.certVersion.valueBlock.valueDec;
    cert.serialNumber = Buffer.from(result.certSerialNumber.valueBlock.valueHex).toString("hex");
    cert.signatureOid = result.certSignatureOid.valueBlock.toString();
    cert.signatureParameters = __.readSignatureParameters(cert.signatureOid, result.certSignatureParams, true);
    cert.siginfo.algorithmOid = result.certinfoSignatureOid.valueBlock.toString();
    cert.siginfo.parameters = __.readSignatureParameters(cert.siginfo.algorithmOid, result.certinfoSignatureParams, false);
    cert.signature = Buffer.from(result.certSignature.valueBlock.valueHex);

    const validity = [];
    if (result.certValidity1UTCTime) {
        validity.push(utcTimeToDate(result.certValidity1UTCTime));
    }
    if (result.certValidity2GeneralizedTime) {
        validity.push(asn1.generalizedTimeToDate(capture.certValidity2GeneralizedTime));
    }
    if (result.certValidity3UTCTime) {
        validity.push(utcTimeToDate(result.certValidity3UTCTime));
    }
    if (result.certValidity4GeneralizedTime) {
        validity.push(asn1.generalizedTimeToDate(capture.certValidity4GeneralizedTime));
    }
    if (validity.length > 2) {
        throw new Error("Cannot read notBefore/notAfter validity times; more than two times were provided in the certificate.");
    }
    if (validity.length < 2) {
        throw new Error("Cannot read notBefore/notAfter validity times; they were not provided as either UTCTime or GeneralizedTime.");
    }
    cert.validity.notBefore = validity[0];
    cert.validity.notAfter = validity[1];

    // keep TBSCertificate to preserve signature when exporting
    cert.tbsCertificate = result.tbsCertificate;

    if (computeHash) {
        // check signature OID for supported signature types
        cert.md = null;
        if (cert.signatureOid in pki.oids) {
            switch (pki.oids[cert.signatureOid]) {
                case "sha1WithRSAEncryption":
                    cert.md = crypto.md.sha1.create();
                    break;
                case "md5WithRSAEncryption":
                    cert.md = crypto.md.md5.create();
                    break;
                case "sha256WithRSAEncryption":
                    cert.md = crypto.md.sha256.create();
                    break;
                case "sha384WithRSAEncryption":
                    cert.md = crypto.md.sha384.create();
                    break;
                case "sha512WithRSAEncryption":
                    cert.md = crypto.md.sha512.create();
                    break;
                case "RSASSA-PSS":
                    cert.md = crypto.md.sha256.create();
                    break;
            }
        }
        if (is.null(cert.md)) {
            const error = new Error("Could not compute certificate digest. Unknown signature OID.");
            error.signatureOid = cert.signatureOid;
            throw error;
        }

        // produce DER formatted TBSCertificate and digest it
        const bytes = Buffer.from(cert.tbsCertificate.toBER());
        cert.md.update(bytes);
    }

    // handle issuer, build issuer message digest
    const imd = crypto.md.sha1.create();
    cert.issuer.getField = function (sn) {
        return __.getAttribute(cert.issuer, sn);
    };
    cert.issuer.addField = function (attr) {
        __.fillMissingFields([attr]);
        cert.issuer.attributes.push(attr);
    };
    cert.issuer.attributes = pki.RDNAttributesAsArray(result.certIssuer, imd);
    if (result.certIssuerUniqueId) {
        cert.issuer.uniqueId = Buffer.from(result.certIssuerUniqueId.valueBlock.valueHex);
    }
    cert.issuer.hash = imd.digest().toString("hex");

    // handle subject, build subject message digest
    const smd = crypto.md.sha1.create();
    cert.subject.getField = function (sn) {
        return __.getAttribute(cert.subject, sn);
    };
    cert.subject.addField = function (attr) {
        __.fillMissingFields([attr]);
        cert.subject.attributes.push(attr);
    };
    cert.subject.attributes = pki.RDNAttributesAsArray(result.certSubject, smd);
    if (result.certSubjectUniqueId) {
        cert.subject.uniqueId = Buffer.from(result.certSubjectUniqueId);
    }
    cert.subject.hash = smd.digest().toString("hex");

    // handle extensions
    if (result.certExtensions) {
        cert.extensions = pki.certificateExtensionsFromAsn1(result.certExtensions);
    } else {
        cert.extensions = [];
    }

    // convert RSA public key from ASN.1
    cert.publicKey = pki.publicKeyFromAsn1(asn1.fromBER(result.subjectPublicKey.valueBlock.valueHex).result);

    return cert;
}
