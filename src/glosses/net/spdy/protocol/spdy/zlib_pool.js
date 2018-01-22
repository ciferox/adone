const {
    net: { spdy: transport },
    std: { zlib }
} = adone;

// TODO(indutny): think about it, why has it always been Z_SYNC_FLUSH here.
// It should be possible to manually flush stuff after the write instead
const createDeflate = function (version, compression) {
    const deflate = zlib.createDeflate({
        dictionary: transport.protocol.spdy.dictionary[version],
        flush: zlib.Z_SYNC_FLUSH,
        windowBits: 11,
        level: compression ? zlib.Z_DEFAULT_COMPRESSION : zlib.Z_NO_COMPRESSION
    });

    // For node.js v0.8
    deflate._flush = zlib.Z_SYNC_FLUSH;

    return deflate;
};

const createInflate = function (version) {
    const inflate = zlib.createInflate({
        dictionary: transport.protocol.spdy.dictionary[version],
        flush: zlib.Z_SYNC_FLUSH
    });

    // For node.js v0.8
    inflate._flush = zlib.Z_SYNC_FLUSH;

    return inflate;
};

export default class Pool {
    constructor(compression) {
        this.compression = compression;
        this.pool = {
            2: [],
            3: [],
            3.1: []
        };
    }

    get(version) {
        if (this.pool[version].length > 0) {
            return this.pool[version].pop();
        }
        const id = version;

        return {
            version,
            compress: createDeflate(id, this.compression),
            decompress: createInflate(id)
        };

    }

    put(pair) {
        this.pool[pair.version].push(pair);
    }

    static create(compression) {
        return new Pool(compression);
    }
}
