/**
 * Javascript implementation of mask generation function MGF1.
 *
 * @author Stefan Siegl
 * @author Dave Longley
 *
 * Copyright (c) 2012 Stefan Siegl <stesie@brokenpipe.de>
 * Copyright (c) 2014 Digital Bazaar, Inc.
 */

const {
    crypto
} = adone;

/**
 * Creates a MGF1 mask generation function object.
 *
 * @param md the message digest API to use (eg: crypto.md.sha1.create()).
 *
 * @return a mask generation function object.
 */
export const create = function (md) {
    const mgf = {
        /**
         * Generate mask of specified length.
         *
         * @param {String} seed The seed for mask generation.
         * @param maskLen Number of bytes to generate.
         * @return {String} The generated mask.
         */
        generate(seed, maskLen) {
            /**
             * 2. Let T be the empty octet string.
             */
            const t = new crypto.util.ByteBuffer();

            /**
             * 3. For counter from 0 to ceil(maskLen / hLen), do the following:
             */
            const len = Math.ceil(maskLen / md.digestLength);
            for (let i = 0; i < len; i++) {
                /**
                 * a. Convert counter to an octet string C of length 4 octets
                 */
                const c = new crypto.util.ByteBuffer();
                c.putInt32(i);

                /**
                 * b. Concatenate the hash of the seed mgfSeed and C to the octet
                 */
                md.start();
                md.update(seed + c.getBytes());
                t.putBuffer(md.digest());
            }

            /**
             * Output the leading maskLen octets of T as the octet string mask.
             */
            t.truncate(t.length() - maskLen);
            return t.getBytes();
        }
    };

    return mgf;
};
