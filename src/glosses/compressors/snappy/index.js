const { is } = adone;
const native = adone.nativeAddon(adone.std.path.join(__dirname, "native", "snappy.node"));

adone.asNamespace(exports);

/**
 * Compress asyncronous.
 * If input isn't a string or buffer, automatically convert to buffer by using
 * JSON.stringify.
 */
export const compress = function (input) {
    if (!is.string(input) && !is.buffer(input)) {
        throw new Error("Input must be a String or a Buffer");
    }

    return new Promise((resolve, reject) => {
        native.compress(input, (err, result) => {
            if (err) {
                return reject(err);
            }
            resolve(result);
        });
    });
};

export const compressSync = function (input) {
    if (!is.string(input) && !is.buffer(input)) {
        throw new Error("input must be a String or a Buffer");
    }

    return native.compressSync(input);
};

/**
 * Asyncronous decide if a buffer is compressed in a correct way.
 */
export const isValidCompressed = (input) => {
    return new Promise((resolve, reject) => {
        native.isValidCompressed(input, (err, result) => {
            if (err) {
                return reject(err);
            }
            resolve(result);
        });
    });
};

export const isValidCompressedSync = native.isValidCompressedSync;

const uncompressOpts = (opts) => (opts && is.boolean(opts.asBuffer)) ? opts : { asBuffer: true };

/**
 * Asyncronous uncompress previously compressed data.
 * A parser can be attached. If no parser is attached, return buffer.
 */
export const decompress = function (compressed, opts) {
    if (!is.buffer(compressed)) {
        throw new Error("Input must be a Buffer");
    }

    return new Promise((resolve, reject) => {
        native.uncompress(compressed, uncompressOpts(opts), (err, result) => {
            if (err) {
                return reject(err);
            }
            resolve(result);
        });
    });
};

export const decompressSync = function (compressed, opts) {
    if (!is.buffer(compressed)) {
        throw new Error("Input must be a Buffer");
    }

    return native.uncompressSync(compressed, uncompressOpts(opts));
};
