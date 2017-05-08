const { std: { zlib } } = adone;

export const compress = (buf, options) => new Promise((resolve, reject) => {
    zlib.gzip(buf, options, (err, data) => {
        err ? reject(err) : resolve(data);
    });
});

compress.sync = (buf, options) => zlib.gzipSync(buf, options);
compress.stream = (options) => zlib.createGzip(options);

export const decompress = (buf, options) => new Promise((resolve, reject) => {
    zlib.gunzip(buf, options, (err, data) => {
        err ? reject(err) : resolve(data);
    });
});

decompress.sync = (buf, options) => zlib.gunzipSync(buf, options);
decompress.stream = (options) => zlib.createGunzip(options);
