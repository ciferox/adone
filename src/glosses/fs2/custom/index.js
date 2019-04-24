adone.lazify({
    BaseFileSystem: "./base",
    MemoryFileSystemOld: "./memory_old",
    MemoryFileSystem: "./memory",
    StandardFileSystem: "./standard",
    ZipFileSystem: "./zip",
    createError: "./errors"
}, exports, require);
