const {
    is,
    x,
    crypto,
    std
} = adone;

/**
 * Javascript implementation of mask generation function MGF1.
 */

/**
 * Creates a MGF1 mask generation function object.
 *
 * @param {string} md algorithm name
 *
 * @return a mask generation function object.
 */
export const create = function (md) {
    const hMeta = crypto.hash.meta(md);

    if (is.null(hMeta)) {
        throw new x.NotSupported(`"${md}" hash algorithm is not supported`);
    }

    const hash = (a, b) => {
        const h = std.crypto.createHash(md);
        h.update(a).update(b);
        return h.digest();
    };

    const digestLength = hMeta.digestLength;

    const mgf = {
        /**
         * Generate mask of specified length.
         *
         * @param {Buffer} seed The seed for mask generation.
         * @param maskLen Number of bytes to generate.
         * @return {Buffer} The generated mask.
         */
        generate(seed, maskLen) {
            /**
             * 2. Let T be the empty octet string.
             */
            const tParts = [];

            /**
             * 3. For counter from 0 to ceil(maskLen / hLen), do the following:
             */
            const len = Math.ceil(maskLen / digestLength);
            for (let i = 0; i < len; i++) {
                /**
                 * a. Convert counter to an octet string C of length 4 octets
                 */
                const counter = Buffer.allocUnsafe(4);
                counter.writeUInt32BE(i);

                /**
                 * b. Concatenate the hash of the seed mgfSeed and C to the octet
                 */
                const h = hash(seed, counter);
                tParts.push(h);
            }
            const T = Buffer.concat(tParts);

            /**
             * Output the leading maskLen octets of T as the octet string mask.
             */
            return T.slice(0, maskLen);
        }
    };

    return mgf;
};
