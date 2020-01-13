const lzmaNative = require("lzma-native");

const lzma = {
    ...lzmaNative,
    compressStream: (options = {}) => {
        return lzmaNative.createStream("easyEncoder", options);
    },
    compressSync: (/*buf, options = {}*/) => {
        throw new adone.error.NotImplementedException();
    },
    decompressStream: (options = {}) => {
        return lzmaNative.createStream("easyEncoder", options);
    },
    decompressSync: (/*buf, options = {}*/) => {
        throw new adone.error.NotImplementedException();
    }
};

export default adone.asNamespace(lzma);
