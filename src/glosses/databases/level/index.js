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
            defaultOptions: {
                createIfMissing: true,
                errorIfExists: false,
                keyEncoding: "utf8",
                valueEncoding: "utf8",
                compression: true
            },
            getOptions: (options) => {
                if (typeof options === "string") {
                    options = { valueEncoding: options };
                }
                if (typeof options !== "object") {
                    options = {};
                }
                return options;
            },
            dispatchError: (db, error, callback) => {
                typeof callback === "function" ? callback(error) : db.emit("error", error);
            },
            isDefined: (v) => {
                return typeof v !== "undefined";
            }
        };
    },
    ltgt: "./ltgt"
}, exports, require);
