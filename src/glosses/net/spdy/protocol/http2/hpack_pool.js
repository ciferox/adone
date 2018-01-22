const constants = require("./").constants;

const hpack = require("hpack.js");

export default class Pool {
    get(version) {
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
    }

    put() {
    }

    static create() {
        return new Pool();
    }
}
