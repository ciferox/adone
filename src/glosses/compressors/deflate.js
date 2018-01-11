const { std: { zlib } } = adone;

adone.asNamespace(exports);

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

export const Z_NO_FLUSH = zlib.constants.Z_NO_FLUSH;
export const Z_PARTIAL_FLUSH = zlib.constants.Z_PARTIAL_FLUSH;
export const Z_SYNC_FLUSH = zlib.constants.Z_SYNC_FLUSH;
export const Z_FULL_FLUSH = zlib.constants.Z_FULL_FLUSH;
export const Z_FINISH = zlib.constants.Z_FINISH;
export const Z_BLOCK = zlib.constants.Z_BLOCK;
export const Z_TREES = zlib.constants.Z_TREES;

export const Z_OK = zlib.constants.Z_OK;
export const Z_STREAM_END = zlib.constants.Z_STREAM_END;
export const Z_NEED_DICT = zlib.constants.Z_NEED_DICT;
export const Z_ERRNO = zlib.constants.Z_ERRNO;
export const Z_STREAM_ERROR = zlib.constants.Z_STREAM_ERROR;
export const Z_DATA_ERROR = zlib.constants.Z_DATA_ERROR;
export const Z_MEM_ERROR = zlib.constants.Z_MEM_ERROR;
export const Z_BUF_ERROR = zlib.constants.Z_BUF_ERROR;
export const Z_VERSION_ERROR = zlib.constants.Z_VERSION_ERROR;

export const Z_NO_COMPRESSION = zlib.constants.Z_NO_COMPRESSION;
export const Z_BEST_SPEED = zlib.constants.Z_BEST_SPEED;
export const Z_BEST_COMPRESSION = zlib.constants.Z_BEST_COMPRESSION;
export const Z_DEFAULT_COMPRESSION = zlib.constants.Z_DEFAULT_COMPRESSION;

export const Z_FILTERED = zlib.constants.Z_FILTERED;
export const Z_HUFFMAN_ONLY = zlib.constants.Z_HUFFMAN_ONLY;
export const Z_RLE = zlib.constants.Z_RLE;
export const Z_FIXED = zlib.constants.Z_FIXED;
export const Z_DEFAULT_STRATEGY = zlib.constants.Z_DEFAULT_STRATEGY;

