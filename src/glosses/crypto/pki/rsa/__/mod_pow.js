const {
    math: { BigNumber }
} = adone;

const forge = require("node-forge");

/**
 * Performs x^c mod n (RSA encryption or decryption operation).
 *
 * @param x the number to raise and mod.
 * @param key the key to use.
 * @param pub true if the key is public, false if private.
 *
 * @return the result of x^c mod n.
 */
export default function modPow(x, key, pub) {
    if (pub) {
        return x.powm(key.e, key.n);
    }

    if (!key.p || !key.q) {
        // allow calculation without CRT params (slow)
        return x.powm(key.d, key.n);
    }

    // pre-compute dP, dQ, and qInv if necessary
    if (!key.dP) {
        key.dP = key.d.mod(key.p.sub(BigNumber.ONE));
    }
    if (!key.dQ) {
        key.dQ = key.d.mod(key.q.sub(BigNumber.ONE));
    }
    if (!key.qInv) {
        key.qInv = key.q.invertm(key.p);
    }

    /**
     * Chinese remainder theorem (CRT) states:
     *
     * Suppose n1, n2, ..., nk are positive integers which are pairwise
     * coprime (n1 and n2 have no common factors other than 1). For any
     * integers x1, x2, ..., xk there exists an integer x solving the
     * system of simultaneous congruences (where ~= means modularly
     * congruent so a ~= b mod n means a mod n = b mod n):
     *
     * x ~= x1 mod n1
     * x ~= x2 mod n2
     * ...
     * x ~= xk mod nk
     *
     * This system of congruences has a single simultaneous solution x
     * between 0 and n - 1. Furthermore, each xk solution and x itself
     * is congruent modulo the product n = n1*n2*...*nk.
     * So x1 mod n = x2 mod n = xk mod n = x mod n.
     *
     * The single simultaneous solution x can be solved with the following
     * equation:
     *
     * x = sum(xi*ri*si) mod n where ri = n/ni and si = ri^-1 mod ni.
     *
     * Where x is less than n, xi = x mod ni.
     *
     * For RSA we are only concerned with k = 2. The modulus n = pq, where
     * p and q are coprime. The RSA decryption algorithm is:
     *
     * y = x^d mod n
     *
     * Given the above:
     *
     * x1 = x^d mod p
     * r1 = n/p = q
     * s1 = q^-1 mod p
     * x2 = x^d mod q
     * r2 = n/q = p
     * s2 = p^-1 mod q
     *
     * So y = (x1r1s1 + x2r2s2) mod n
     * = ((x^d mod p)q(q^-1 mod p) + (x^d mod q)p(p^-1 mod q)) mod n
     *
     * According to Fermat's Little Theorem, if the modulus P is prime,
     * for any integer A not evenly divisible by P, A^(P-1) ~= 1 mod P.
     * Since A is not divisible by P it follows that if:
     * N ~= M mod (P - 1), then A^N mod P = A^M mod P. Therefore:
     *
     * A^N mod P = A^(M mod (P - 1)) mod P. (The latter takes less effort
     * to calculate). In order to calculate x^d mod p more quickly the
     * exponent d mod (p - 1) is stored in the RSA private key (the same
     * is done for x^d mod q). These values are referred to as dP and dQ
     * respectively. Therefore we now have:
     *
     * y = ((x^dP mod p)q(q^-1 mod p) + (x^dQ mod q)p(p^-1 mod q)) mod n
     *
     * Since we'll be reducing x^dP by modulo p (same for q) we can also
     * reduce x by p (and q respectively) before hand. Therefore, let
     *
     * xp = ((x mod p)^dP mod p), and
     * xq = ((x mod q)^dQ mod q), yielding:
     *
     * y = (xp*q*(q^-1 mod p) + xq*p*(p^-1 mod q)) mod n
     *
     * This can be further reduced to a simple algorithm that only
     * requires 1 inverse (the q inverse is used) to be used and stored.
     * The algorithm is called Garner's algorithm. If qInv is the
     * inverse of q, we simply calculate:
     *
     * y = (qInv*(xp - xq) mod p) * q + xq
     *
     * However, there are two further complications. First, we need to
     * ensure that xp > xq to prevent signed BigIntegers from being used
     * so we add p until this is true (since we will be mod'ing with
     * p anyway). Then, there is a known timing attack on algorithms
     * using the CRT. To mitigate this risk, "cryptographic blinding"
     * should be used. This requires simply generating a random number r
     * between 0 and n-1 and its inverse and multiplying x by r^e before
     * calculating y and then multiplying y by r^-1 afterwards. Note that
     * r must be coprime with n (gcd(r, n) === 1) in order to have an
     * inverse.
     */

    // cryptographic blinding
    let r;
    do {
        r = BigNumber.fromBuffer(Buffer.from(forge.random.getBytes(key.n.bitLength() / 8), "binary"));
    } while (r.cmp(key.n) >= 0 || !r.gcd(key.n).eq(BigNumber.ONE));
    x = x.mul(r.powm(key.e, key.n)).mod(key.n);

    // calculate xp and xq
    let xp = x.mod(key.p).powm(key.dP, key.p);
    const xq = x.mod(key.q).powm(key.dQ, key.q);

    // xp must be larger than xq to avoid signed bit usage
    while (xp.cmp(xq) < 0) {
        xp = xp.add(key.p);
    }

    // do last step
    let y = xp.sub(xq)
        .mul(key.qInv).mod(key.p)
        .mul(key.q).add(xq);

    // remove effect of random for cryptographic blinding
    y = y.mul(r.invertm(key.n)).mod(key.n);

    return y;
}
