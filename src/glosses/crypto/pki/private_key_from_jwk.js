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
 * Creates a private key from JSON Web Key format
 */
export default function privateKeyFromJwk(key) {
    return pki.rsa.setPrivateKey(
        base64ToBn(key.n),
        base64ToBn(key.e),
        base64ToBn(key.d),
        base64ToBn(key.p),
        base64ToBn(key.q),
        base64ToBn(key.dp),
        base64ToBn(key.dq),
        base64ToBn(key.qi)
    );
}
