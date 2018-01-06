const {
    is,
    crypto,
    math: { BigNumber }
} = adone;

const forge = require("node-forge");

/**
 * Runs the key-generation algorithm asynchronously, either in the background
 * via Web Workers, or using the main thread and setImmediate.
 *
 * @param state the key-pair generation state.
 * @param [options] options for key-pair generation:
 *          workerScript the worker script URL.
 *          workers the number of web workers (if supported) to use,
 *            (default: 2, -1 to use estimated cores minus one).
 *          workLoad the size of the work load, ie: number of possible prime
 *            numbers for each web worker to check per work assignment,
 *            (default: 100).
 * @param callback(err, keypair) called once the operation completes.
 */
const _generateKeyPair = (state, options, callback) => {
    const generate = () => {
        // find p and then q (done in series to simplify)
        getPrime(state.pBits, (err, num) => {
            if (err) {
                return callback(err);
            }
            state.p = num;
            if (!is.null(state.q)) {
                return finish(err, state.q);
            }
            getPrime(state.qBits, finish);
        });
    };

    const getPrime = (bits, callback) => {
        const prime = BigNumber.prime(bits);
        callback(null, prime);
    };

    const finish = (err, num) => {
        if (err) {
            return callback(err);
        }

        // set q
        state.q = num;

        // ensure p is larger than q (swap them if not)
        if (state.p.cmp(state.q) < 0) {
            const tmp = state.p;
            state.p = state.q;
            state.q = tmp;
        }

        // ensure p is coprime with e
        if (state.p.sub(BigNumber.ONE).gcd(state.e).cmp(BigNumber.ONE) !== 0) {
            state.p = null;
            generate();
            return;
        }

        // ensure q is coprime with e
        if (state.q.sub(BigNumber.ONE).gcd(state.e).cmp(BigNumber.ONE) !== 0) {
            state.q = null;
            getPrime(state.qBits, finish);
            return;
        }

        // compute phi: (p - 1)(q - 1) (Euler's totient function)
        state.p1 = state.p.sub(BigNumber.ONE);
        state.q1 = state.q.sub(BigNumber.ONE);
        state.phi = state.p1.mul(state.q1);

        // ensure e and phi are coprime
        if (state.phi.gcd(state.e).cmp(BigNumber.ONE) !== 0) {
            // phi and e aren't coprime, so generate a new p and q
            state.p = state.q = null;
            generate();
            return;
        }

        // create n, ensure n is has the right number of bits
        state.n = state.p.mul(state.q);
        if (state.n.bitLength() !== state.bits) {
            // failed, get new q
            state.q = null;
            getPrime(state.qBits, finish);
            return;
        }

        // set keys
        const d = state.e.invertm(state.phi);
        state.keys = {
            privateKey: crypto.pki.rsa.setPrivateKey(
                state.n,
                state.e,
                d,
                state.p,
                state.q,
                d.mod(state.p1),
                d.mod(state.q1),
                state.q.invertm(state.p)
            ),
            publicKey: crypto.pki.rsa.setPublicKey(state.n, state.e)
        };

        callback(null, state.keys);
    };

    if (is.function(options)) {
        callback = options;
        options = {};
    }
    options = options || {};

    generate();
};


export default function generateKeyPair(bits, e, options, callback) {
    // (bits), (options), (callback)
    if (arguments.length === 1) {
        if (typeof bits === "object") {
            options = bits;
            bits = undefined;
        } else if (is.function(bits)) {
            callback = bits;
            bits = undefined;
        }
    } else if (arguments.length === 2) {
        // (bits, e), (bits, options), (bits, callback), (options, callback)
        if (is.number(bits)) {
            if (is.function(e)) {
                callback = e;
                e = undefined;
            } else if (!is.number(e)) {
                options = e;
                e = undefined;
            }
        } else {
            options = bits;
            callback = e;
            bits = undefined;
            e = undefined;
        }
    } else if (arguments.length === 3) {
        // (bits, e, options), (bits, e, callback), (bits, options, callback)
        if (is.number(e)) {
            if (is.function(options)) {
                callback = options;
                options = undefined;
            }
        } else {
            callback = options;
            options = e;
            e = undefined;
        }
    }
    options = options || {};
    if (is.undefined(bits)) {
        bits = options.bits || 2048;
    }
    if (is.undefined(e)) {
        e = options.e || 0x10001;
    }

    // use JavaScript implementation
    const state = crypto.pki.rsa.createKeyPairGenerationState(bits, e, options);
    if (!callback) {
        crypto.pki.rsa.stepKeyPairGenerationState(state, 0);
        return state.keys;
    }
    _generateKeyPair(state, options, callback);
}
