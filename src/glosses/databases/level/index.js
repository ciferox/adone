const { is } = adone;

adone.lazify({
    _: () => adone.lazify({
        native: () => adone.bind("leveldown.node").leveldown
    }, null, require),
    AbstractIterator: ["./abstract", (mod) => mod.AbstractIterator],
    AbstractChainedBatch: ["./abstract", (mod) => mod.AbstractChainedBatch],
    AbstractBackend: ["./abstract", (mod) => mod.AbstractBackend],
    Batch: "./batch",
    Codec: "./codec",
    DB: "./db",
    backend: () => adone.lazify({
        Default: "./backends/default",
        Memory: "./backends/memory"
    }, null, require),
    util: () => {
        return {
            dispatchError: (db, error, callback) => {
                return is.function(callback) ? callback(error) : db.emit("error", error);
            },
            isDefined: (v) => {
                return !is.undefined(v);
            }
        };
    }
}, exports, require);
