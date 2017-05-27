const { is, x, promise: { promisify } } = adone;

const fs = adone.lazify({
    readlink: () => promisify(adone.std.fs.readlink),
    unlink: () => promisify(adone.std.fs.unlink),  // we have rm, should we have this one?
    chmod: () => promisify(adone.std.fs.chmod),
    chown: () => promisify(adone.std.fs.chown),
    rmdir: () => promisify(adone.std.fs.rmdir),
    readdir: () => promisify(adone.std.fs.readdir),
    lstat: () => promisify(adone.std.fs.lstat),
    stat: () => promisify(adone.std.fs.stat),
    writeFile: () => promisify(adone.std.fs.writeFile),
    appendFile: () => promisify(adone.std.fs.appendFile),
    access: () => promisify(adone.std.fs.access),
    symlink: () => promisify(adone.std.fs.symlink),
    // realpath: () => promisify(adone.std.fs.realpath),
    rm: "./rm",
    File: "./file",
    Directory: "./directory",
    SymbolicLinkFile: "./symlink_file",
    SymbolicLinkDirectory: "./symlink_directory",
    RandomAccessFile: "./random_access_file",
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
    whichSync: ["./which", (mod) => mod.whichSync]
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
    chown: promisify(adone.std.fs.fchown),
    chmod: promisify(adone.std.fs.fchmod),

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

const ok = /^v[0-5]\./.test(process.version);

const newError = (err) => err && err.syscall === "realpath" && (err.code === "ELOOP" || err.code === "ENOMEM" || err.code === "ENAMETOOLONG");

let nextPartRe;
let splitRootRe;

// Regexp that finds the next partion of a (partial) path
// result is [base_with_slash, base], e.g. ['somedir/', 'somedir']
if (is.windows) {
    nextPartRe = /(.*?)(?:[\/\\]+|$)/g;
} else {
    nextPartRe = /(.*?)(?:[\/]+|$)/g;
}

// Regex to find the device root, including trailing slash. E.g. 'c:\\'.
if (is.windows) {
    splitRootRe = /^(?:[a-zA-Z]:|[\\\/]{2}[^\\\/]+[\\\/][^\\\/]+)?[\\\/]*/;
} else {
    splitRootRe = /^[\/]*/;
}

export const realpath = (p, cache) => {
    if (ok) {
        return new Promise((resolve, reject) => {
            adone.std.fs.realpath(p, cache, (err, resolvedPath) => {
                if (err) {
                    return reject(err);
                }
                resolve(resolvedPath);
            });
        });
    }

    return new Promise((resolve, reject) => {
        adone.std.fs.realpath(p, cache, (err, result) => {
            if (newError(err)) {
                // make p is absolute
                p = adone.std.path.resolve(p);

                if (cache && Object.prototype.hasOwnProperty.call(cache, p)) {
                    return process.nextTick(resolve, cache[p]);
                }

                const original = p;
                const seenLinks = {};
                const knownHard = {};

                // current character position in p
                let pos;
                // the partial path so far, including a trailing slash if any
                let current;
                // the partial path without a trailing slash (except when pointing at a root)
                let base;
                // the partial path scanned in the previous round, with slash
                let previous;

                let start = null;
                let loop = null;

                const gotResolvedLink = (resolvedLink) => {
                    // resolve the link, then start over
                    p = adone.std.path.resolve(resolvedLink, p.slice(pos));
                    start();
                };

                const gotTarget = (err, target, base) => {
                    if (err) {
                        return reject(err);
                    }

                    const resolvedLink = adone.std.path.resolve(previous, target);
                    if (cache) {
                        cache[base] = resolvedLink;
                    }
                    gotResolvedLink(resolvedLink);
                };

                const gotStat = (err, stat) => {
                    if (err) {
                        return reject(err);
                    }

                    // if not a symlink, skip to the next path part
                    if (!stat.isSymbolicLink()) {
                        knownHard[base] = true;
                        if (cache) {
                            cache[base] = base;
                        }
                        return process.nextTick(loop);
                    }

                    // stat & read the link if not read before
                    // call gotTarget as soon as the link target is known
                    // dev/ino always return 0 on windows, so skip the check.
                    let id = null;
                    if (!is.windows) {
                        id = `${stat.dev.toString(32)}:${stat.ino.toString(32)}`;
                        if (seenLinks.hasOwnProperty(id)) {
                            return gotTarget(null, seenLinks[id], base);
                        }
                    }
                    fs.stat(base, (err) => {
                        if (err) {
                            return reject(err);
                        }

                        fs.readlink(base, (err, target) => {
                            if (!is.windows) {
                                seenLinks[id] = target;
                            }
                            gotTarget(err, target);
                        });
                    });
                };

                // walk down the path, swapping out linked pathparts for their real values
                loop = () => {
                    // stop if scanned past end of path
                    if (pos >= p.length) {
                        if (cache) {
                            cache[original] = p;
                        }
                        return resolve(p);
                    }

                    // find the next part
                    nextPartRe.lastIndex = pos;
                    const result = nextPartRe.exec(p);
                    previous = current;
                    current += result[0];
                    base = previous + result[1];
                    pos = nextPartRe.lastIndex;

                    // continue if not a symlink
                    if (knownHard[base] || (cache && cache[base] === base)) {
                        return process.nextTick(loop);
                    }

                    if (cache && Object.prototype.hasOwnProperty.call(cache, base)) {
                        // known symbolic link.  no need to stat again.
                        return gotResolvedLink(cache[base]);
                    }

                    return fs.lstat(base, gotStat);
                };

                start = () => {
                    // Skip over roots
                    const m = splitRootRe.exec(p);
                    pos = m[0].length;
                    current = m[0];
                    base = m[0];
                    previous = "";

                    // On windows, check that the root exists. On unix there is no need.
                    if (is.windows && !knownHard[base]) {
                        fs.lstat(base, (err) => {
                            if (err) {
                                return reject(err);
                            }
                            knownHard[base] = true;
                            loop();
                        });
                    } else {
                        process.nextTick(loop);
                    }
                };

                start();
            } else {
                if (err) {
                    return reject(err);
                }
                resolve(result);
            }
        });
    });
};

export const realpathSync = (p, cache) => {
    if (ok) {
        return adone.std.fs.realpathSync(p, cache);
    }

    try {
        return adone.std.fs.realpathSync(p, cache);
    } catch (err) {
        if (newError(err)) {
            p = adone.std.path.resolve(p);

            if (cache && Object.prototype.hasOwnProperty.call(cache, p)) {
                return cache[p];
            }

            const original = p;
            const seenLinks = {};
            const knownHard = {};

            // current character position in p
            let pos;
            // the partial path so far, including a trailing slash if any
            let current;
            // the partial path without a trailing slash (except when pointing at a root)
            let base;
            // the partial path scanned in the previous round, with slash
            let previous;

            const start = () => {
                // Skip over roots
                const m = splitRootRe.exec(p);
                pos = m[0].length;
                current = m[0];
                base = m[0];
                previous = "";

                // On windows, check that the root exists. On unix there is no need.
                if (is.windows && !knownHard[base]) {
                    fs.lstatSync(base);
                    knownHard[base] = true;
                }
            };

            start();

            // walk down the path, swapping out linked pathparts for their real values
            // NB: p.length changes.
            while (pos < p.length) {
                // find the next part
                nextPartRe.lastIndex = pos;
                const result = nextPartRe.exec(p);
                previous = current;
                current += result[0];
                base = previous + result[1];
                pos = nextPartRe.lastIndex;

                // continue if not a symlink
                if (knownHard[base] || (cache && cache[base] === base)) {
                    continue;
                }

                let resolvedLink;
                if (cache && Object.prototype.hasOwnProperty.call(cache, base)) {
                    // some known symbolic link.  no need to stat again.
                    resolvedLink = cache[base];
                } else {
                    const stat = fs.lstatSync(base);
                    if (!stat.isSymbolicLink()) {
                        knownHard[base] = true;
                        if (cache) {
                            cache[base] = base;
                        }
                        continue;
                    }

                    // read the link if it wasn't read before
                    // dev/ino always return 0 on windows, so skip the check.
                    let linkTarget = null;
                    let id = null;
                    if (!is.windows) {
                        id = `${stat.dev.toString(32)}:${stat.ino.toString(32)}`;
                        if (seenLinks.hasOwnProperty(id)) {
                            linkTarget = seenLinks[id];
                        }
                    }
                    if (linkTarget === null) {
                        fs.statSync(base);
                        linkTarget = fs.readlinkSync(base);
                    }
                    resolvedLink = adone.std.path.resolve(previous, linkTarget);
                    // track this, if given a cache.
                    if (cache) {
                        cache[base] = resolvedLink;
                    }
                    if (!is.windows) {
                        seenLinks[id] = linkTarget;
                    }
                }

                // resolve the link, then start over
                p = adone.std.path.resolve(resolvedLink, p.slice(pos));
                start();
            }

            if (cache) {
                cache[original] = p;
            }

            return p;
        }
        throw err;

    }
};

export const lstatSync = adone.std.fs.lstatSync;
export const statSync = adone.std.fs.statSync;
export const writeFileSync = adone.std.fs.writeFileSync;
export const readdirSync = adone.std.fs.readdirSync;

export const readFile = async (filepath, { check = false, encoding = null } = {}) => {
    if (check) {
        if (!await adone.fs.is.file(filepath)) {
            return null;
        }
    }
    return new Promise((resolve, reject) => {
        return adone.std.fs.readFile(filepath, { encoding }, (err, data) => {
            if (err) {
                return reject(err);
            }
            resolve(data);
        });
    });
};

export const readFileSync = (filepath, { check = false, encoding = null } = {}) => {
    if (check) {
        if (!adone.fs.is.fileSync(filepath)) {
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

export const constants = adone.std.fs.constants;
export const accessSync = adone.std.fs.accessSync;

export const exists = (path) => adone.fs.access(path, constants.F_OK).then(() => true, (err) => {
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

    const cb = fn || (adone.noop);
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
        return Promise.all(path.map((x) => mkdir(x, mode))).then(adone.noop);
    }
    return new Promise((resolve, reject) => {
        mkdirp(path, mode, (err) => {
            err ? reject(err) : resolve();
        });
    });
};

export const copy = async (srcPath, dstPath, { recursively = true, ignoreExisting = false } = {}) => {
    const baseSrcPath = adone.util.globParent(srcPath);
    await fs.glob(srcPath).map(async (p) => {
        const relPath = adone.std.path.relative(baseSrcPath, p);
        const dstFilePath = adone.std.path.resolve(dstPath, relPath);
        if (ignoreExisting) {
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
        return adone.fs.writeFile(destFilePath, content);
    });
};

export const rename = (oldPath, newPath, { retries = 10, delay = 100 } = {}) => {
    return new Promise((resolve, reject) => {
        adone.std.fs.rename(oldPath, newPath, (err) => {
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

export const tail = async (path, n = 10, { separator = is.windows ? "\r\n" : "\n", chunkLength = 4096 } = {}) => {
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

export const unlinkSync = adone.std.fs.unlinkSync;
export const createReadStream = adone.std.fs.createReadStream;
export const createWriteStream = adone.std.fs.createWriteStream;

const TEMPLATE_PATTERN = /XXXXXX/;
const osTmpDir = adone.std.os.tmpdir();
export const tmpName = async ({ name = null, tries = 3, template = null, dir = osTmpDir, prefix = "tmp-", ext = "" } = {}) => {
    if (is.nan(tries) || tries < 0) {
        throw new Error("Invalid tries");
    }

    if (!is.null(template) && !template.match(TEMPLATE_PATTERN)) {
        throw new Error("Invalid template provided");
    }

    for (let i = 0; i < tries; i++) {
        if (!is.null(name)) {
            return adone.std.path.join(dir, name);
        }

        if (!is.null(template)) {
            return template.replace(TEMPLATE_PATTERN, adone.text.random(6));
        }

        const path = adone.std.path.join(dir, `${prefix}${process.pid}${adone.text.random(12)}${ext}`);

        try {
            await adone.fs.stat(path);
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
            path = adone.std.path.join(path, "index");
            st = await fs.stat(path);
            return path;
        }
    } catch (err) {
        for (const ext of adone.exts) {
            const newPath = `${path}${ext}`;
            if (await fs.exists(newPath)) {
                return `${path}${ext}`;
            }
        }
    }

    throw new adone.x.NotFound(path);
};
