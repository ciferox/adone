

const { std: { zlib } } = adone;

const deflate = {};

deflate.compress = (buf, options) => new Promise((resolve, reject) => {
    zlib.deflate(buf, options, (err, data) => {
        err ? reject(err) : resolve(data);
    });
});
deflate.compress.sync = (buf, options) => zlib.deflateSync(buf, options);
deflate.compress.stream = (options) => zlib.createDeflate(options);

deflate.decompress = (buf, options) => new Promise((resolve, reject) => {
    zlib.inflate(buf, options, (err, data) => {
        err ? reject(err) : resolve(data);
    });
});
deflate.decompress.sync = (buf, options) => zlib.inflateSync(buf, options);
deflate.decompress.stream = (options) => zlib.createInflate(options);

deflate.raw = {};

deflate.raw.compress = (buf, options) => new Promise((resolve, reject) => {
    zlib.deflateRaw(buf, options, (err, data) => {
        err ? reject(err) : resolve(data);
    });
});
deflate.raw.compress.sync = (buf, options) => zlib.deflateRawSync(buf, options);
deflate.raw.compress.stream = (options) => zlib.createDeflateRaw(options);

deflate.raw.decompress = (buf, options) => new Promise((resolve, reject) => {
    zlib.inflateRaw(buf, options, (err, data) => {
        err ? reject(err) : resolve(data);
    });
});
deflate.raw.decompress.sync = (buf, options) => zlib.inflateRawSync(buf, options);
deflate.raw.decompress.stream = (options) => zlib.createInflateRaw(options);

export default deflate;
