const __ = adone.lazify({
    AbstractBackend: ["abstract-leveldown", "AbstractLevelDOWN"],
    AbstractChainedBatch: ["abstract-leveldown", "AbstractChainedBatch"],
    AbstractIterator: ["abstract-leveldown", "AbstractIterator"],
    LevelUP: "levelup",
    backend: () => adone.lazify({
        EncodingBackend: "encoding-down",
        DeferredBackend: "deferred-leveldown",
        MemoryBackend: "memdown",
        LevelDBBackend: "leveldown"
    }),
    packager: "./packager",
    LevelDB: () => __.packager(__.backend.LevelDBBackend),
    MemoryDB: () => __.packager(__.backend.MemoryBackend)
}, adone.asNamespace(exports), require);
