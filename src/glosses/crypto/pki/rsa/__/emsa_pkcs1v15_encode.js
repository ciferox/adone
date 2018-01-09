const {
    crypto: {
        pki,
        asn1
    }
} = adone;

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


    const digestInfo = new asn1.Sequence({
        value: [
            new asn1.Sequence({
                value: [
                    new asn1.ObjectIdentifier({
                        value: oid
                    }),
                    new asn1.Null()
                ]
            }),
            new asn1.OctetString({
                valueHex: adone.util.buffer.toArrayBuffer(md.digest())
            })
        ]
    });

    return Buffer.from(digestInfo.toBER());
}
