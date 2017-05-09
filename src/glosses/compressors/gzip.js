const { std: { zlib } } = adone;

export const compress = (buf, options) => new Promise((resolve, reject) => {
    zlib.gzip(buf, options, (err, data) => {
        err ? reject(err) : resolve(data);
    });
});

export const compressSync = (buf, options) => zlib.gzipSync(buf, options);
export const compressStream = (options) => zlib.createGzip(options);

export const decompress = (buf, options) => new Promise((resolve, reject) => {
    zlib.gunzip(buf, options, (err, data) => {
        err ? reject(err) : resolve(data);
    });
});

export const decompressSync = (buf, options) => zlib.gunzipSync(buf, options);
export const decompressStream = (options) => zlib.createGunzip(options);
