const {
    is,
    crypto: { pki }
} = adone;

const __ = adone.private(pki);

const forge = require("node-forge");
const asn1 = forge.asn1;

/**
 * Creates a CA store.
 *
 * @param certs an optional array of certificate objects or PEM-formatted
 *          certificate strings to add to the CA store.
 *
 * @return the CA store.
 */
export default function createCaStore(certs) {
    // create CA store
    const caStore = {
        // stored certificates
        certs: {}
    };

    const ensureSubjectHasHash = (subject) => {
        // produce subject hash if it doesn't exist
        if (!subject.hash) {
            const md = forge.md.sha1.create();
            subject.attributes = pki.RDNAttributesAsArray(__.dnToAsn1(subject), md);
            subject.hash = md.digest().toHex();
        }
    };

    const getBySubject = (subject) => {
        ensureSubjectHasHash(subject);
        return caStore.certs[subject.hash] || null;
    };

    /**
     * Gets the certificate that issued the passed certificate or its
     * 'parent'.
     *
     * @param cert the certificate to get the parent for.
     *
     * @return the parent certificate or null if none was found.
     */
    caStore.getIssuer = function (cert) {
        const rval = getBySubject(cert.issuer);

        // see if there are multiple matches
        /*if(forge.util.isArray(rval)) {
        // TODO: resolve multiple matches by checking
        // authorityKey/subjectKey/issuerUniqueID/other identifiers, etc.
        // FIXME: or alternatively do authority key mapping
        // if possible (X.509v1 certs can't work?)
        throw new Error('Resolving multiple issuer matches not implemented yet.');
      }*/

        return rval;
    };

    /**
     * Adds a trusted certificate to the store.
     *
     * @param cert the certificate to add as a trusted certificate (either a
     *          pki.certificate object or a PEM-formatted certificate).
     */
    caStore.addCertificate = function (cert) {
        // convert from pem if necessary
        if (is.string(cert)) {
            cert = forge.pki.certificateFromPem(cert);
        }

        ensureSubjectHasHash(cert.subject);

        if (!caStore.hasCertificate(cert)) { // avoid duplicate certificates in store
            if (cert.subject.hash in caStore.certs) {
                // subject hash already exists, append to array
                let tmp = caStore.certs[cert.subject.hash];
                if (!forge.util.isArray(tmp)) {
                    tmp = [tmp];
                }
                tmp.push(cert);
                caStore.certs[cert.subject.hash] = tmp;
            } else {
                caStore.certs[cert.subject.hash] = cert;
            }
        }
    };

    /**
     * Checks to see if the given certificate is in the store.
     *
     * @param cert the certificate to check (either a pki.certificate or a
     *          PEM-formatted certificate).
     *
     * @return true if the certificate is in the store, false if not.
     */
    caStore.hasCertificate = function (cert) {
        // convert from pem if necessary
        if (is.string(cert)) {
            cert = forge.pki.certificateFromPem(cert);
        }

        let match = getBySubject(cert.subject);
        if (!match) {
            return false;
        }
        if (!forge.util.isArray(match)) {
            match = [match];
        }
        // compare DER-encoding of certificates
        const der1 = asn1.toDer(pki.certificateToAsn1(cert)).getBytes();
        for (let i = 0; i < match.length; ++i) {
            const der2 = asn1.toDer(pki.certificateToAsn1(match[i])).getBytes();
            if (der1 === der2) {
                return true;
            }
        }
        return false;
    };

    /**
     * Lists all of the certificates kept in the store.
     *
     * @return an array of all of the pki.certificate objects in the store.
     */
    caStore.listAllCertificates = function () {
        const certList = [];

        for (const hash in caStore.certs) {
            if (caStore.certs.hasOwnProperty(hash)) {
                const value = caStore.certs[hash];
                if (!forge.util.isArray(value)) {
                    certList.push(value);
                } else {
                    for (let i = 0; i < value.length; ++i) {
                        certList.push(value[i]);
                    }
                }
            }
        }

        return certList;
    };

    /**
     * Removes a certificate from the store.
     *
     * @param cert the certificate to remove (either a pki.certificate or a
     *          PEM-formatted certificate).
     *
     * @return the certificate that was removed or null if the certificate
     *           wasn't in store.
     */
    caStore.removeCertificate = function (cert) {
        let result;

        // convert from pem if necessary
        if (is.string(cert)) {
            cert = forge.pki.certificateFromPem(cert);
        }
        ensureSubjectHasHash(cert.subject);
        if (!caStore.hasCertificate(cert)) {
            return null;
        }

        const match = getBySubject(cert.subject);

        if (!forge.util.isArray(match)) {
            result = caStore.certs[cert.subject.hash];
            delete caStore.certs[cert.subject.hash];
            return result;
        }

        // compare DER-encoding of certificates
        const der1 = asn1.toDer(pki.certificateToAsn1(cert)).getBytes();
        for (let i = 0; i < match.length; ++i) {
            const der2 = asn1.toDer(pki.certificateToAsn1(match[i])).getBytes();
            if (der1 === der2) {
                result = match[i];
                match.splice(i, 1);
            }
        }
        if (match.length === 0) {
            delete caStore.certs[cert.subject.hash];
        }

        return result;
    };

    // auto-add passed in certs
    if (certs) {
        // parse PEM-formatted certificates as necessary
        for (let i = 0; i < certs.length; ++i) {
            const cert = certs[i];
            caStore.addCertificate(cert);
        }
    }

    return caStore;
}

