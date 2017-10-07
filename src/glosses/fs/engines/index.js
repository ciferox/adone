adone.lazify({
    AbstractEngine: ["./abstract_engine", (x) => x.AbstractEngine],
    Structure: ["./abstract_engine", (x) => x.Structure],
    Path: ["./abstract_engine", (x) => x.Path],
    MemoryEngine: "./memory_engine",
    StandardEngine: "./standard_engine"
}, exports, require);
