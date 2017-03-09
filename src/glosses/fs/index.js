import adone from "adone";
const { is, x, promise: { promisify } } = adone;

const fs = adone.lazify({
    rm: "./rm",
    File: "./file",
    Directory: "./directory",
    SymbolicLinkFile: "./symlink_file",
    SymbolicLinkDirectory: "./symlink_directory",
    RandomAccessFile: "./random_access_file",
    glob: "./glob"
}, exports, require);

const lazy = adone.lazify({
    System: () => adone.bind("metrics.node").System,
    seek: () => lazy.System.seek,
    flock: () => lazy.System.flock
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

export const fd = {
    open: promisify(adone.std.fs.open),
    openSync: adone.std.fs.openSync,
    close: promisify(adone.std.fs.close),
    closeSync: adone.std.fs.closeSync,
    utimes: promisify(adone.std.fs.futimes),
    utimesSync: adone.std.fs.futimesSync,
    stat: promisify(adone.std.fs.fstat),
    statSync: adone.std.fs.fstat,
    truncate: promisify(adone.std.fs.ftruncate),
    truncateSync: adone.std.fs.ftruncateSync,
    read: promisify(adone.std.fs.read),
    readSync: adone.std.fs.readSync,
    write: promisify(adone.std.fs.write),
    writeSync: adone.std.fs.writeSync,
    sync: promisify(adone.std.fs.fsync),
    syncSync: adone.std.fs.fsyncSync,

    seek: (fd, offset, whence) => {
        return new Promise((resolve, reject) => {
            lazy.seek(fd, offset, whence, (err, filePos) => {
                if (err) {
                    return reject(err);
                }
                resolve(filePos);
            });
        });
    },
    lock: (fd, flags) => {
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
};

export const lstat = promisify(adone.std.fs.lstat);

export const lstatSync = adone.std.fs.lstatSync;

export const stat = promisify(adone.std.fs.stat);

export const statSync = adone.std.fs.statSync;

export const isFile = (path) => stat(path).then((st) => st.isFile());

export const isFileSync = (path) => statSync(path).isFile();

export const isDirectory = (path) => stat(path).then((st) => st.isDirectory());

export const isDirectorySync = (path) => statSync(path).isDirectory();

export const writeFile = promisify(adone.std.fs.writeFile);

export const writeFileSync = adone.std.fs.writeFileSync;

export const readFile = async (filepath, { check = false, encoding = null } = {}) => {
    if (check) {
        if (!await isFile(filepath)) {
            return null;
        }
    }
    return adone.std.fs.readFileAsync(filepath, { encoding }).catch(() => null);
};

export const readFileSync = (filepath, { check = false, encoding = null } = {}) => {
    if (check) {
        if (!isFileSync(filepath)) {
            return null;
        }
    }
    try {
        return adone.std.fs.readFileSync(filepath, { encoding });
    } catch (err) {
        return null;
    }
};

export const readLines = async (filepath, { check = false } = {}) => {
    const content = await readFile(filepath, { check });
    if (is.null(content)) {
        return null;
    }
    return content.toString().split("\n");
};

export const readLinesSync = (filepath, { check = false } = {}) => {
    const content = readFileSync(filepath, { check });
    if (is.null(content)) {
        return null;
    }
    return content.toString().split("\n");
};

// Read file (expected one line of text) splitted by whitespaces.
export const readWords = async (filepath, { check = false } = {}) => {
    const content = await readFile(filepath, { check });
    if (is.null(content)) {
        return null;
    }
    return content.toString().split(new RegExp("\\s+", "g"));
};

export const readWordsSync = (filepath, { check = false } = {}) => {
    const content = readFileSync(filepath, { check });
    if (is.null(content)) {
        return null;
    }
    return content.toString().split(new RegExp("\\s+", "g"));
};

export const append = promisify(adone.std.fs.appendFile);

export const constants = adone.std.fs.constants;

export const access = promisify(adone.std.fs.access);

export const accessSync = adone.std.fs.accessSync;

export const exists = (path) => access(path, constants.F_OK).then(() => true, (err) => {
    if (err.code === "ENOENT") {
        return false;
    }
    return Promise.reject(err);
});

export const existsSync = (path) => {
    try {
        accessSync(path, constants.F_OK);
        return true;
    } catch (err) {
        if (err.code === "ENOENT") {
            return false;
        }
        throw err;
    }
};

export const mkdirp = (path, mode, fn, made) => {
    const xfs = adone.std.fs;
    if (is.nil(mode)) {
        mode = 0o777 & (~process.umask());
    }
    if (!made) {
        made = null;
    }

    const cb = fn || (() => { });
    path = adone.std.path.resolve(path);

    xfs.mkdir(path, mode, (err) => {
        if (!err) {
            made = made || path;
            return cb(null, made);
        }
        switch (err.code) {
            case "ENOENT":
                mkdirp(adone.std.path.dirname(path), mode, (err2, made) => {
                    if (err2) {
                        cb(err2, made);
                    } else {
                        mkdirp(path, mode, cb, made);
                    }
                });
                break;
            // In the case of any other error, just see if there"s a dir there already. If so, then hooray! If not, then something is borked.
            default:
                xfs.stat(path, (err2, stat) => {
                    // if the stat fails, then that"s super weird.
                    // let the original error be the failure reason.
                    if (err2 || !stat.isDirectory()) {
                        cb(err, made);
                    } else {
                        cb(null, made);
                    }
                });
                break;
        }
    });
};

export const mkdir = (path, mode) => {
    if (is.array(path)) {
        return Promise.all(path.map((x) => mkdir(x, mode))).then(() => { });
    }
    return new Promise((resolve, reject) => {
        mkdirp(path, mode, (err) => {
            err ? reject(err) : resolve();
        });
    });
};

export const copy = async (srcPath, dstPath, options = {}) => {
    if (!is.boolean(options.recursively)) {
        options.recursively = false;
    }
    if (!is.boolean(options.ignoreExisting)) {
        options.ignoreExisting = false;
    }
    const baseSrcPath = adone.util.globParent(srcPath);
    await fs.glob(srcPath).map(async (p) => {
        const relPath = adone.std.path.relative(baseSrcPath, p);
        const dstFilePath = adone.std.path.resolve(dstPath, relPath);
        if (options.ignoreExisting) {
            if (await exists(dstFilePath)) {
                return [dstFilePath, null];
            }
        }
        const content = await readFile(p, { check: true });
        if (is.null(content)) {
            return [dstFilePath, null];
        }
        return [dstFilePath, content];
    }).map(async (fData) => {
        const content = fData[1];
        if (is.null(content)) {
            return;
        }
        const destFilePath = fData[0];
        await mkdir(adone.std.path.dirname(destFilePath));
        return adone.std.fs.writeFileAsync(destFilePath, content);
    });
};

export const rename = (oldPath, newPath, { retries = 10, delay = 100 } = {}) => {
    return new Promise((resolve, reject) => {
        adone.std.fs.rename(oldPath, newPath, (err) => {
            if (err) {
                if (!is.win32 || !retries) {
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

export const tail = async (path, n = 10, { separator = is.win32 ? "\r\n" : "\n", chunkLength = 4096 } = {}) => {
    const fd = await fs.fd.open(path, "r");
    const stat = await fs.fd.stat(fd);
    let buffer = Buffer.alloc(0);
    if (stat.size === 0 || !n) {
        return [];
    }
    let offset = Math.max(0, stat.size - chunkLength);
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
                if (!t.length) {  // ends with the sep
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

export const statVFS = (path) => {
    return new Promise((resolve, reject) => {
        lazy.metrics.statVFS(path, (err, result) => {
            if (err) {
                return reject(err);
            }
            resolve(result);
        });
    });
};

export const unlink = promisify(adone.std.fs.unlink);  // we have rm, should we have this one?

export const unlinkSync = adone.std.fs.unlinkSync;

export const chmod = promisify(adone.std.fs.chmod);

export const rmdir = promisify(adone.std.fs.rmdir);

export const readdir = promisify(adone.std.fs.readdir);

export const createReadStream = adone.std.fs.createReadStream;

export const createWriteStream = adone.std.fs.createWriteStream;
