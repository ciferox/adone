adone.lazify({
    AbstractIterator: ["./abstract", (mod) => mod.AbstractIterator],
    AbstractChainedBatch: ["./abstract", (mod) => mod.AbstractChainedBatch],
    AbstractBackend: ["./abstract", (mod) => mod.AbstractBackend],
    Batch: "./batch",
    Codec: "./codec",
    DB: "./db"
}, adone.asNamespace(exports), require);

export const backend = adone.lazify({
    LevelDB: "./backends/leveldb",
    Memory: "./backends/memory"
}, null, require);
