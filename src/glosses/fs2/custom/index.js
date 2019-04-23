adone.lazify({
    FSException: "./fs_exception",
    BaseFileSystem: "./base",
    MemoryFileSystemOld: "./memory_old",
    MemoryFileSystem: "./memory",
    StandardFileSystem: "./standard",
    ZipFileSystem: "./zip",
    createError: ["./fs_exception", (mod) => mod.createError]
}, exports, require);
