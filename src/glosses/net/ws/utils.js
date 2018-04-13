const native = adone.nativeAddon(adone.std.path.join(__dirname, "native", "utils.node"));

/**
 * Merges an array of buffers into a new buffer.
 *
 * @param {Buffer[]} list The array of buffers to concat
 * @param {Number} totalLength The total length of buffers in the list
 * @return {Buffer} The resulting buffer
 * @public
 */
const concat = (list, totalLength) => {
    const target = Buffer.allocUnsafe(totalLength);
    let offset = 0;

    for (let i = 0; i < list.length; i++) {
        const buf = list[i];
        buf.copy(target, offset);
        offset += buf.length;
    }

    return target;
};

/**
 * Checks if a status code is allowed in a close frame.
 *
 * @param {Number} code The status code
 * @return {Boolean} `true` if the status code is valid, else `false`
 * @public
 */
const isValidStatusCode = (code) => {
    return (
        (code >= 1000 &&
            code <= 1013 &&
            code !== 1004 &&
            code !== 1005 &&
            code !== 1006) ||
        (code >= 3000 && code <= 4999)
    );
};

/**
 * Masks a buffer using the given mask.
 *
 * @param {Buffer} source The buffer to mask
 * @param {Buffer} mask The mask to use
 * @param {Buffer} output The buffer where to store the result
 * @param {Number} offset The offset at which to start writing
 * @param {Number} length The number of bytes to mask.
 * @public
 */
const _mask = function (source, mask, output, offset, length) {
    for (let i = 0; i < length; i++) {
        output[offset + i] = source[i] ^ mask[i & 3];
    }
};

/**
 * Unmasks a buffer using the given mask.
 *
 * @param {Buffer} buffer The buffer to unmask
 * @param {Buffer} mask The mask to use
 * @public
 */
const _unmask = function (buffer, mask) {
    // Required until https://github.com/nodejs/node/issues/9006 is resolved.
    const length = buffer.length;
    for (let i = 0; i < length; i++) {
        buffer[i] ^= mask[i & 3];
    }
};

export default {
    concat,
    isValidStatusCode,
    mask(source, mask, output, offset, length) {
        if (length < 48) {
            _mask(source, mask, output, offset, length);
        } else {
            native.mask(source, mask, output, offset, length);
        }
    },
    unmask(buffer, mask) {
        if (buffer.length < 32) {
            _unmask(buffer, mask);
        } else {
            native.unmask(buffer, mask);
        }
    },
    isValidUTF8: native.isValidUTF8
};
