

const { std: { zlib } } = adone;

const gzip = {};

gzip.compress = (buf, options) => new Promise((resolve, reject) => {
    zlib.gzip(buf, options, (err, data) => {
        err ? reject(err) : resolve(data);
    });
});
gzip.compress.sync = (buf, options) => zlib.gzipSync(buf, options);
gzip.compress.stream = (options) => zlib.createGzip(options);

gzip.decompress = (buf, options) => new Promise((resolve, reject) => {
    zlib.gunzip(buf, options, (err, data) => {
        err ? reject(err) : resolve(data);
    });
});
gzip.decompress.sync = (buf, options) => zlib.gunzipSync(buf, options);
gzip.decompress.stream = (options) => zlib.createGunzip(options);

export default gzip;
