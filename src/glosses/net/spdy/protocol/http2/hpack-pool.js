const constants = require("./").constants;

const hpack = require("hpack.js");

function Pool() {
}
module.exports = Pool;

Pool.create = function create() {
    return new Pool();
};

Pool.prototype.get = function get(version) {
    const options = {
        table: {
            maxSize: constants.HEADER_TABLE_SIZE
        }
    };

    const compress = hpack.compressor.create(options);
    const decompress = hpack.decompressor.create(options);

    return {
        version,

        compress,
        decompress
    };
};

Pool.prototype.put = function put() {
};
