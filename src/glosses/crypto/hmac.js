/**
 * Hash-based Message Authentication Code implementation. Requires a message
 * digest object that can be obtained, for example, from crypto.md.sha1 or
 * crypto.md.md5.
 *
 * @author Dave Longley
 *
 * Copyright (c) 2010-2012 Digital Bazaar, Inc. All rights reserved.
 */

const {
    is,
    crypto
} = adone;

/**
 * Creates an HMAC object that uses the given message digest object.
 *
 * @return an HMAC object.
 */
export const create = function () {
    // the hmac key to use
    let _key = null;

    // the message digest to use
    let _md = null;

    // the inner padding
    let _ipadding = null;

    // the outer padding
    let _opadding = null;

    // hmac context
    const ctx = {};

    /**
     * Starts or restarts the HMAC with the given key and message digest.
     *
     * @param md the message digest to use, null to reuse the previous one,
     *           a string to use builtin 'sha1', 'md5', 'sha256'.
     * @param key the key to use as a string, array of bytes, byte buffer,
     *           or null to reuse the previous key.
     */
    ctx.start = function (md, key) {
        if (!is.null(md)) {
            if (is.string(md)) {
                // create builtin message digest
                md = md.toLowerCase();
                if (md in crypto.md.algorithms) {
                    _md = crypto.md.algorithms[md].create();
                } else {
                    throw new Error(`Unknown hash algorithm "${md}"`);
                }
            } else {
                // store message digest
                _md = md;
            }
        }

        if (is.null(key)) {
            // reuse previous key
            key = _key;
        } else {
            if (is.string(key)) {
                // convert string into byte buffer
                key = crypto.util.createBuffer(key);
            } else if (crypto.util.isArray(key)) {
                // convert byte array into byte buffer
                var tmp = key;
                key = crypto.util.createBuffer();
                for (var i = 0; i < tmp.length; ++i) {
                    key.putByte(tmp[i]);
                }
            }

            // if key is longer than blocksize, hash it
            let keylen = key.length();
            if (keylen > _md.blockLength) {
                _md.start();
                _md.update(key.bytes());
                key = _md.digest();
            }

            // mix key into inner and outer padding
            // ipadding = [0x36 * blocksize] ^ key
            // opadding = [0x5C * blocksize] ^ key
            _ipadding = crypto.util.createBuffer();
            _opadding = crypto.util.createBuffer();
            keylen = key.length();
            for (var i = 0; i < keylen; ++i) {
                var tmp = key.at(i);
                _ipadding.putByte(0x36 ^ tmp);
                _opadding.putByte(0x5C ^ tmp);
            }

            // if key is shorter than blocksize, add additional padding
            if (keylen < _md.blockLength) {
                var tmp = _md.blockLength - keylen;
                for (var i = 0; i < tmp; ++i) {
                    _ipadding.putByte(0x36);
                    _opadding.putByte(0x5C);
                }
            }
            _key = key;
            _ipadding = _ipadding.bytes();
            _opadding = _opadding.bytes();
        }

        // digest is done like so: hash(opadding | hash(ipadding | message))

        // prepare to do inner hash
        // hash(ipadding | message)
        _md.start();
        _md.update(_ipadding);
    };

    /**
     * Updates the HMAC with the given message bytes.
     *
     * @param bytes the bytes to update with.
     */
    ctx.update = function (bytes) {
        _md.update(bytes);
    };

    /**
     * Produces the Message Authentication Code (MAC).
     *
     * @return a byte buffer containing the digest value.
     */
    ctx.getMac = function () {
    // digest is done like so: hash(opadding | hash(ipadding | message))
    // here we do the outer hashing
        const inner = _md.digest().bytes();
        _md.start();
        _md.update(_opadding);
        _md.update(inner);
        return _md.digest();
    };
    // alias for getMac
    ctx.digest = ctx.getMac;

    return ctx;
};
