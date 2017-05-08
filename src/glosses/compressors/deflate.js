const { std: { zlib } } = adone;

export const compress = (buf, options) => new Promise((resolve, reject) => {
    zlib.deflate(buf, options, (err, data) => {
        err ? reject(err) : resolve(data);
    });
});
compress.sync = (buf, options) => zlib.deflateSync(buf, options);
compress.stream = (options) => zlib.createDeflate(options);

export const decompress = (buf, options) => new Promise((resolve, reject) => {
    zlib.inflate(buf, options, (err, data) => {
        err ? reject(err) : resolve(data);
    });
});
decompress.sync = (buf, options) => zlib.inflateSync(buf, options);
decompress.stream = (options) => zlib.createInflate(options);

export const raw = {};

raw.compress = (buf, options) => new Promise((resolve, reject) => {
    zlib.deflateRaw(buf, options, (err, data) => {
        err ? reject(err) : resolve(data);
    });
});
raw.compress.sync = (buf, options) => zlib.deflateRawSync(buf, options);
raw.compress.stream = (options) => zlib.createDeflateRaw(options);

raw.decompress = (buf, options) => new Promise((resolve, reject) => {
    zlib.inflateRaw(buf, options, (err, data) => {
        err ? reject(err) : resolve(data);
    });
});
raw.decompress.sync = (buf, options) => zlib.inflateRawSync(buf, options);
raw.decompress.stream = (options) => zlib.createInflateRaw(options);
