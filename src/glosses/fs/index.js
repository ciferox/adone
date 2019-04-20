const {
    is,
    error,
    std
} = adone;

const lazy = adone.lazify({
    System: () => adone.nativeAddon("metrics.node").System,
    seek: () => lazy.System.seek,
    flock: () => lazy.System.flock,
    statVFS: () => lazy.System.statVFS
});

const stringToFlockFlags = (flag) => {
    // Only mess with strings
    if (!is.string(flag)) {
        return flag;
    }
    const b = lazy.System;

    switch (flag) {
        case "sh":
            return b.LOCK_SH;

        case "ex":
            return b.LOCK_EX;

        case "shnb":
            return b.LOCK_SH | b.LOCK_NB;

        case "exnb":
            return b.LOCK_EX | b.LOCK_NB;

        case "un":
            return b.LOCK_UN;

        default:
            throw new error.UnknownException(`Unknown flock flag: ${flag}`);
    }
};

const fs = adone.lazify({
    open: () => (path, flags, mode) => new Promise((resolve, reject) => {
        std.fs.open(path, flags, mode, (err, fd) => {
            err ? reject(err) : resolve(fd);
        });
    }),
    openSync: () => (path, flags, mode) => std.fs.openSync(path, flags, mode), // wrapper to make it mockable
    close: () => (fd) => new Promise((resolve, reject) => {
        std.fs.close(fd, (err) => {
            err ? reject(err) : resolve();
        });
    }),
    closeSync: () => (fd) => std.fs.closeSync(fd),
    futimes: () => (fd, atime, mtime) => new Promise((resolve, reject) => {
        std.fs.futimes(fd, atime, mtime, (err) => {
            err ? reject(err) : resolve();
        });
    }),
    futimesSync: () => (fd, atime, mtime) => std.fs.futimesSync(fd, atime, mtime),
    fstat: () => (fd) => new Promise((resolve, reject) => {
        std.fs.fstat(fd, (err, stats) => {
            err ? reject(err) : resolve(stats);
        });
    }),
    fstatSync: () => (fd) => std.fs.fstatSync(fd),
    ftruncate: () => (fd, len) => new Promise((resolve, reject) => {
        std.fs.ftruncate(fd, len, (err) => {
            err ? reject(err) : resolve();
        });
    }),
    ftruncateSync: () => (fd, len) => std.fs.ftruncateSync(fd, len),
    read: () => (fd, buffer, offset, length, position) => new Promise((resolve, reject) => {
        std.fs.read(fd, buffer, offset, length, position, (err, bytesRead) => {
            err ? reject(err) : resolve(bytesRead);
        });
    }),
    readSync: () => (fd, buffer, offset, length, position) => std.fs.readSync(fd, buffer, offset, length, position),
    write: () => (fd, buffer, offset, length, position) => new Promise((resolve, reject) => {
        std.fs.write(fd, buffer, offset, length, position, (err, bytesWritten) => {
            err ? reject(err) : resolve(bytesWritten);
        });
    }),
    writeSync: () => (fd, buffer, offset, length, position) => std.fs.writeSync(fd, buffer, offset, length, position),
    fsync: () => (fd) => new Promise((resolve, reject) => {
        std.fs.fsync(fd, (err) => {
            err ? reject(err) : resolve();
        });
    }),
    fsyncSync: () => (fd) => std.fs.fsyncSync(fd),
    fchown: () => (fd, uid, gid) => new Promise((resolve, reject) => {
        std.fs.fchown(fd, uid, gid, (err) => {
            err ? reject(err) : resolve();
        });
    }),
    fchownSync: () => (fd, uid, gid) => std.fs.fchownSync(fd, uid, gid),
    fchmod: () => (fd, mode) => new Promise((resolve, reject) => {
        std.fs.fchmod(fd, mode, (err) => {
            err ? reject(err) : resolve();
        });
    }),
    fchmodSync: () => (fd, mode) => std.fs.fchmodSync(fd, mode),
    seek: () => (fd, offset, whence) => {
        return new Promise((resolve, reject) => {
            lazy.seek(fd, offset, whence, (err, filePos) => {
                if (err) {
                    return reject(err);
                }
                resolve(filePos);
            });
        });
    },
    flock: () => (fd, flags) => {
        const oper = stringToFlockFlags(flags);
        return new Promise((resolve, reject) => {
            lazy.flock(fd, oper, (err) => {
                if (err) {
                    return reject(err);
                }
                resolve();
            });
        });
    },
    readlink: () => (path, options) => new Promise((resolve, reject) => {
        std.fs.readlink(path, options, (err, result) => {
            err ? reject(err) : resolve(result);
        });
    }),
    readlinkSync: () => (path, options) => std.fs.readlinkSync(path, options),
    unlink: () => (path) => new Promise((resolve, reject) => {
        std.fs.unlink(path, (err) => {
            err ? reject(err) : resolve();
        });
    }),
    chmod: () => (path, mode) => new Promise((resolve, reject) => {
        std.fs.chmod(path, mode, (err) => {
            err ? reject(err) : resolve();
        });
    }),
    chown: () => (path, uid, gid) => new Promise((resolve, reject) => {
        std.fs.chown(path, uid, gid, (err) => {
            err ? reject(err) : resolve();
        });
    }),
    rmdir: () => (path) => new Promise((resolve, reject) => {
        std.fs.rmdir(path, (err) => {
            err ? reject(err) : resolve();
        });
    }),
    readdir: () => (path, options) => new Promise((resolve, reject) => {
        std.fs.readdir(path, options, (err, files) => {
            err ? reject(err) : resolve(files);
        });
    }),
    lstat: () => (path) => new Promise((resolve, reject) => {
        std.fs.lstat(path, (err, stats) => {
            err ? reject(err) : resolve(stats);
        });
    }),
    stat: () => (path) => new Promise((resolve, reject) => {
        std.fs.stat(path, (err, stat) => {
            err ? reject(err) : resolve(stat);
        });
    }),
    readFile: () => (path, options) => new Promise((resolve, reject) => {
        std.fs.readFile(path, options, (err, data) => {
            err ? reject(err) : resolve(data);
        });
    }),
    writeFile: () => (file, data, options) => new Promise((resolve, reject) => {
        std.fs.writeFile(file, data, options, (err) => {
            err ? reject(err) : resolve();
        });
    }),
    appendFile: () => (file, data, options) => new Promise((resolve, reject) => {
        std.fs.appendFile(file, data, options, (err) => {
            err ? reject(err) : resolve();
        });
    }),
    appendFileSync: () => (file, data, options) => std.fs.appendFileSync(file, data, options),
    access: () => (path, mode) => new Promise((resolve, reject) => {
        std.fs.access(path, mode, (err) => {
            err ? reject(err) : resolve();
        });
    }),
    symlink: () => (target, path, type) => new Promise((resolve, reject) => {
        std.fs.symlink(target, path, type, (err) => {
            err ? reject(err) : resolve();
        });
    }),
    truncate: () => (path, len) => new Promise((resolve, reject) => {
        std.fs.truncate(path, len, (err) => {
            err ? reject(err) : resolve();
        });
    }),
    realpath: () => (path, options) => new Promise((resolve, reject) => {
        std.fs.realpath(path, options, (err, result) => {
            err ? reject(err) : resolve(result);
        });
    }),
    realpathSync: () => (path, options) => std.fs.realpathSync(path, options),
    utimes: () => (path, atime, mtime) => new Promise((resolve, reject) => {
        std.fs.utimes(path, atime, mtime, (err) => {
            err ? reject(err) : resolve();
        });
    }),
    utimesSync: () => (path, atime, mtime) => std.fs.utimesSync(path, atime, mtime),
    mkdir: () => (path, mode) => new Promise((resolve, reject) => {
        std.fs.mkdir(path, mode, (err) => {
            err ? reject(err) : resolve();
        });
    }),
    mkdirSync: () => (path, mode) => std.fs.mkdirSync(path, mode),
    mkdirp: ["./mkdirp", (x) => x.mkdirp],
    mkdirpSync: ["./mkdirp", (x) => x.mkdirpSync],
    rm: "./rm",
    rmEmpty: "./rm_empty",
    File: "./file",
    Directory: "./directory",
    SymbolicLinkFile: "./symlink_file",
    SymbolicLinkDirectory: "./symlink_directory",
    RandomAccessFile: ["./random_access", (mod) => mod.RandomAccessFile],
    AbstractRandomAccessReader: ["./random_access", (mod) => mod.AbstractRandomAccessReader],
    RandomAccessFdReader: ["./random_access", (mod) => mod.RandomAccessFdReader],
    RandomAccessBufferReader: ["./random_access", (mod) => mod.RandomAccessBufferReader],
    Mode: "./mode",
    glob: "./glob",
    Watcher: "./watcher",
    watch: () => (paths, options) => new adone.fs.Watcher(options || {}).add(paths),
    isFile: () => (path) => adone.fs.stat(path).then((st) => st.isFile()),
    isFileSync: () => (path) => adone.fs.statSync(path).isFile(),
    isDirectory: () => (path) => adone.fs.stat(path).then((st) => st.isDirectory()),
    isDirectorySync: () => (path) => adone.fs.statSync(path).isDirectory(),
    isExecutable: ["./is_executable", (mod) => mod.isExecutable],
    isExecutableSync: ["./is_executable", (mod) => mod.isExecutableSync],
    which: ["./which", (mod) => mod.which],
    whichSync: ["./which", (mod) => mod.whichSync],
    TailWatcher: "./tail_watcher",
    readdirp: "./readdirp",
    engine: "./engines",
    lstatSync: () => (path) => std.fs.lstatSync(path),
    statSync: () => (path) => std.fs.statSync(path),
    readFileSync: () => (path, options) => std.fs.readFileSync(path, options),
    writeFileSync: () => (path, data, options) => std.fs.writeFileSync(path, data, options),
    readdirSync: () => (path, options) => std.fs.readdirSync(path, options),
    accessSync: () => (path, mode) => std.fs.accessSync(path, mode),
    unlinkSync: () => (path) => std.fs.unlinkSync(path),
    createReadStream: () => (path, options) => std.fs.createReadStream(path, options),
    createWriteStream: () => (path, options) => std.fs.createWriteStream(path, options),
    fuse: "./fuse",
    tmpName: "./tmp_name",
    writeFileAtomic: "./write_file_atomic",
    upath: "./upath",
    dirname: "./dirname",
    copy: "./copy",
    readChunk: "./read_chunk",
    replaceInFile: "./replace_in_file",
    copyFile: "./copy_file",
    junk: "./junk"
}, adone.asNamespace(exports), require);

export const readLines = async (filepath, options) => {
    const content = await fs.readFile(filepath, options);
    if (is.null(content)) {
        return null;
    }
    return content.toString().split("\n");
};

export const readLinesSync = (filepath, options) => {
    const content = fs.readFileSync(filepath, options);
    if (is.null(content)) {
        return null;
    }
    return content.toString().split("\n");
};

// Read file (expected one line of text) splitted by whitespaces.
export const readWords = async (filepath, options) => {
    const content = await fs.readFile(filepath, options);
    if (is.null(content)) {
        return null;
    }
    return content.toString().split(new RegExp("\\s+", "g"));
};

export const readWordsSync = (filepath, options) => {
    const content = fs.readFileSync(filepath, options);
    if (is.null(content)) {
        return null;
    }
    return content.toString().split(new RegExp("\\s+", "g"));
};

export const constants = {
    ...std.fs.constants,
    SEEK_SET: 0,
    SEEK_CUR: 1,
    SEEK_END: 2,
    LOCK_SH: 1,
    LOCK_EX: 2,
    LOCK_NB: 4,
    LOCK_UN: 8
};

export const exists = (path) => adone.fs.access(path, constants.F_OK).then(() => true, (err) => {
    if (err.code === "ENOENT") {
        return false;
    }
    return Promise.reject(err);
});

export const existsSync = (path) => {
    try {
        fs.accessSync(path, constants.F_OK);
        return true;
    } catch (err) {
        if (err.code === "ENOENT") {
            return false;
        }
        throw err;
    }
};

export const utimesMillis = (path, atime, mtime, callback) => {
    // if (!HAS_MILLIS_RES) return fs.utimes(path, atime, mtime, callback)
    std.fs.open(path, "r+", (err, fd) => {
        if (err) {
            return callback(err);
        }
        std.fs.futimes(fd, atime, mtime, (futimesErr) => {
            std.fs.close(fd, (closeErr) => {
                if (callback) {
                    return callback(futimesErr || closeErr);
                }
            });
        });
    });
};

export const rename = (oldPath, newPath, { retries = 10, delay = 100 } = {}) => {
    return new Promise((resolve, reject) => {
        std.fs.rename(oldPath, newPath, (err) => {
            if (err) {
                if (!is.windows || !retries) {
                    return reject(err);
                }
                if (err.code !== "EPERM" && err.code !== "EACCESS") {
                    return reject(err);
                }
                // life is suffering
                return resolve(this.rename(oldPath, newPath, { retries: retries - 1, delay }));
            }
            resolve();
        });
    });
};

export const tail = async (path, n = 10, { separator = is.windows ? "\r\n" : "\n", chunkLength = 4096, pos } = {}) => {
    const fd = await fs.open(path, "r");
    if (!pos) {
        const stat = await fs.fstat(fd);
        pos = stat.size;
    }
    let buffer = Buffer.alloc(0);
    if (pos === 0 || !n) {
        return [];
    }
    let offset = Math.max(0, pos - chunkLength);
    const lines = new adone.collection.LinkedList();
    separator = Buffer.from(separator);
    const chunk = Buffer.alloc(chunkLength);
    let i;
    let bytesRead;
    let t;
    let first = true;
    let exit = false;
    for (; n && !exit;) {
        if (offset < 0) {
            chunkLength += offset;
            offset = 0;
            exit = true;
        }
        // eslint-disable-next-line
        bytesRead = await fs.read(fd, chunk, 0, chunkLength, offset);
        buffer = Buffer.concat([chunk.slice(0, bytesRead), buffer], bytesRead + buffer.length);
        while (n && (i = buffer.lastIndexOf(separator)) !== -1) {
            t = buffer.slice(i + separator.length);
            if (first) {
                first = false;
                if (!t.length) { // ends with the sep
                    buffer = buffer.slice(0, i);
                    continue;
                }
            }
            lines.unshift(t);
            --n;
            buffer = buffer.slice(0, i);
        }
        offset -= chunkLength;
    }
    if (n && buffer.length) {
        lines.unshift(buffer);
    }
    return lines.toArray();
};

export const statVFS = (path) => new Promise((resolve, reject) => {
    lazy.statVFS(path, (err, result) => {
        if (err) {
            return reject(err);
        }
        resolve(result);
    });
});

/**
 * Note: On Debian 'HOME' variable is not preserved when using sudo.
 * This behaviour can be overriden by adding following line to the sudoers file:
 * Defaults env_keep += "HOME"
 */
export const homeDir = () => is.windows ? process.env.USERPROFILE : process.env.HOME;

export const lookup = async (path) => {
    try {
        let st = await fs.stat(path);
        if (st.isDirectory()) {
            path = std.path.join(path, "index");
            st = await fs.stat(path);
            return path;
        }
    } catch (err) {
        for (const ext of [".js"]) {
            const newPath = `${path}${ext}`;
            if (await fs.exists(newPath)) { // eslint-disable-line no-await-in-loop
                return `${path}${ext}`;
            }
        }
    }

    throw new adone.error.NotFoundException(path);
};

export const chownr = async (path, uid, gid) => {
    let children;
    try {
        children = await fs.readdir(path);
    } catch (err) {
        // any error other than ENOTDIR means it's not readable, or
        // doesn't exist.  give up.
        if (err.code !== "ENOTDIR") {
            throw err;
        }
        return fs.chown(path, uid, gid);
    }
    if (children.length === 0) {
        return fs.chown(path, uid, gid);
    }
    await Promise.all(children.map(async (p) => {
        const childPath = std.path.resolve(path, p);
        const stat = await fs.lstat(childPath);
        if (!stat.isSymbolicLink()) {
            await chownr(childPath, uid, gid);
        }
    }));
    await fs.chown(path, uid, gid);
};

export const watchTail = (filepath, options) => new fs.TailWatcher(filepath, options);
