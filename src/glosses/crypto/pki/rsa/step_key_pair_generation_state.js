const {
    is,
    crypto: { pki },
    math: { BigNumber }
} = adone;

const forge = require("node-forge");

/**
 * Returns the required number of Miller-Rabin tests to generate a
 * prime with an error probability of (1/2)^80.
 *
 * See Handbook of Applied Cryptography Chapter 4, Table 4.4.
 *
 * @param bits the bit size.
 *
 * @return the required number of iterations.
 */
const _getMillerRabinTests = (bits) => {
    if (bits <= 100) {
        return 27;
    }
    if (bits <= 150) {
        return 18;
    }
    if (bits <= 200) {
        return 15;
    }
    if (bits <= 250) {
        return 12;
    }
    if (bits <= 300) {
        return 9;
    }
    if (bits <= 350) {
        return 8;
    }
    if (bits <= 400) {
        return 7;
    }
    if (bits <= 500) {
        return 6;
    }
    if (bits <= 600) {
        return 5;
    }
    if (bits <= 800) {
        return 4;
    }
    if (bits <= 1250) {
        return 3;
    }
    return 2;
};

// for finding primes, which are 30k+i for i = 1, 7, 11, 13, 17, 19, 23, 29
const GCD_30_DELTA = [6, 4, 2, 4, 2, 4, 6, 2];

/**
 * Attempts to runs the key-generation algorithm for at most n seconds
 * (approximately) using the given state. When key-generation has completed,
 * the keys will be stored in state.keys.
 *
 * To use this function to update a UI while generating a key or to prevent
 * causing browser lockups/warnings, set "n" to a value other than 0. A
 * simple pattern for generating a key and showing a progress indicator is:
 *
 * var state = pki.rsa.createKeyPairGenerationState(2048);
 * var step = function() {
 *   // step key-generation, run algorithm for 100 ms, repeat
 *   if(!forge.pki.rsa.stepKeyPairGenerationState(state, 100)) {
 *     setTimeout(step, 1);
 *   } else {
 *     // key-generation complete
 *     // TODO: turn off progress indicator here
 *     // TODO: use the generated key-pair in "state.keys"
 *   }
 * };
 * // TODO: turn on progress indicator here
 * setTimeout(step, 0);
 *
 * @param state the state to use.
 * @param n the maximum number of milliseconds to run the algorithm for, 0
 *          to run the algorithm to completion.
 *
 * @return true if the key-generation completed, false if not.
 */
export default function stepKeyPairGenerationState(state, n) {
    // set default algorithm if not set
    if (!("algorithm" in state)) {
        state.algorithm = "PRIMEINC";
    }

    // TODO: migrate step-based prime generation code to forge.prime
    // TODO: abstract as PRIMEINC algorithm

    // do key generation (based on Tom Wu's rsa.js, see jsbn.js license)
    // with some minor optimizations and designed to run in steps

    // local state vars
    const THIRTY = new BigNumber(30);
    let deltaIdx = 0;

    // keep stepping until time limit is reached or done
    let t1 = Number(new Date());
    let t2;
    let total = 0;
    while (is.null(state.keys) && (n <= 0 || total < n)) {
        // generate p or q
        if (state.state === 0) {
            /**
             * Note: All primes are of the form:
             *
             * 30k+i, for i < 30 and gcd(30, i)=1, where there are 8 values for i
             *
             * When we generate a random number, we always align it at 30k + 1. Each
             * time the number is determined not to be prime we add to get to the
             */
            const bits = (is.null(state.p)) ? state.pBits : state.qBits;
            const bits1 = bits - 1;

            // get a random number
            if (state.pqState === 0) {
                // state.num = new BigInteger(bits, state.rng);
                state.num = BigNumber.fromBuffer(adone.crypto.random.getBytesSync(bits / 8));
                // force MSB set
                if (!state.num.isBitSet(bits1)) {
                    state.num = state.num.or(BigNumber.ONE.shiftLeft(bits1));
                }
                // align number on 30k+1 boundary
                state.num = state.num.add(31 - state.num.mod(THIRTY).byteValue());
                deltaIdx = 0;

                ++state.pqState;
            } else if (state.pqState === 1) {
                // try to make the number a prime
                if (state.num.bitLength() > bits) {
                    // overflow, try again
                    state.pqState = 0;
                    // do primality test
                } else if (state.num.probPrime(_getMillerRabinTests(state.num.bitLength()))) {
                    ++state.pqState;
                } else {
                    // get next potential prime
                    state.num = state.num.add(GCD_30_DELTA[deltaIdx++ % 8]);
                    // state.num.dAddOffset(GCD_30_DELTA[deltaIdx++ % 8], 0);
                }
            } else if (state.pqState === 2) {
                // ensure number is coprime with e
                state.pqState = (state.num.sub(BigNumber.ONE).gcd(state.e).cmp(BigNumber.ONE) === 0) ? 3 : 0;
            } else if (state.pqState === 3) {
                // store p or q
                state.pqState = 0;
                if (is.null(state.p)) {
                    state.p = state.num;
                } else {
                    state.q = state.num;
                }

                // advance state if both p and q are ready
                if (!is.null(state.p) && !is.null(state.q)) {
                    ++state.state;
                }
                state.num = null;
            }
        } else if (state.state === 1) {
            // ensure p is larger than q (swap them if not)
            if (state.p.cmp(state.q) < 0) {
                state.num = state.p;
                state.p = state.q;
                state.q = state.num;
            }
            ++state.state;
        } else if (state.state === 2) {
            // compute phi: (p - 1)(q - 1) (Euler's totient function)
            state.p1 = state.p.sub(BigNumber.ONE);
            state.q1 = state.q.sub(BigNumber.ONE);
            state.phi = state.p1.mul(state.q1);
            ++state.state;
        } else if (state.state === 3) {
            // ensure e and phi are coprime
            if (state.phi.gcd(state.e).cmp(BigNumber.ONE) === 0) {
                // phi and e are coprime, advance
                ++state.state;
            } else {
                // phi and e aren't coprime, so generate a new p and q
                state.p = null;
                state.q = null;
                state.state = 0;
            }
        } else if (state.state === 4) {
            // create n, ensure n is has the right number of bits
            state.n = state.p.mul(state.q);

            // ensure n is right number of bits
            if (state.n.bitLength() === state.bits) {
                // success, advance
                ++state.state;
            } else {
                // failed, get new q
                state.q = null;
                state.state = 0;
            }
        } else if (state.state === 5) {
            // set keys
            const d = state.e.invertm(state.phi);
            state.keys = {
                privateKey: pki.rsa.setPrivateKey(
                    state.n,
                    state.e,
                    d,
                    state.p,
                    state.q,
                    d.mod(state.p1),
                    d.mod(state.q1),
                    state.q.invertm(state.p)
                ),
                publicKey: pki.rsa.setPublicKey(state.n, state.e)
            };
        }

        // update timing
        t2 = Number(new Date());
        total += t2 - t1;
        t1 = t2;
    }

    return !is.null(state.keys);
}
