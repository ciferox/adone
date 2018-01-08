const bnToBase64 = (bn) => bn.toBuffer().toString("base64");

/**
 * Converst rsa private key to JSON Web Key Format
 * Supports only RSA
 */
export default function privateKeyToJwk(key) {
    return {
        kty: "RSA",
        n: bnToBase64(key.n),
        e: bnToBase64(key.e),
        d: bnToBase64(key.d),
        p: bnToBase64(key.p),
        q: bnToBase64(key.q),
        dp: bnToBase64(key.dP),
        dq: bnToBase64(key.dQ),
        qi: bnToBase64(key.qInv)
    };
}
