const {
    is,
    x,
    std
} = adone;

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
    fchownSYnc: () => (fd, uid, gid) => std.fs.fchownSync(fd, uid, gid),
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
    fuse: "./fuse"
}, adone.asNamespace(exports), require);

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

export const copy = async (source, dest, options = {}) => {
    const basePath = process.cwd();
    const currentPath = std.path.resolve(basePath, source);
    const targetPath = std.path.resolve(basePath, dest);
    if (currentPath === targetPath) {
        throw new x.NotAllowed("Source and destination must not be the same.");
    }

    const stats = await fs.lstat(source);
    let dir = null;
    if (stats.isDirectory()) {
        const parts = dest.split(std.path.sep);
        parts.pop();
        dir = parts.join(std.path.sep);
    } else {
        dir = std.path.dirname(dest);
    }

    await fs.mkdirp(dir);

    return new Promise((resolve, reject) => {
        const filter = options.filter;
        const transform = options.transform;
        let overwrite = options.overwrite;
        // If overwrite is undefined, use clobber, otherwise default to true:
        if (is.undefined(overwrite)) {
            overwrite = options.clobber;
        }
        if (is.undefined(overwrite)) {
            overwrite = true;
        }
        const errorOnExist = options.errorOnExist;
        const dereference = options.dereference;
        const preserveTimestamps = options.preserveTimestamps === true;

        let started = 0;
        let finished = 0;
        let running = 0;

        let errored = false;

        const doneOne = (skipped) => {
            if (!skipped) {
                running--;
            }
            finished++;
            if ((started === finished) && (running === 0)) {
                return resolve();
            }
        };

        const onError = (err) => {
            // ensure callback is defined & called only once:
            if (!errored) {
                errored = true;
                return reject(err);
            }
        };

        const copyFile = (file, target) => {
            const readStream = fs.createReadStream(file.name);
            const writeStream = fs.createWriteStream(target, { mode: file.mode });

            readStream.on("error", onError);
            writeStream.on("error", onError);

            if (transform) {
                transform(readStream, writeStream, file);
            } else {
                writeStream.on("open", () => {
                    readStream.pipe(writeStream);
                });
            }

            writeStream.once("close", () => {
                std.fs.chmod(target, file.mode, (err) => {
                    if (err) {
                        return onError(err);
                    }
                    if (preserveTimestamps) {
                        fs.utimesMillis(target, file.atime, file.mtime, (err) => {
                            if (err) {
                                return onError(err);
                            }
                            return doneOne();
                        });
                    } else {
                        doneOne();
                    }
                });
            });
        };

        const rmFile = (file, done) => {
            std.fs.unlink(file, (err) => {
                if (err) {
                    return onError(err);
                }
                return done();
            });
        };

        const copyDir = (dir) => {
            fs.readdir(dir, (err, items) => {
                if (err) {
                    return onError(err);
                }
                items.forEach((item) => {
                    startCopy(std.path.join(dir, item));
                });
                return doneOne();
            });
        };

        const mkDir = (dir, target) => {
            std.fs.mkdir(target, dir.mode, (err) => {
                if (err) {
                    return onError(err);
                }
                // despite setting mode in fs.mkdir, doesn't seem to work
                // so we set it here.
                std.fs.chmod(target, dir.mode, (err) => {
                    if (err) {
                        return onError(err);
                    }
                    copyDir(dir.name);
                });
            });
        };

        const isWritable = (path, done) => {
            std.fs.lstat(path, (err) => {
                if (err) {
                    if (err.code === "ENOENT") {
                        return done(true);
                    }
                    return done(false);
                }
                return done(false);
            });
        };

        const onDir = (dir) => {
            const target = dir.name.replace(currentPath, targetPath.replace("$", "$$$$")); // escapes '$' with '$$'
            isWritable(target, (writable) => {
                if (writable) {
                    return mkDir(dir, target);
                }
                copyDir(dir.name);
            });
        };

        const onFile = (file) => {
            const target = file.name.replace(currentPath, targetPath.replace("$", "$$$$")); // escapes '$' with '$$'
            isWritable(target, (writable) => {
                if (writable) {
                    copyFile(file, target);
                } else {
                    if (overwrite) {
                        rmFile(target, () => {
                            copyFile(file, target);
                        });
                    } else if (errorOnExist) {
                        onError(new Error(`${target} already exists`));
                    } else {
                        doneOne();
                    }
                }
            });
        };

        const makeLink = (linkPath, target) => {
            std.fs.symlink(linkPath, target, (err) => {
                if (err) {
                    return onError(err);
                }
                return doneOne();
            });
        };

        const checkLink = (resolvedPath, target) => {
            if (dereference) {
                resolvedPath = std.path.resolve(basePath, resolvedPath);
            }
            isWritable(target, (writable) => {
                if (writable) {
                    return makeLink(resolvedPath, target);
                }
                std.fs.readlink(target, (err, targetDest) => {
                    if (err) {
                        return onError(err);
                    }

                    if (dereference) {
                        targetDest = std.path.resolve(basePath, targetDest);
                    }
                    if (targetDest === resolvedPath) {
                        return doneOne();
                    }
                    return rmFile(target, () => {
                        makeLink(resolvedPath, target);
                    });
                });
            });
        };

        const onLink = (link) => {
            const target = link.replace(currentPath, targetPath);
            std.fs.readlink(link, (err, resolvedPath) => {
                if (err) {
                    return onError(err);
                }
                checkLink(resolvedPath, target);
            });
        };

        const getStats = (source) => {
            const stat = dereference ? std.fs.stat : std.fs.lstat;
            running++;
            stat(source, (err, stats) => {
                if (err) {
                    return onError(err);
                }

                // We need to get the mode from the stats object and preserve it.
                const item = {
                    name: source,
                    mode: stats.mode,
                    mtime: stats.mtime, // modified time
                    atime: stats.atime, // access time
                    stats // temporary
                };

                if (stats.isDirectory()) {
                    return onDir(item);
                } else if (stats.isFile() || stats.isCharacterDevice() || stats.isBlockDevice()) {
                    return onFile(item);
                } else if (stats.isSymbolicLink()) {
                    // Symlinks don't really need to know about the mode.
                    return onLink(source);
                }
            });
        };

        const startCopy = (source) => {
            started++;
            if (filter) {
                if (filter instanceof RegExp) {
                    adone.warn("Warning: fs-extra: Passing a RegExp filter is deprecated, use a function");
                    if (!filter.test(source)) {
                        return doneOne(true);
                    }
                } else if (is.function(filter)) {
                    if (!filter(source, dest)) {
                        return doneOne(true);
                    }
                }
            }
            return getStats(source);
        };

        startCopy(currentPath);
    });
};

export const copyTo = async (srcPath, dstPath, { ignoreExisting = false, cwd = undefined } = {}) => {
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

        const srcAbsPath = is.string(cwd) && !std.path.isAbsolute(p) ? std.path.resolve(cwd, p) : p;
        return [dstFilePath, await readFile(srcAbsPath, { check: true })];
    }).map(async (fData) => {
        const content = fData[1];
        if (is.null(content)) {
            return;
        }
        const dstFilePath = fData[0];
        await fs.mkdirp(std.path.dirname(dstFilePath));
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
