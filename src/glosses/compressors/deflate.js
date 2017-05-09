const { std: { zlib } } = adone;

export const compress = (buf, options) => new Promise((resolve, reject) => {
    zlib.deflate(buf, options, (err, data) => {
        err ? reject(err) : resolve(data);
    });
});
export const compressSync = (buf, options) => zlib.deflateSync(buf, options);
export const compressStream = (options) => zlib.createDeflate(options);

export const decompress = (buf, options) => new Promise((resolve, reject) => {
    zlib.inflate(buf, options, (err, data) => {
        err ? reject(err) : resolve(data);
    });
});
export const decompressSync = (buf, options) => zlib.inflateSync(buf, options);
export const decompressStream = (options) => zlib.createInflate(options);

export const rawCompress = (buf, options) => new Promise((resolve, reject) => {
    zlib.deflateRaw(buf, options, (err, data) => {
        err ? reject(err) : resolve(data);
    });
});
export const rawCompressSync = (buf, options) => zlib.deflateRawSync(buf, options);
export const rawCompressStream = (options) => zlib.createDeflateRaw(options);

export const rawDecompress = (buf, options) => new Promise((resolve, reject) => {
    zlib.inflateRaw(buf, options, (err, data) => {
        err ? reject(err) : resolve(data);
    });
});
export const rawDecompressSync = (buf, options) => zlib.inflateRawSync(buf, options);
export const rawDecompressStream = (options) => zlib.createInflateRaw(options);
