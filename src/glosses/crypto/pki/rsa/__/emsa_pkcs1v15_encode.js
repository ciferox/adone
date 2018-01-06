const {
    crypto: { pki }
} = adone;

const forge = require("node-forge");
const asn1 = forge.asn1;


/**
 * Wrap digest in DigestInfo object.
 *
 * This function implements EMSA-PKCS1-v1_5-ENCODE as per RFC 3447.
 *
 * DigestInfo ::= SEQUENCE {
 *   digestAlgorithm DigestAlgorithmIdentifier,
 *   digest Digest
 * }
 *
 * DigestAlgorithmIdentifier ::= AlgorithmIdentifier
 * Digest ::= OCTET STRING
 *
 * @param md the message digest object with the hash to sign.
 *
 * @return the encoded message (ready for RSA encrytion)
 */
export default function emsaPKCS1v15encode(md) {
    // get the oid for the algorithm
    let oid;
    if (md.algorithm in pki.oids) {
        oid = pki.oids[md.algorithm];
    } else {
        const error = new Error("Unknown message digest algorithm.");
        error.algorithm = md.algorithm;
        throw error;
    }
    const oidBytes = asn1.oidToDer(oid).getBytes();

    // create the digest info
    const digestInfo = asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, []);
    const digestAlgorithm = asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, []);
    digestAlgorithm.value.push(asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OID, false, oidBytes));
    digestAlgorithm.value.push(asn1.create( asn1.Class.UNIVERSAL, asn1.Type.NULL, false, ""));
    const digest = asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OCTETSTRING, false, md.digest().getBytes());
    digestInfo.value.push(digestAlgorithm);
    digestInfo.value.push(digest);

    // encode digest info
    return asn1.toDer(digestInfo).getBytes();
}
