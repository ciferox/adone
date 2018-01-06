const {
    crypto: { pki }
} = adone;

const __ = adone.private(pki);

export default function prfOidToMessageDigest(prfOid) {
    // get PRF algorithm, default to SHA-1
    let prfAlgorithm;
    if (!prfOid) {
        prfAlgorithm = "hmacWithSHA1";
    } else {
        prfAlgorithm = pki.oids[prfOid];
        if (!prfAlgorithm) {
            const error = new Error("Unsupported PRF OID.");
            error.oid = prfOid;
            error.supported = [
                "hmacWithSHA1",
                "hmacWithSHA224",
                "hmacWithSHA256",
                "hmacWithSHA384",
                "hmacWithSHA512"
            ];
            throw error;
        }
    }
    return __.prfAlgorithmToMessageDigest(prfAlgorithm);
}
