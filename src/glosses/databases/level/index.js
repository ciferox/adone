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
    x: () => {
        const createError = require("errno").create;
        const LevelUPError = createError("LevelUPError");
        const NotFoundError = createError("NotFoundError", LevelUPError);
        NotFoundError.prototype.notFound = true;
        NotFoundError.prototype.status = 404;

        return {
            LevelUPError,
            NotFoundError,
            InitializationError: createError("InitializationError", LevelUPError),
            OpenError: createError("OpenError", LevelUPError),
            ReadError: createError("ReadError", LevelUPError),
            WriteError: createError("WriteError", LevelUPError),
            EncodingError: createError("EncodingError", LevelUPError)
        };
    }
}, exports, require);
