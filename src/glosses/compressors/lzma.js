const {
    xz
} = adone.compressor;

const lzma = {
    ...xz,
    compress: (buf, options = {}) => {
        return xz.singleStringCoding(lzma.compressStream(options), buf);
    },
    compressStream: (options = {}) => {
        return xz.createStream("aloneEncoder", options);
    },
    compressSync: (/*buf, options = {}*/) => {
        throw new adone.error.NotImplementedException();
    },
    decompress: (buf, options = {}) => {
        return xz.singleStringCoding(lzma.decompressStream(options), buf);
    },
    decompressStream: (options = {}) => {
        return xz.createStream("aloneDecoder", options);
    },
    decompressSync: (/*buf, options = {}*/) => {
        throw new adone.error.NotImplementedException();
    }
};

export default adone.asNamespace(lzma);
