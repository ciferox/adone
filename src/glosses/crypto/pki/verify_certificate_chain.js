const {
    is,
    crypto: { pki }
} = adone;

const forge = require("node-forge");

/**
 * Verifies a certificate chain against the given Certificate Authority store
 * with an optional custom verify callback.
 *
 * @param caStore a certificate store to verify against.
 * @param chain the certificate chain to verify, with the root or highest
 *          authority at the end (an array of certificates).
 * @param verify called for every certificate in the chain.
 *
 * The verify callback has the following signature:
 *
 * verified - Set to true if certificate was verified, otherwise the
 *   pki.certificateError for why the certificate failed.
 * depth - The current index in the chain, where 0 is the end point's cert.
 * certs - The certificate chain, *NOTE* an empty chain indicates an anonymous
 *   end point.
 *
 * The function returns true on success and on failure either the appropriate
 * pki.certificateError or an object with 'error' set to the appropriate
 * pki.certificateError and 'message' set to a custom error message.
 *
 * @return true if successful, error thrown if not.
 */
export default function verifyCertificateChain(caStore, chain, verify) {
    /**
     * From: RFC3280 - Internet X.509 Public Key Infrastructure Certificate
     * Section 6: Certification Path Validation
     * See inline parentheticals related to this particular implementation.
     *
     * The primary goal of path validation is to verify the binding between
     * a subject distinguished name or a subject alternative name and subject
     * public key, as represented in the end entity certificate, based on the
     * public key of the trust anchor. This requires obtaining a sequence of
     * certificates that support that binding. That sequence should be provided
     * in the passed 'chain'. The trust anchor should be in the given CA
     * store. The 'end entity' certificate is the certificate provided by the
     * end point (typically a server) and is the first in the chain.
     *
     * To meet this goal, the path validation process verifies, among other
     * things, that a prospective certification path (a sequence of n
     * certificates or a 'chain') satisfies the following conditions:
     *
     * (a) for all x in {1, ..., n-1}, the subject of certificate x is
     * the issuer of certificate x+1;
     *
     * (b) certificate 1 is issued by the trust anchor;
     *
     * (c) certificate n is the certificate to be validated; and
     *
     * (d) for all x in {1, ..., n}, the certificate was valid at the
     * time in question.
     *
     * Note that here 'n' is index 0 in the chain and 1 is the last certificate
     * in the chain and it must be signed by a certificate in the connection's
     * CA store.
     *
     * The path validation process also determines the set of certificate
     * policies that are valid for this path, based on the certificate policies
     * extension, policy mapping extension, policy constraints extension, and
     * inhibit any-policy extension.
     *
     * Note: Policy mapping extension not supported (Not Required).
     *
     * Note: If the certificate has an unsupported critical extension, then it
     * must be rejected.
     *
     * Note: A certificate is self-issued if the DNs that appear in the subject
     * and issuer fields are identical and are not empty.
     *
     * The path validation algorithm assumes the following seven inputs are
     * provided to the path processing logic. What this specific implementation
     * will use is provided parenthetically:
     *
     * (a) a prospective certification path of length n (the 'chain')
     * (b) the current date/time: ('now').
     * (c) user-initial-policy-set: A set of certificate policy identifiers
     * naming the policies that are acceptable to the certificate user.
     * The user-initial-policy-set contains the special value any-policy
     * if the user is not concerned about certificate policy
     * (Not implemented. Any policy is accepted).
     * (d) trust anchor information, describing a CA that serves as a trust
     * anchor for the certification path. The trust anchor information
     * includes:
     *
     * (1)  the trusted issuer name,
     * (2)  the trusted public key algorithm,
     * (3)  the trusted public key, and
     * (4)  optionally, the trusted public key parameters associated
     * with the public key.
     *
     * (Trust anchors are provided via certificates in the CA store).
     *
     * The trust anchor information may be provided to the path processing
     * procedure in the form of a self-signed certificate. The trusted anchor
     * information is trusted because it was delivered to the path processing
     * procedure by some trustworthy out-of-band procedure. If the trusted
     * public key algorithm requires parameters, then the parameters are
     * provided along with the trusted public key (No parameters used in this
     * implementation).
     *
     * (e) initial-policy-mapping-inhibit, which indicates if policy mapping is
     * allowed in the certification path.
     * (Not implemented, no policy checking)
     *
     * (f) initial-explicit-policy, which indicates if the path must be valid
     * for at least one of the certificate policies in the user-initial-
     * policy-set.
     * (Not implemented, no policy checking)
     *
     * (g) initial-any-policy-inhibit, which indicates whether the
     * anyPolicy OID should be processed if it is included in a
     * certificate.
     * (Not implemented, so any policy is valid provided that it is
     */

    /**
     * Basic Path Processing:
     *
     * For each certificate in the 'chain', the following is checked:
     *
     * 1. The certificate validity period includes the current time.
     * 2. The certificate was signed by its parent (where the parent is either
     * the next in the chain or from the CA store). Allow processing to
     * continue to the next step if no parent is found but the certificate is
     * in the CA store.
     * 3. TODO: The certificate has not been revoked.
     * 4. The certificate issuer name matches the parent's subject name.
     * 5. TODO: If the certificate is self-issued and not the final certificate
     * in the chain, skip this step, otherwise verify that the subject name
     * is within one of the permitted subtrees of X.500 distinguished names
     * and that each of the alternative names in the subjectAltName extension
     * (critical or non-critical) is within one of the permitted subtrees for
     * that name type.
     * 6. TODO: If the certificate is self-issued and not the final certificate
     * in the chain, skip this step, otherwise verify that the subject name
     * is not within one of the excluded subtrees for X.500 distinguished
     * names and none of the subjectAltName extension names are excluded for
     * that name type.
     * 7. The other steps in the algorithm for basic path processing involve
     * handling the policy extension which is not presently supported in this
     * implementation. Instead, if a critical policy extension is found, the
     * certificate is rejected as not supported.
     * 8. If the certificate is not the first or if its the only certificate in
     * the chain (having no parent from the CA store or is self-signed) and it
     * has a critical key usage extension, verify that the keyCertSign bit is
     * set. If the key usage extension exists, verify that the basic
     * constraints extension exists. If the basic constraints extension exists,
     * verify that the cA flag is set. If pathLenConstraint is set, ensure that
     * the number of certificates that precede in the chain (come earlier
     * in the chain as implemented below), excluding the very first in the
     * chain (typically the end-entity one), isn't greater than the
     * pathLenConstraint. This constraint limits the number of intermediate
     * CAs that may appear below a CA before only end-entity certificates
     */

    // copy cert chain references to another array to protect against changes
    // in verify callback
    chain = chain.slice(0);
    const certs = chain.slice(0);

    // get current date
    const now = new Date();

    // verify each cert in the chain using its parent, where the parent
    // is either the next in the chain or from the CA store
    let first = true;
    let error = null;
    let depth = 0;
    do {
        const cert = chain.shift();
        let parent = null;
        let selfSigned = false;

        // 1. check valid time
        if (now < cert.validity.notBefore || now > cert.validity.notAfter) {
            error = {
                message: "Certificate is not valid yet or has expired.",
                error: pki.certificateError.certificate_expired,
                notBefore: cert.validity.notBefore,
                notAfter: cert.validity.notAfter,
                now
            };
        }

        // 2. verify with parent from chain or CA store
        if (is.null(error)) {
            parent = chain[0] || caStore.getIssuer(cert);
            if (is.null(parent)) {
                // check for self-signed cert
                if (cert.isIssuer(cert)) {
                    selfSigned = true;
                    parent = cert;
                }
            }

            if (parent) {
                // FIXME: current CA store implementation might have multiple
                // certificates where the issuer can't be determined from the
                // certificate (happens rarely with, eg: old certificates) so normalize
                // by always putting parents into an array
                // TODO: there's may be an extreme degenerate case currently uncovered
                // where an old intermediate certificate seems to have a matching parent
                // but none of the parents actually verify ... but the intermediate
                // is in the CA and it should pass this check; needs investigation
                let parents = parent;
                if (!forge.util.isArray(parents)) {
                    parents = [parents];
                }

                // try to verify with each possible parent (typically only one)
                let verified = false;
                while (!verified && parents.length > 0) {
                    parent = parents.shift();
                    try {
                        verified = parent.verify(cert);
                    } catch (ex) {
                        // failure to verify, don't care why, try next one
                    }
                }

                if (!verified) {
                    error = {
                        message: "Certificate signature is invalid.",
                        error: pki.certificateError.bad_certificate
                    };
                }
            }

            if (is.null(error) && (!parent || selfSigned) &&
          !caStore.hasCertificate(cert)) {
                // no parent issuer and certificate itself is not trusted
                error = {
                    message: "Certificate is not trusted.",
                    error: pki.certificateError.unknown_ca
                };
            }
        }

        // TODO: 3. check revoked

        // 4. check for matching issuer/subject
        if (is.null(error) && parent && !cert.isIssuer(parent)) {
        // parent is not issuer
            error = {
                message: "Certificate issuer is invalid.",
                error: pki.certificateError.bad_certificate
            };
        }

        // 5. TODO: check names with permitted names tree

        // 6. TODO: check names against excluded names tree

        // 7. check for unsupported critical extensions
        if (is.null(error)) {
        // supported extensions
            const se = {
                keyUsage: true,
                basicConstraints: true
            };
            for (let i = 0; is.null(error) && i < cert.extensions.length; ++i) {
                const ext = cert.extensions[i];
                if (ext.critical && !(ext.name in se)) {
                    error = {
                        message:
                "Certificate has an unsupported critical extension.",
                        error: pki.certificateError.unsupported_certificate
                    };
                }
            }
        }

        // 8. check for CA if cert is not first or is the only certificate
        // remaining in chain with no parent or is self-signed
        if (is.null(error) &&
        (!first || (chain.length === 0 && (!parent || selfSigned)))) {
        // first check keyUsage extension and then basic constraints
            const bcExt = cert.getExtension("basicConstraints");
            const keyUsageExt = cert.getExtension("keyUsage");
            if (!is.null(keyUsageExt)) {
                // keyCertSign must be true and there must be a basic
                // constraints extension
                if (!keyUsageExt.keyCertSign || is.null(bcExt)) {
                    // bad certificate
                    error = {
                        message:
                "Certificate keyUsage or basicConstraints conflict " +
                "or indicate that the certificate is not a CA. " +
                "If the certificate is the only one in the chain or " +
                "isn't the first then the certificate must be a " +
                "valid CA.",
                        error: pki.certificateError.bad_certificate
                    };
                }
            }
            // basic constraints cA flag must be set
            if (is.null(error) && !is.null(bcExt) && !bcExt.cA) {
                // bad certificate
                error = {
                    message:
              "Certificate basicConstraints indicates the certificate " +
              "is not a CA.",
                    error: pki.certificateError.bad_certificate
                };
            }
            // if error is not null and keyUsage is available, then we know it
            // has keyCertSign and there is a basic constraints extension too,
            // which means we can check pathLenConstraint (if it exists)
            if (is.null(error) && !is.null(keyUsageExt) &&
          "pathLenConstraint" in bcExt) {
                // pathLen is the maximum # of intermediate CA certs that can be
                // found between the current certificate and the end-entity (depth 0)
                // certificate; this number does not include the end-entity (depth 0,
                // last in the chain) even if it happens to be a CA certificate itself
                const pathLen = depth - 1;
                if (pathLen > bcExt.pathLenConstraint) {
                    // pathLenConstraint violated, bad certificate
                    error = {
                        message:
                "Certificate basicConstraints pathLenConstraint violated.",
                        error: pki.certificateError.bad_certificate
                    };
                }
            }
        }

        // call application callback
        const vfd = (is.null(error)) ? true : error.error;
        const ret = verify ? verify(vfd, depth, certs) : vfd;
        if (ret === true) {
        // clear any set error
            error = null;
        } else {
        // if passed basic tests, set default message and alert
            if (vfd === true) {
                error = {
                    message: "The application rejected the certificate.",
                    error: pki.certificateError.bad_certificate
                };
            }

            // check for custom error info
            if (ret || ret === 0) {
                // set custom message and error
                if (is.object(ret) && !is.array(ret)) {
                    if (ret.message) {
                        error.message = ret.message;
                    }
                    if (ret.error) {
                        error.error = ret.error;
                    }
                } else if (is.string(ret)) {
                    // set custom error
                    error.error = ret;
                }
            }

            // throw error
            throw error;
        }

        // no longer first cert in chain
        first = false;
        ++depth;
    } while (chain.length > 0);

    return true;
}

