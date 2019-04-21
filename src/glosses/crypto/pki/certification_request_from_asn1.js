const {
    is,
    crypto
} = adone;

const {
    pki,
    asn1
} = crypto;

const __ = adone.getPrivate(pki);

// validator for a CertificationRequestInfo structure
const certificationRequestInfoValidator = new asn1.Sequence({
    name: "certificationRequestInfo",
    value: [
        new asn1.Integer({
            name: "csrVersion"
        }),
        new asn1.Sequence({
            // Name (subject) (RDNSequence)
            name: "certificationRequestInfoSubject"
        }),
        // SubjectPublicKeyInfo
        __.publicKeyValidator,
        new asn1.Constructed({
            optional: true,
            idBlock: {
                tagClass: 3, // CONTEXT-SPECIFIC
                tagNumber: 0 // [0]
            },
            name: "certificationRequestInfoAttributes",
            value: [
                new asn1.Sequence({
                    optional: true,
                    value: [
                        new asn1.ObjectIdentifier(),
                        new asn1.Set()
                    ]
                })
            ]
        })
    ]
});

// validator for a CertificationRequest structure
const certificationRequestValidator = new asn1.Sequence({
    name: "csr",
    value: [
        certificationRequestInfoValidator,
        new asn1.Sequence({
            // AlgorithmIdentifier (signature algorithm)
            value: [
                new asn1.ObjectIdentifier({
                    // algorithm
                    name: "csrSignatureOid"
                }),
                new asn1.Any({
                    optional: true,
                    name: "csrSignatureParams"
                })
            ]
        }),
        new asn1.BitString({
            // signature
            name: "csrSignature"
        })
    ]
});

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
    const validation = asn1.compareSchema(obj, obj, certificationRequestValidator);

    if (!validation.verified) {
        throw new Error("Cannot read PKCS#10 certificate request. ASN.1 object is not a PKCS#10 CertificationRequest.");
    }

    const { result } = validation;

    // get oid
    const oid = result.publicKeyOid.valueBlock.toString();

    if (oid !== pki.oids.rsaEncryption) {
        throw new Error("Cannot read public key. OID is not RSA.");
    }

    // create certification request
    const csr = pki.createCertificationRequest();

    csr.version = result.csrVersion.valueBlock.valueDec;
    csr.signatureOid = result.csrSignatureOid.valueBlock.toString();
    csr.signatureParameters = __.readSignatureParameters(csr.signatureOid, result.csrSignatureParams, true);
    csr.siginfo.algorithmOid = result.csrSignatureOid.valueBlock.toString();
    csr.siginfo.parameters = __.readSignatureParameters(csr.siginfo.algorithmOid, result.csrSignatureParams, false);
    csr.signature = Buffer.from(result.csrSignature.valueBlock.valueHex);

    // keep CertificationRequestInfo to preserve signature when exporting
    csr.certificationRequestInfo = result.certificationRequestInfo;

    if (computeHash) {
        // check signature OID for supported signature types
        csr.md = null;
        if (csr.signatureOid in pki.oids) {
            switch (pki.oids[csr.signatureOid]) {
                case "sha1WithRSAEncryption":
                    csr.md = crypto.md.sha1.create();
                    break;
                case "md5WithRSAEncryption":
                    csr.md = crypto.md.md5.create();
                    break;
                case "sha256WithRSAEncryption":
                    csr.md = crypto.md.sha256.create();
                    break;
                case "sha384WithRSAEncryption":
                    csr.md = crypto.md.sha384.create();
                    break;
                case "sha512WithRSAEncryption":
                    csr.md = crypto.md.sha512.create();
                    break;
                case "RSASSA-PSS":
                    csr.md = crypto.md.sha256.create();
                    break;
            }
        }
        if (is.null(csr.md)) {
            const error = new Error("Could not compute certification request digest. Unknown signature OID.");
            error.signatureOid = csr.signatureOid;
            throw error;
        }

        // produce DER formatted CertificationRequestInfo and digest it
        const bytes = Buffer.from(csr.certificationRequestInfo.toBER());
        csr.md.update(bytes);
    }

    // handle subject, build subject message digest
    const smd = crypto.md.sha1.create();
    csr.subject.getField = function (sn) {
        return __.getAttribute(csr.subject, sn);
    };
    csr.subject.addField = function (attr) {
        __.fillMissingFields([attr]);
        csr.subject.attributes.push(attr);
    };
    csr.subject.attributes = pki.RDNAttributesAsArray(result.certificationRequestInfoSubject, smd);
    csr.subject.hash = smd.digest().toString("hex");

    // convert RSA public key from ASN.1
    csr.publicKey = pki.publicKeyFromAsn1(asn1.fromBER(result.subjectPublicKey.valueBlock.valueHex).result);

    // convert attributes from ASN.1
    csr.getAttribute = function (sn) {
        return __.getAttribute(csr, sn);
    };
    csr.addAttribute = function (attr) {
        __.fillMissingFields([attr]);
        csr.attributes.push(attr);
    };

    csr.attributes = pki.CRIAttributesAsArray(result.certificationRequestInfoAttributes || []);

    return csr;
}
