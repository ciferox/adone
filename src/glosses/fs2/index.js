const {
    is,
    promise: { universalify, universalifyFromPromise },
    lazify
} = adone;

adone.asNamespace(exports);

export const base = require("./base");

const api = [
    "access",
    "appendFile",
    "chmod",
    "chown",
    "close",
    "copyFile",
    "fchmod",
    "fchown",
    "fdatasync",
    "fstat",
    "fsync",
    "ftruncate",
    "futimes",
    "lchown",
    "lchmod",
    "link",
    "lstat",
    "mkdir",
    "mkdtemp",
    "open",
    "readFile",
    "readdir",
    "readlink",
    "realpath",
    "rename",
    "rmdir",
    "stat",
    "symlink",
    "truncate",
    "unlink",
    "utimes",
    "writeFile"
].filter((key) => is.function(base[key]));

Object.keys(base).forEach((key) => {
    if (key === "promises") {
        return;
    }
    exports[key] = base[key];
});

// Universalify async methods:
api.forEach((method) => {
    exports[method] = universalify(base[method]);
});

// We differ from mz/fs in that we still ship the old, broken, fs.exists()
// since we are a drop-in replacement for the native module
export const exists = (filename, callback) => {
    return (is.function(callback))
        ? base.exists(filename, callback)
        : new Promise((resolve) => {
            return base.exists(filename, resolve);
        });
};

export const read = (fd, buffer, offset, length, position, callback) => {
    return (is.function(callback))
        ? base.read(fd, buffer, offset, length, position, callback)
        : new Promise((resolve, reject) => {
            base.read(fd, buffer, offset, length, position, (err, bytesRead, buffer) => {
                if (err) {
                    return reject(err);
                }
                resolve({ bytesRead, buffer });
            });
        });
};

// Function signature can be
// fs.write(fd, buffer[, offset[, length[, position]]], callback)
// OR
// fs.write(fd, string[, position[, encoding]], callback)
// We need to handle both cases, so we use ...args
export const write = function (fd, buffer, ...args) {
    return (is.function(args[args.length - 1]))
        ? base.write(fd, buffer, ...args)
        : new Promise((resolve, reject) => {
            base.write(fd, buffer, ...args, (err, bytesWritten, buffer) => {
                if (err) {
                    return reject(err);
                }
                resolve({ bytesWritten, buffer });
            });
        });
};

// async
lazify({
    copy: "./copy",
    createFile: "./create_file",
    createLink: "./create_link",
    createSymlink: "./create_symlink",
    emptyDir: "./empty_dir",
    mkdirp: "./mkdirp",
    move: "./move",
    readJson: "./read_json",
    writeJson: "./write_json",
    outputFile: "./output_file",
    outputJson: "./output_json",
    remove: "./remove"
}, exports, require, {
    mapper: (mod) => universalify(lazify.mapper(mod))
});

export const pathExists = universalifyFromPromise((path) => exports.access(path).then(() => true).catch(() => false));


// sync
lazify({
    copySync: "./copy/sync",
    createFileSync: "./create_file/sync",
    createLinkSync: "./create_link/sync",
    createSymlinkSync: "./create_symlink/sync",
    emptyDirSync: "./empty_dir/sync",
    mkdirpSync: "./mkdirp/sync",
    moveSync: "./move/sync",
    readJsonSync: "./read_json/sync",
    writeJsonSync: "./write_json/sync",
    outputFileSync: "./output_file/sync",
    outputJsonSync: "./output_json/sync",
    pathExistsSync: () => base.existsSync,
    removeSync: "./remove/sync"
}, exports, require);

Object.defineProperty(exports, "promises", {
    get() {
        return adone.std.fs.promises;
    }
});

lazify({
    custom: "./custom",
    createFiles: "./create_files"
}, exports, require);
