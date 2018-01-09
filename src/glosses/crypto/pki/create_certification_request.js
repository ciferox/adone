const {
    is,
    crypto
} = adone;

const {
    pki
} = crypto;

const __ = adone.private(pki);

/**
 * Creates an empty certification request (a CSR or certificate signing
 * request). Once created, its public key and attributes can be set and then
 * it can be signed.
 *
 * @return the empty certification request.
 */
export default function createCertificationRequest() {
    const csr = {};
    csr.version = 0x00;
    csr.signatureOid = null;
    csr.signature = null;
    csr.siginfo = {};
    csr.siginfo.algorithmOid = null;

    csr.subject = {};
    csr.subject.getField = function (sn) {
        return __.getAttribute(csr.subject, sn);
    };
    csr.subject.addField = function (attr) {
        __.fillMissingFields([attr]);
        csr.subject.attributes.push(attr);
    };
    csr.subject.attributes = [];
    csr.subject.hash = null;

    csr.publicKey = null;
    csr.attributes = [];
    csr.getAttribute = function (sn) {
        return __.getAttribute(csr, sn);
    };
    csr.addAttribute = function (attr) {
        __.fillMissingFields([attr]);
        csr.attributes.push(attr);
    };
    csr.md = null;

    /**
     * Sets the subject of this certification request.
     *
     * @param attrs the array of subject attributes to use.
     */
    csr.setSubject = function (attrs) {
        // set new attributes
        __.fillMissingFields(attrs);
        csr.subject.attributes = attrs;
        csr.subject.hash = null;
    };

    /**
     * Sets the attributes of this certification request.
     *
     * @param attrs the array of attributes to use.
     */
    csr.setAttributes = function (attrs) {
        // set new attributes
        __.fillMissingFields(attrs);
        csr.attributes = attrs;
    };

    /**
     * Signs this certification request using the given private key.
     *
     * @param key the private key to sign with.
     * @param md the message digest object to use (defaults to forge.md.sha1).
     */
    csr.sign = function (key, md) {
        // TODO: get signature OID from private key
        csr.md = md || crypto.md.sha1.create();
        const algorithmOid = pki.oids[`${csr.md.algorithm}WithRSAEncryption`];
        if (!algorithmOid) {
            const error = new Error("Could not compute certification request digest. Unknown message digest algorithm OID.");
            error.algorithm = csr.md.algorithm;
            throw error;
        }
        csr.signatureOid = csr.siginfo.algorithmOid = algorithmOid;

        // get CertificationRequestInfo, convert to DER
        csr.certificationRequestInfo = pki.getCertificationRequestInfo(csr);
        const bytes = Buffer.from(csr.certificationRequestInfo.toBER());

        // digest and sign
        csr.md.update(bytes);
        csr.signature = key.sign(csr.md);
    };

    /**
     * Attempts verify the signature on the passed certification request using
     * its public key.
     *
     * A CSR that has been exported to a file in PEM format can be verified using
     * OpenSSL using this command:
     *
     * openssl req -in <the-csr-pem-file> -verify -noout -text
     *
     * @return true if verified, false if not.
     */
    csr.verify = function () {
        let rval = false;

        let md = csr.md;
        if (is.null(md)) {
            // check signature OID for supported signature types
            if (csr.signatureOid in pki.oids) {
                // TODO: create DRY `OID to md` function
                const oid = pki.oids[csr.signatureOid];
                switch (oid) {
                    case "sha1WithRSAEncryption":
                        md = crypto.md.sha1.create();
                        break;
                    case "md5WithRSAEncryption":
                        md = crypto.md.md5.create();
                        break;
                    case "sha256WithRSAEncryption":
                        md = crypto.md.sha256.create();
                        break;
                    case "sha384WithRSAEncryption":
                        md = crypto.md.sha384.create();
                        break;
                    case "sha512WithRSAEncryption":
                        md = crypto.md.sha512.create();
                        break;
                    case "RSASSA-PSS":
                        md = crypto.md.sha256.create();
                        break;
                }
            }
            if (is.null(md)) {
                const error = new Error("Could not compute certification request digest. Unknown signature OID.");
                error.signatureOid = csr.signatureOid;
                throw error;
            }

            // produce DER formatted CertificationRequestInfo and digest it
            const cri = csr.certificationRequestInfo || pki.getCertificationRequestInfo(csr);
            const bytes = Buffer.from(cri.toBER());
            md.update(bytes);
        }

        if (!is.null(md)) {
            let scheme;

            switch (csr.signatureOid) {
                case pki.oids.sha1WithRSAEncryption:
                    /* use PKCS#1 v1.5 padding scheme */
                    break;
                case pki.oids["RSASSA-PSS"]: {
                    /**
                     * initialize mgf
                     */
                    let hash = pki.oids[csr.signatureParameters.mgf.hash.algorithmOid];
                    if (is.undefined(hash) || is.undefined(crypto.md[hash])) {
                        const error = new Error("Unsupported MGF hash function.");
                        error.oid = csr.signatureParameters.mgf.hash.algorithmOid;
                        error.name = hash;
                        throw error;
                    }

                    let mgf = pki.oids[csr.signatureParameters.mgf.algorithmOid];
                    if (is.undefined(mgf) || is.undefined(crypto.mgf[mgf])) {
                        const error = new Error("Unsupported MGF function.");
                        error.oid = csr.signatureParameters.mgf.algorithmOid;
                        error.name = mgf;
                        throw error;
                    }

                    mgf = crypto.mgf[mgf].create(crypto.md[hash].create());

                    /**
                     * initialize hash function
                     */
                    hash = pki.oids[csr.signatureParameters.hash.algorithmOid];
                    if (is.undefined(hash) || is.undefined(crypto.md[hash])) {
                        const error = new Error("Unsupported RSASSA-PSS hash function.");
                        error.oid = csr.signatureParameters.hash.algorithmOid;
                        error.name = hash;
                        throw error;
                    }

                    scheme = crypto.pss.create(hash, mgf, csr.signatureParameters.saltLength);
                    break;
                }
            }

            // verify signature on csr using its public key
            rval = csr.publicKey.verify(md.digest(), csr.signature, scheme);
        }

        return rval;
    };

    return csr;
}
