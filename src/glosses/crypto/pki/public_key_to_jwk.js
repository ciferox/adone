const bnToBase64 = (bn) => bn.toBuffer().toString("base64");

/**
 * Converst rsa public key to JSON Web Key Format
 * Supports only RSA
 */
export default function privateKeyToJwk(key) {
    return {
        kty: "RSA",
        n: bnToBase64(key.n),
        e: bnToBase64(key.e)
    };
}
