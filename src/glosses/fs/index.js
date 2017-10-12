const {
    is,
    x,
    promise: { promisify },
    std
} = adone;

const fs = adone.lazify({
    readlink: () => (path, options) => new Promise((resolve, reject) => {
        std.fs.readlink(path, options, (err, result) => {
            err ? reject(err) : resolve(result);
        });
    }),
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
    realpath: () => promisify(std.fs.realpath),
    rm: "./rm",
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
    watch: () => (paths, options) => (new adone.fs.Watcher(options || {}).add(paths)),
    is: () => adone.lazify({
        file: () => (path) => adone.fs.stat(path).then((st) => st.isFile()),
        fileSync: () => (path) => adone.fs.statSync(path).isFile(),
        directory: () => (path) => adone.fs.stat(path).then((st) => st.isDirectory()),
        directorySync: () => (path) => adone.fs.statSync(path).isDirectory(),
        executable: ["./is_executable", (mod) => mod.isExecutable],
        executableSync: ["./is_executable", (mod) => mod.isExecutableSync]
    }, null, require),
    which: ["./which", (mod) => mod.which],
    whichSync: ["./which", (mod) => mod.whichSync],
    TailWatcher: "./tail_watcher",
    readdirp: "./readdirp",
    engine: "./engines",
    lstatSync: () => (path) => std.fs.lstatSync(path),
    statSync: () => (path) => std.fs.statSync(path),
    writeFileSync: () => (path, data, options) => std.fs.writeFileSync(path, data, options),
    readdirSync: () => (path, options) => std.fs.readdirSync(path, options),
    accessSync: () => (path, mode) => std.fs.accessSync(path, mode),
    unlinkSync: () => (path) => std.fs.unlinkSync(path),
    createReadStream: () => (path, options) => std.fs.createReadStream(path, options),
    createWriteStream: () => (path, options) => std.fs.createWriteStream(path, options),
    lock: ["./lock_file", (mod) => mod.lock],
    unlock: ["./lock_file", (mod) => mod.unlock],
    checkLock: ["./lock_file", (mod) => mod.check]
}, adone.asNamespace(exports), require);

const lazy = adone.lazify({
    System: () => adone.bind("metrics.node").System,
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
            throw new x.Unknown(`Unknown flock flag: ${flag}`);
    }
};

export const fd = adone.lazify({
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
    utimes: () => (fd, atime, mtime) => new Promise((resolve, reject) => {
        std.fs.futimes(fd, atime, mtime, (err) => {
            err ? reject(err) : resolve();
        });
    }),
    utimesSync: () => (fd, atime, mtime) => std.fs.futimesSync(fd, atime, mtime),
    stat: () => (fd) => new Promise((resolve, reject) => {
        std.fs.fstat(fd, (err, stats) => {
            err ? reject(err) : resolve(stats);
        });
    }),
    statSync: () => (fd) => std.fs.fstat(fd),
    truncate: () => (fd, len) => new Promise((resolve, reject) => {
        std.fs.ftruncate(fd, len, (err) => {
            err ? reject(err) : resolve();
        });
    }),
    truncateSync: () => (fd, len) => std.fs.ftruncateSync(fd, len),
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
    sync: () => (fd) => new Promise((resolve, reject) => {
        std.fs.fsync(fd, (err) => {
            err ? reject(err) : resolve();
        });
    }),
    syncSync: () => (fd) => std.fs.fsyncSync(fd),
    chown: () => (fd, uid, gid) => new Promise((resolve, reject) => {
        std.fs.fchown(fd, uid, gid, (err) => {
            err ? reject(err) : resolve();
        });
    }),
    chownSYnc: () => (fd, uid, gid) => std.fs.fchownSync(fd, uid, gid),
    chmod: () => (fd, mode) => new Promise((resolve, reject) => {
        std.fs.fchmod(fd, mode, (err) => {
            err ? reject(err) : resolve();
        });
    }),
    chmodSync: () => (fd, mode) => std.fs.fchmodSync(fd, mode),
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
    lock: () => (fd, flags) => {
        const oper = stringToFlockFlags(flags);
        return new Promise((resolve, reject) => {
            lazy.flock(fd, oper, (err) => {
                if (err) {
                    return reject(err);
                }
                resolve();
            });
        });
    }
});

const expandReadOptions = (options = {}) => {
    if (is.string(options)) {
        return { encoding: options };
    }
    return options;
};

export const readFile = async (filepath, options) => {
    const {
        check = false,
        encoding = null,
        flags = "r"
    } = expandReadOptions(options);
    if (check) {
        if (!await adone.fs.is.file(filepath)) {
            return null;
        }
    }
    return new Promise((resolve, reject) => {
        return std.fs.readFile(filepath, { encoding, flags }, (err, data) => {
            if (err) {
                return reject(err);
            }
            resolve(data);
        });
    });
};

export const readFileSync = (filepath, options) => {
    const {
        check = false,
        encoding = null,
        flags = "r"
    } = expandReadOptions(options);
    if (check) {
        if (!adone.fs.is.fileSync(filepath)) {
            return null;
        }
    }
    try {
        return std.fs.readFileSync(filepath, { encoding, flags });
    } catch (err) {
        return null;
    }
};

export const readLines = async (filepath, options) => {
    const content = await readFile(filepath, options);
    if (is.null(content)) {
        return null;
    }
    return content.toString().split("\n");
};

export const readLinesSync = (filepath, options) => {
    const content = readFileSync(filepath, options);
    if (is.null(content)) {
        return null;
    }
    return content.toString().split("\n");
};

// Read file (expected one line of text) splitted by whitespaces.
export const readWords = async (filepath, options) => {
    const content = await readFile(filepath, options);
    if (is.null(content)) {
        return null;
    }
    return content.toString().split(new RegExp("\\s+", "g"));
};

export const readWordsSync = (filepath, options) => {
    const content = readFileSync(filepath, options);
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

const mkdirp = (path, mode, fn, made) => {
    const xfs = std.fs;
    if (is.nil(mode)) {
        mode = 0o777 & (~process.umask());
    }
    if (!made) {
        made = null;
    }

    const cb = fn || (adone.noop);
    path = std.path.resolve(path);

    xfs.mkdir(path, mode, (err) => {
        if (!err) {
            made = made || path;
            return cb(null, made);
        }
        switch (err.code) {
            case "ENOENT":
                mkdirp(std.path.dirname(path), mode, (err2, made) => {
                    if (err2) {
                        return cb(err2, made);
                    }
                    mkdirp(path, mode, cb, made);
                });
                break;
            // In the case of any other error, just see if there"s a dir there already. If so, then hooray! If not, then something is borked.
            default:
                xfs.stat(path, (err2, stat) => {
                    // if the stat fails, then that"s super weird.
                    // let the original error be the failure reason.
                    if (err2 || !stat.isDirectory()) {
                        return cb(err, made);
                    }
                    return cb(null, made);
                });
                break;
        }
    });
};

export const mkdir = (path, mode) => {
    if (is.array(path)) {
        return Promise.all(path.map((x) => mkdir(x, mode))).then(adone.noop);
    }
    return new Promise((resolve, reject) => {
        mkdirp(path, mode, (err) => {
            err ? reject(err) : resolve();
        });
    });
};

export const copy = async (srcPath, dstPath, { ignoreExisting = false, cwd = undefined } = {}) => {
    const baseSrcPath = adone.util.globParent(srcPath);
    if (is.string(cwd)) {
        if (!std.path.isAbsolute(dstPath)) {
            dstPath = std.path.resolve(cwd, dstPath);
        }
    }

    await fs.glob(srcPath, { cwd }).map(async (p) => {
        const relPath = std.path.relative(baseSrcPath, p);
        const dstFilePath = std.path.resolve(dstPath, relPath);

        if (ignoreExisting && await exists(dstFilePath)) {
            return [dstFilePath, null];
        }

        const srcAbsPath = (is.string(cwd) && !std.path.isAbsolute(p)) ? std.path.resolve(cwd, p) : p;
        return [dstFilePath, await readFile(srcAbsPath, { check: true })];
    }).map(async (fData) => {
        const content = fData[1];
        if (is.null(content)) {
            return;
        }
        const dstFilePath = fData[0];
        await mkdir(std.path.dirname(dstFilePath));
        return adone.fs.writeFile(dstFilePath, content);
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
    const fd = await fs.fd.open(path, "r");
    if (!pos) {
        const stat = await fs.fd.stat(fd);
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
        bytesRead = await fs.fd.read(fd, chunk, 0, chunkLength, offset);
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

const TEMPLATE_PATTERN = /XXXXXX/;
const osTmpDir = std.os.tmpdir();
export const tmpName = async ({ name = null, tries = 3, template = null, dir = osTmpDir, prefix = "tmp-", ext = "" } = {}) => {
    if (is.nan(tries) || tries < 0) {
        throw new Error("Invalid tries");
    }

    if (!is.null(template) && !template.match(TEMPLATE_PATTERN)) {
        throw new Error("Invalid template provided");
    }

    for (let i = 0; i < tries; i++) {
        if (!is.null(name)) {
            return std.path.join(dir, name);
        }

        if (!is.null(template)) {
            return template.replace(TEMPLATE_PATTERN, adone.text.random(6));
        }

        const path = std.path.join(dir, `${prefix}${process.pid}${adone.text.random(12)}${ext}`);

        try {
            await adone.fs.stat(path); // eslint-disable-line no-await-in-loop
            continue;
        } catch (err) {
            return path;
        }
    }
    throw new Error("Could not get a unique tmp filename, max tries reached");
};

export const homeDir = () => (is.windows ? process.env.USERPROFILE : process.env.HOME);

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

    throw new adone.x.NotFound(path);
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
