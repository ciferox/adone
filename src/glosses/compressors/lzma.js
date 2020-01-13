const lzmaNative = require("lzma-native");

const lzma = {
    ...lzmaNative,
    compress: (buf, mode, onFinish, onProgress) => {
        return lzmaNative.LZMA().compress(buf, mode, onFinish, onProgress);
    },
    compressStream: (options = {}) => {
        return lzmaNative.createStream("aloneEncoder", options);
    },
    compressSync: (/*buf, options = {}*/) => {
        throw new adone.error.NotImplementedException();
    },
    decompress: (buf, onFinish, onProgress) => {
        return lzmaNative.LZMA().decompress(buf, onFinish, onProgress);
    },
    decompressStream: (options = {}) => {
        return lzmaNative.createStream("aloneDecoder", options);
    },
    decompressSync: (/*buf, options = {}*/) => {
        throw new adone.error.NotImplementedException();
    }
};

export default adone.asNamespace(lzma);
