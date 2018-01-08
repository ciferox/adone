const {
    math: {
        BigNumber
    },
    crypto: {
        pki
    }
} = adone;

const base64ToBn = (base64data) => BigNumber.fromBuffer(Buffer.from(base64data, "base64"));

/**
 * Creates a public key from JSON Web Key format
 */
export default function privateKeyFromJwk(key) {
    return pki.rsa.setPublicKey(
        base64ToBn(key.n),
        base64ToBn(key.e)
    );
}
