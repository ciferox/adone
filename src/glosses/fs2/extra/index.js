import clone from "../clone";
const {
    is,
    promise: { universalify, universalifyFromPromise },
    lazify
} = adone;

/**
 * Returns new fs object - improved version of specified fs instance.
 * 
 * @param {*} fs 
 */
export const improve = (fs) => {
    const improvedFs = clone(fs);

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
        "lchmod",
        "lchown",
        "link",
        "lstat",
        "mkdir",
        "mkdtemp",
        "open",
        "readdir",
        "readFile",
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
    ].filter((key) => is.function(fs[key]));

    // Universalify async methods:
    for (const method of api) {
        improvedFs[method] = universalify(fs[method]);
    }

    // We differ from mz/fs in that we still ship the old, broken, fs.exists()
    // since we are a drop-in replacement for the native module
    improvedFs.exists = adone.std.util.deprecate((filename, callback) => {
        console.log("sdf");
        return (is.function(callback))
            ? fs.exists(filename, callback)
            : new Promise((resolve) => {
                return fs.exists(filename, resolve);
            });
    }, "adone.fs.exists() is deprecated", "ADEP00001");

    improvedFs.read = (fd, buffer, offset, length, position, callback) => {
        return (is.function(callback))
            ? fs.read(fd, buffer, offset, length, position, callback)
            : new Promise((resolve, reject) => {
                fs.read(fd, buffer, offset, length, position, (err, bytesRead, buffer) => {
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
    improvedFs.write = function (fd, buffer, ...args) {
        return (is.function(args[args.length - 1]))
            ? fs.write(fd, buffer, ...args)
            : new Promise((resolve, reject) => {
                fs.write(fd, buffer, ...args, (err, bytesWritten, buffer) => {
                    if (err) {
                        return reject(err);
                    }
                    resolve({ bytesWritten, buffer });
                });
            });
    };

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
    }, improvedFs, require, {
        mapper: (mod) => {
            const extension = lazify.mapper(mod);
            return universalify(extension(improvedFs));
        }
    });

    improvedFs.pathExists = universalifyFromPromise((path) => improvedFs.access(path).then(() => true).catch(() => false));

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
        removeSync: "./remove/sync",

        util: "./utils",
        createFiles: "./create_files"
    }, improvedFs, require, {
        mapper: (mod) => {
            const extension = lazify.mapper(mod);
            return extension(improvedFs);
        }
    });

    improvedFs.pathExistsSync = fs.existsSync;

    return improvedFs;
};
