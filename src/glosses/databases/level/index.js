adone.lazify({
    AbstractIterator: ["./abstract", (mod) => mod.AbstractIterator],
    AbstractChainedBatch: ["./abstract", (mod) => mod.AbstractChainedBatch],
    AbstractBackend: ["./abstract", (mod) => mod.AbstractBackend],
    Batch: "./batch",
    Codec: "./codec",
    DB: "./db",
    backend: "./backends"
}, adone.asNamespace(exports), require);
