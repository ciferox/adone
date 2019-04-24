adone.lazify({
    BaseFileSystem: "./base_fs",
    AsyncFileSystem: "./async_fs",
    MemoryFileSystem: "./memory_fs",
    StdFileSystem: "./std_fs",
    ZipFileSystem: "./zip_fs",
    createError: "./errors"
}, exports, require);
