const { is } = adone;
const native = adone.nativeAddon(adone.std.path.join(__dirname, "native", "snappy.node"));

adone.asNamespace(exports);

export const compress = (input) => {
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

export const compressSync = (input) => {
    if (!is.string(input) && !is.buffer(input)) {
        throw new Error("Input must be a String or a Buffer");
    }

    return native.compressSync(input);
};

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

export const decompress = (compressed, { asBuffer = true } = {}) => {
    if (!is.buffer(compressed)) {
        throw new Error("Input must be a Buffer");
    }

    return new Promise((resolve, reject) => {
        native.uncompress(compressed, { asBuffer }, (err, result) => {
            if (err) {
                return reject(err);
            }
            resolve(result);
        });
    });
};

export const decompressSync = (compressed, { asBuffer = true } = {}) => {
    if (!is.buffer(compressed)) {
        throw new Error("Input must be a Buffer");
    }

    return native.uncompressSync(compressed, { asBuffer });
};
