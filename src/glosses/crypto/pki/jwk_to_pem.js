const {
    crypto: {
        pki
    }
} = adone;

/**
 * Converts the given jwk public or private rsa key to pem format
 */
export default function jwkToPem(jwk, opts) {
    const isPrivate = Boolean(jwk.d);

    if (isPrivate) {
        const key = pki.privateKeyFromJwk(jwk);
        return pki.privateKeyToPem(key, opts);
    }

    const key = pki.publicKeyFromJwk(jwk);
    return pki.publicKeyToPem(key, opts);
}
