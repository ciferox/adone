const {
    is,
    crypto,
    math: { BigNumber }
} = adone;

/**
 * Creates an RSA key-pair generation state object. It is used to allow
 * key-generation to be performed in steps. It also allows for a UI to
 * display progress updates.
 *
 * @param bits the size for the private key in bits, defaults to 2048.
 * @param e the public exponent to use, defaults to 65537 (0x10001).
 * @param [options] the options to use.
 *          prng a custom crypto-secure pseudo-random number generator to use,
 *            that must define "getBytesSync".
 *          algorithm the algorithm to use (default: 'PRIMEINC').
 *
 * @return the state object to use to generate the key-pair.
 */
export default function createKeyPairGenerationState(bits, e, options) {
    // TODO: migrate step-based prime generation code to forge.prime

    // set default bits
    if (is.string(bits)) {
        bits = parseInt(bits, 10);
    }
    bits = bits || 2048;

    // create prng with api that matches BigInteger secure random
    options = options || {};
    const prng = options.prng || crypto.random;
    const rng = {
        // x is an array to fill with bytes
        nextBytes(x) {
            const b = prng.getBytesSync(x.length);
            for (let i = 0; i < x.length; ++i) {
                x[i] = b.charCodeAt(i);
            }
        }
    };

    const algorithm = options.algorithm || "PRIMEINC";

    // create PRIMEINC algorithm state
    let rval;
    if (algorithm === "PRIMEINC") {
        e = e || 65537;
        rval = {
            algorithm,
            state: 0,
            bits,
            rng,
            eInt: e,
            e: new BigNumber(e),
            p: null,
            q: null,
            qBits: bits >> 1,
            pBits: bits - (bits >> 1),
            pqState: 0,
            num: null,
            keys: null
        };
    } else {
        throw new Error(`Invalid key generation algorithm: ${algorithm}`);
    }

    return rval;
}
