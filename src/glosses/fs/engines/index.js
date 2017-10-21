adone.lazify({
    AbstractEngine: ["./abstract_engine", (x) => x.AbstractEngine],
    Structure: ["./abstract_engine", (x) => x.Structure],
    Path: "./path",
    MemoryEngine: "./memory_engine",
    StandardEngine: "./standard_engine",
    FuseEngine: "./fuse_engine"
}, exports, require);
