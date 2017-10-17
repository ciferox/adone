// @ts-check

const {
    is,
    std,
    util,
    collection,
    x,
    lazify,
    noop,
    event,
    promise
} = adone;

const lazy = lazify({
    ReadStream: ["./streams", (mod) => mod.ReadStream],
    WriteStream: ["./streams", (mod) => mod.WriteStream]
}, null, require);

const constants = std.fs.constants;

const sep = std.path.sep;
const defaultRoot = std.path.resolve("/");
// if (is.windows && defaultRoot[0] === "" && defaultRoot[1] === "") {
//     // network resource on windows
//     defaultRoot = ["\\"].concat(defaultRoot.slice(2));
// }

export class Path {
    /**
     * @param {string} [path]
     */
    constructor(path, { root = defaultRoot } = {}) {
        if (!path) {
            // custom initialization
            return;
        }

        path = path.replace(/[\\/]/g, sep);

        /**
         * @type {string}
         */
        this.path = path;

        this.absolute = false;

        const c = path.charCodeAt(0);
        if (c === 47/*/*/ || c === 92/*\*/) {
            // absolute
            this.absolute = true;
            if (is.windows && path.charCodeAt(1) === 92) {
                // network resource
                this.root = "\\\\";
                if (path.length > 2) {
                    this.parts = path.slice(2).split("\\");
                } else {
                    this.parts = [];
                }
            } else {
                this.root = root;
                if (path.length > 1) {
                    this.parts = path.slice(1).split(sep);
                } else {
                    this.parts = [];
                }
            }
        } else if (is.windows && ((c >= 65/*A*/ && c <= 90/*Z*/) || (c >= 98/*a*/ && c <= 122/*z*/))) {
            const c = path.charCodeAt(1);
            if (c === 58) {
                // absolute, [A-Za-z]:[\\/]
                this.absolute = true;
                this.root = path.slice(0, 3);
                if (path.length > 3) {
                    this.parts = path.slice(3).split("\\");
                } else {
                    this.parts = [];
                }
            } else {
                // relative
                this.root = "";
                this.parts = path.split("\\");
            }
        } else {
            // relative
            this.root = "";
            if (path.length > 0) {
                this.parts = path.split(sep);
            } else {
                this.parts = [];
            }
        }
        this.trailingSlash = path[path.length - 1] === sep;

        /**
         * @type {string[]}
         */
        this.relativeParts = this.parts;

        this.stripLevel = 0;
    }

    mount(p) {
        const newPath = this.clone();
        for (const part of p.parts) {
            newPath.parts.push(part);
        }
        return newPath;
    }

    get fullPath() {
        return `${this.root}${this.parts.join(sep)}`;
    }

    get relativePath() {
        return `${this.root}${this.relativeParts.join(sep)}`;
    }

    clone() {
        const path = new Path();
        path.absolute = this.absolute;
        path.parts = this.parts.slice();
        path.relativeParts = this.relativeParts.slice();
        path.trailingSlash = this.trailingSlash;
        path.stripLevel = this.stripLevel;
        path.root = this.root;
        return path;
    }

    join(part) {
        const p = this.clone();
        p.parts.push(part);
        p.relativeParts.push(part);
        return p;
    }

    filename() {
        return this.parts[this.parts.length - 1];
    }

    static resolve(path) {
        if (path instanceof Path) {
            return path;
        }
        if (std.path.isAbsolute(path)) {
            return new Path(path);
        }
        return new Path(`${process.cwd()}${sep}${path}`);
    }

    static wrap(path) {
        if (path instanceof Path) {
            return path;
        }
        return new Path(path);
    }
}

class FSException extends Error {
    constructor(code, description, path, syscall, secondPath) {
        super();
        Object.defineProperties(this, {
            code: {
                value: code,
                enumerable: false
            },
            description: {
                value: description,
                enumerable: false
            },
            message: {
                enumerable: false,
                writable: true
            },
            _path: {
                value: path,
                enumerable: false,
                writable: true
            },
            _syscall: {
                value: syscall,
                enumerable: false,
                writable: true
            },
            _secondPath: {
                value: secondPath,
                enumerable: false,
                writable: true
            }
        });
        this._updateMessage();
    }

    get path() {
        return this._path;
    }

    set path(v) {
        this._path = v;
        this._updateMessage();
    }

    get secondPath() {
        return this._secondPath;
    }

    set secondPath(v) {
        this._secondPath = v;
        this._updateMessage();
    }

    get syscall() {
        return this._syscall;
    }

    set syscall(v) {
        this._syscall = v;
        this._updateMessage();
    }

    _updateMessage() {
        let message = `${this.code}: ${this.description}`;
        if (this._syscall) {
            message += `, ${this._syscall}`;
        }

        if (this._path) {
            if (!this._syscall) {
                message += ",";
            }
            message += ` '${this._path.fullPath}'`;
            if (this._secondPath) {
                message += ` -> '${this._secondPath.fullPath}'`;
            }
        }

        this.message = message;
    }

    /**
     * @param {Path} path
     */
    mount(path) {
        this.path = path.mount(this.path);
    }
}

// converts Date or number to a fractional UNIX timestamp
const toUnixTimestamp = (time) => {
    // eslint-disable-next-line eqeqeq
    if (is.string(time) && Number(time) == time) {
        return Number(time);
    }
    if (is.finite(time)) {
        if (time < 0) {
            return Date.now() / 1000;
        }
        return time;
    }
    if (is.date(time)) {
        // convert to 123.456 UNIX timestamp
        return time.getTime() / 1000;
    }
    throw new x.InvalidArgument(`cannot convert the given argument to a number: ${time}`);
};

const errors = {
    ENOENT: (path, syscall, secondPath) => new FSException("ENOENT", "no such file or directory", path, syscall, secondPath),
    EISDIR: (path, syscall, secondPath) => new FSException("EISDIR", "illegal operation on a directory", path, syscall, secondPath),
    ENOTDIR: (path, syscall, secondPath) => new FSException("ENOTDIR", "not a directory", path, syscall, secondPath),
    ELOOP: (path, syscall, secondPath) => new FSException("ELOOP", "too many symbolic links encountered", path, syscall, secondPath),
    EINVAL: (path, syscall, secondPath) => new FSException("EINVAL", "invalid argument", path, syscall, secondPath),
    EBADF: (syscall) => new FSException("EBADF", "bad file descriptor", undefined, syscall),
    EEXIST: (path, syscall, secondPath) => new FSException("EEXIST", "file already exists", path, syscall, secondPath),
    ENOTEMPTY: (path, syscall, secondPath) => new FSException("ENOTEMPTY", "directory not empty", path, syscall, secondPath),
    EACCES: (path, syscall, secondPath) => new FSException("EACCES", "permission denied", path, syscall, secondPath),
    EPERM: (path, syscall, secondPath) => new FSException("EPERM", "operation not permitted", path, syscall, secondPath),
    ENOSYS: (syscall) => new FSException("ENOSYS", "function not implemented", undefined, syscall)
};

const ENGINE = Symbol("ENGINE");
const LEVEL = Symbol("LEVEL");
const PARENT = Symbol("PARENT");

const methodsToMock = [
    "open",
    "close",
    "read",
    "write",
    "ftruncate",
    "truncate",
    "utimes",
    "unlink",
    "rmdir",
    "mkdir",
    "access",
    "chmod",
    "fchmod",
    "chown",
    "fchown",
    "copyFile",
    "rename",
    "symlink",
    "link",
    "fstat",
    "fsync",
    "fdatasync",
    "stat",
    "lstat",
    "readdir",
    "realpath",
    "readlink",
    "createReadStream",
    "createWriteStream",
    "writeFile",
    "appendFile",
    "readFile",
    "mkdtemp",
    "watchFile",
    "unwatchFile",
    "watch"
 ];

const syscallMap = {
    lstat: "lstat",
    stat: "stat",
    readdir: "scandir",
    readlink: "readlink",
    open: "open",
    close: "close",
    read: "read",
    fchmod: "fchmod",
    fchown: "fchown",
    fdatasync: "fdatasync",
    fstat: "fstat",
    fsync: "fsync",
    ftruncate: "ftruncate",
    futimes: "futime" // node throws futime
};

const emptyStats = () => {
    const s = new std.fs.Stats();
    s.dev = 0;
    s.mode = 0;
    s.nlink = 0;
    s.uid = 0;
    s.gid = 0;
    s.rdev = 0;
    s.blksize = is.windows ? undefined : 0;
    s.ino = 0;
    s.size = 0;
    s.blocks = is.windows ? undefined : 0;
    s.atimeMs = 0;
    s.mtimeMs = 0;
    s.ctimeMs = 0;
    s.birthtimeMs = 0;
    s.atime = new Date(0);
    s.mtime = new Date(0);
    s.ctime = new Date(0);
    s.birthtime = new Date(0);
    return s;
};

const writeAll = async (engine, fd, isUserFd, buffer, offset, length, position) => {
    let closing;
    try {
        const written = await engine.write(fd, buffer, offset, length, position);
        if (written === length) {
            if (isUserFd) {
                return;
            }
            closing = true;
            await engine.close(fd);
        } else {
            offset += written;
            length -= written;
            if (!is.null(position)) {
                position += written;
            }
            return writeAll(engine, fd, isUserFd, buffer, offset, length, position);
        }
    } catch (err) {
        if (isUserFd || closing) {
            throw err;
        }
        await engine.close(fd).catch(noop);
        throw err;
    }
};

const isFd = (path) => (path >>> 0) === path;

const kReadFileBufferLength = 8 * 1024;
const kMaxLength = adone.std.buffer.kMaxLength;

class ReadFileContext {
    constructor(engine, path, flags, encoding) {
        this.engine = engine;
        if (isFd(path)) {
            this.path = undefined;
            this.fd = path;
            this.isUserFd = true;
        } else {
            this.path = path;
            this.fd = undefined;
            this.isUserFd = false;
        }
        this.flags = flags;
        this.size = undefined;
        this.buffers = null;
        this.buffer = null;
        this.pos = 0;
        this.encoding = encoding;
        this.err = null;
    }

    process() {
        return this._open();
    }

    async _open() {
        if (!this.isUserFd) {
            this.fd = await this.engine.open(this.path, this.flags, 0o666);
        }
        const stat = await this.engine.fstat(this.fd);
        let size;
        if ((stat.mode & constants.S_IFMT) === constants.S_IFREG) {
            size = this.size = stat.size;
        } else {
            size = this.size = 0;
        }

        if (size === 0) {
            this.buffers = [];
            return this._read();
        }

        if (size > kMaxLength) {
            this.err = new RangeError(`File size is greater than possible Buffer: 0x${kMaxLength.toString(16)} bytes`);
            return this._close();
        }

        this.buffer = Buffer.allocUnsafeSlow(size);
        return this._read();
    }

    async _read() {
        let buffer;
        let offset;
        let length;

        if (this.size === 0) {
            buffer = this.buffer = Buffer.allocUnsafeSlow(kReadFileBufferLength);
            offset = 0;
            length = kReadFileBufferLength;
        } else {
            buffer = this.buffer;
            offset = this.pos;
            length = this.size - this.pos;
        }

        try {
            const bytesRead = await this.engine.read(this.fd, buffer, offset, length, null);

            if (bytesRead === 0) {
                return this._close();
            }

            this.pos += bytesRead;

            if (this.size !== 0) {
                if (this.pos === this.size) {
                    return this._close();
                }
                return this._read();

            }
            // unknown size, just read until we don't get bytes.
            this.buffers.push(this.buffer.slice(0, bytesRead));
            return this._read();
        } catch (err) {
            this.err = err;
            return this._close();
        }
    }

    async _close() {
        if (!this.isUserFd) {
            await this.engine.close(this.fd);
        }

        if (this.err) {
            throw this.err;
        }

        let buffer;

        if (this.size === 0) {
            buffer = Buffer.concat(this.buffers, this.pos);
        } else if (this.pos < this.size) {
            buffer = this.buffer.slice(0, this.pos);
        } else {
            buffer = this.buffer;
        }

        if (this.encoding) {
            buffer = buffer.toString(this.encoding);
        }

        return buffer;
    }
}

const statEqual = (prev, curr) => {
    return prev.dev === curr.dev
        && prev.ino === curr.ino
        && prev.uid === curr.uid
        && prev.gid === curr.gid
        && prev.mode === curr.mode
        && prev.size === curr.size
        && prev.birthtimeMs === curr.birthtimeMs
        && prev.ctimeMs === curr.ctimeMs
        && prev.mtimeMs === curr.mtimeMs;
};

class StatWatcher extends event.EventEmitter {
    constructor() {
        super();
        this.stopped = false;
    }

    async start(engine, filename, options) {
        const { interval, persistent } = options;

        // cache watchers?

        let prev = null;
        let enoent = false;

        for (; ;) {
            if (this.stopped) {
                break;
            }
            try {
                const newStats = await engine.stat(filename); // eslint-disable-line
                if (is.null(prev)) {
                    prev = newStats;
                } else if (!statEqual(prev, newStats)) {
                    enoent = false;
                    this.emit("change", prev, newStats);
                    prev = newStats;
                }
            } catch (err) {
                if (err.code === "ENOENT") {
                    if (!enoent) {
                        if (is.null(prev)) {
                            prev = emptyStats();
                        }
                        const newStats = emptyStats();
                        this.emit("change", prev, newStats);
                        enoent = true;
                        prev = newStats;
                    }
                }
            }
            await promise.delay(interval, { unref: !persistent }); // eslint-disable-line
        }
    }

    stop() {
        this.stopped = true;
    }
}

class FSWatcher extends event.EventEmitter {
    constructor() {
        super();
        this.engine = false;
        this.watcher = null;
        this.mountPath = null;
        this.closed = false;
    }

    setWatcher(watcher) {
        if (this.closed) { // it can be closed before we set the watcher instance
            watcher.close();
            return;
        }
        this.watcher = watcher;
        this.watcher.on("change", (event, filename) => {
            this.emit("change", event, filename);
        });
    }

    close() {
        this.closed = true;
        if (this.watcher) {
            this.watcher.close();
        }
    }
}

// nodejs callbacks support
const callbackify = (target, key, descriptor) => {
    descriptor.value = adone.promise.callbackify(descriptor.value);
};

/**
 * Represents an abstact fs engine, most of the methods must be implemented in derived classes
 */
export class AbstractEngine {
    constructor() {
        this.structure = {};
        this._numberOfEngines = 0;
        this._fd = 100; // generally, no matter which initial value we use, this is a fd counter for internal mappings
        this._fdMap = new collection.MapCache();
        this._fileWatchers = new collection.MapCache();
        this._initialized = false;
        this._initializing = false;
        this._uninitializing = false;
        this._uninitialized = false;
        this.mount(this, "/");
    }

    /**
     * Starts the initialization process of the mounted engines and itself
     */
    async initialize() {
        if (this._initialized || this._initializing) {
            return;
        }
        this._initializing = true;

        const visit = async (obj) => {
            for (const engine of Object.values(obj)) {
                await engine.initialize();
            }
        };
        await visit(this.structure);

        await this._initialize();

        this._initializing = false;
        this._initialized = true;
    }

    _initialize() {
        // by default does nothing
    }

    /**
     * Starts the uninitialization process of the mounted engines and itself
     */
    async uninitialize() {
        if (this._uninitialized || this._uninitializing) {
            return;
        }
        this._uninitializing = true;

        const visit = async (obj) => {
            for (const engine of Object.values(obj)) {
                await engine.uninitialize();
            }
        };
        await visit(this.structure);

        await this._uninitialize();

        this._uninitializing = false;
        this._uninitialized = true;
    }

    _uninitialize() {
        // by default does nothing
    }

    createError(code, path, syscall, secondPath) {
        return errors[code](path, syscall, secondPath);
    }

    throw(code, path, syscall, secondPath) {
        throw this.createError(code, path, syscall, secondPath);
    }

    @callbackify
    async open(path, flags, mode = 0o666) {
        return this._handlePath("open", Path.resolve(path), [flags, mode]);
    }

    _open() {
        this.throw("ENOSYS", "open");
    }

    @callbackify
    async close(fd) {
        return this._handleFd("close", fd, []);
    }

    _close() {
        this.throw("ENOSYS", "close");
    }

    @callbackify
    async read(fd, buffer, offset, length, position) {
        return this._handleFd("read", fd, [buffer, offset, length, position]);
    }

    _read() {
        this.throw("ENOSYS", "read");
    }

    @callbackify
    //  write(fd, buffer[, offset[, length[, position]]]);
    //  write(fd, string[, position[, encoding]]);
    async write(fd, buffer, offset, length, position) {
        if (is.buffer(buffer)) {
            if (!is.number(offset)) {
                offset = 0;
            }
            if (!is.number(length)) {
                length = buffer.length - offset;
            }
            if (!is.number(position) || position < 0) {
                position = null;
            }
            return this._handleFd("write", fd, [buffer, offset, length, position]);
        }
        if (!is.string(buffer)) {
            buffer = String(buffer);
        }
        if (!is.number(offset)) {
            offset = null;
        }
        if (!is.string(length)) {
            length = "utf8";
        }
        return this._handleFd("write", fd, [buffer, offset, length]);
    }

    _write() {
        this.throw("ENOSYS", "write");
    }

    @callbackify
    async ftruncate(fd, length = 0) {
        return this._handleFd("ftruncate", fd, [length]);
    }

    _ftruncate() {
        this.throw("ENOSYS", "ftruncate");
    }

    @callbackify
    async truncate(path, length = 0) {
        if (is.number(path)) {
            return this.ftruncate(path, length);
        }
        const fd = await this.open(path, "r+");
        try {
            await this.ftruncate(fd, length);
        } finally {
            await this.close(fd);
        }
    }

    _truncate() {
        this.throw("ENOSYS", "truncate");
    }

    @callbackify
    async utimes(path, atime, mtime) {
        return this._handlePath("utimes", Path.resolve(path), [
            toUnixTimestamp(atime),
            toUnixTimestamp(mtime)
        ]);
    }

    _utimes() {
        this.throw("ENOSYS", "utimes");
    }

    @callbackify
    async futimes(fd, atime, mtime) {
        return this._handleFd("futimes", fd, [atime, mtime]);
    }

    _futimes() {
        this.throw("ENOSYS", "futimes");
    }

    @callbackify
    async unlink(path) {
        return this._handlePath("unlink", Path.resolve(path), []);
    }

    _unlink() {
        this.throw("ENOSYS", "unlink");
    }

    @callbackify
    async rmdir(path) {
        return this._handlePath("rmdir", Path.resolve(path), []);
    }

    _rmdir() {
        this.throw("ENOSYS", "unlink");
    }

    @callbackify
    async mkdir(path, mode = 0o775) {
        return this._handlePath("mkdir", Path.resolve(path), [mode]);
    }

    _mkdir() {
        this.throw("ENOSYS", "mkdir");
    }

    @callbackify
    async access(path, mode = constants.F_OK) {
        return this._handlePath("access", Path.resolve(path), [mode]);
    }

    _access() {
        this.throw("ENOSYS", "access");
    }

    @callbackify
    async chmod(path, mode) {
        return this._handlePath("chmod", Path.resolve(path), [mode]);
    }

    _chmod() {
        this.throw("ENOSYS", "chmod");
    }

    @callbackify
    async fchmod(fd, mode) {
        return this._handleFd("fchmod", fd, [mode]);
    }

    _fchmod() {
        this.throw("ENOSYS", "fchmod");
    }

    @callbackify
    async chown(path, uid, gid) {
        return this._handlePath("chown", Path.resolve(path), [uid, gid]);
    }

    _chown() {
        this.throw("ENOSYS", "chown");
    }

    @callbackify
    async fchown(fd, uid, gid) {
        return this._handleFd("fchown", fd, [uid, gid]);
    }

    _fchown() {
        this.throw("ENOSYS", "fchown");
    }

    @callbackify
    async copyFile(rawSrc, rawDest, flags = 0) {
        const src = Path.resolve(rawSrc);
        const dest = Path.resolve(rawDest);

        if (this._numberOfEngines === 1) {
            // only one engine can handle it, itself
            return this._copyFile(src, dest, flags).catch((err) => {
                if (err instanceof FSException) {
                    err.path = src;
                    err.secondPath = dest;
                }
                return Promise.reject(err);
            });
        }

        const [
            [engine1, node1, parts1],
            [engine2, node2, parts2]
        ] = await Promise.all([
            this._chooseEngine(src, "copyfile").catch((err) => {
                if (err instanceof FSException) {
                    err.path = src;
                    err.secondPath = dest;
                }
                return Promise.reject(err);
            }),
            this._chooseEngine(dest, "copyfile").catch((err) => {
                if (err instanceof FSException) {
                    err.path = src;
                    err.secondPath = dest;
                }
                return Promise.reject(err);
            })
        ]);

        const src2 = new Path(`/${parts1.slice(node1[LEVEL]).join("/")}`);
        const dest2 = new Path(`/${parts2.slice(node2[LEVEL]).join("/")}`);

        // efficient
        if (engine1 === engine2) {
            return engine1.copyFile(src2, dest2).catch((err) => {
                if (err instanceof FSException) {
                    err.path = src;
                    err.secondPath = dest;
                }
                return Promise.reject(err);
            });
        }

        // cross engine copying...
        // not so efficient...any other way?
        // stream one file to another

        if (flags === constants.COPYFILE_EXECL) {
            // have to throw if the dest exists
            const destStat = await engine2.lstat(dest2).catch((err) => {
                if (err.code === "ENOENT") { // does not exist
                    return null;
                }
                return err; // does it mean that the file exists?
            });
            if (destStat) {
                this.throw("EEXIST", src, "copyfile", dest);
            }
        }

        const srcStream = engine1.createReadStream(src2);
        const destStream = engine2.createWriteStream(dest2);
        const err = await new Promise((resolve) => {
            let err;

            srcStream.once("error", (_err) => {
                if (err) {
                    return; // the destroying has started
                }
                err = _err;
                srcStream.destroy();
                destStream.end();
            });

            destStream.once("error", (_err) => {
                if (err) {
                    return; // the destroying has started
                }
                err = _err;
                srcStream.destroy();
                destStream.end();
            });

            destStream.once("close", () => {
                resolve(err);
            });

            srcStream.pipe(destStream);
        });

        if (err) {
            // try to remove the dest if an error was thrown
            await engine2.unlink(dest2).catch(noop);
            if (err instanceof FSException) {
                err.path = src;
                err.secondPath = dest;
            }
            throw err;
        }
    }

    async _copyFile() {
        this.throw("ENOSYS", "rename"); // fallback to copy via streams?
    }

    @callbackify
    async rename(rawOldPath, rawNewPath) {
        const oldPath = Path.resolve(rawOldPath);
        const newPath = Path.resolve(rawNewPath);

        if (this._numberOfEngines === 1) {
            // only one engine can handle it, itself
            return this._rename(oldPath, newPath).catch((err) => {
                if (err instanceof FSException) {
                    err.path = oldPath;
                    err.secondPath = newPath;
                }
                return Promise.reject(err);
            });
        }
        const [engine1, node1, parts1] = await this._chooseEngine(oldPath, "rename");
        const [engine2, node2, parts2] = await this._chooseEngine(newPath, "rename");

        const oldPath2 = new Path(`/${parts1.slice(node1[LEVEL]).join("/")}`);
        const newPath2 = new Path(`/${parts2.slice(node2[LEVEL]).join("/")}`);

        if (engine1 === engine2) {
            return engine1.rename(oldPath2, newPath2).catch((err) => {
                if (err instanceof FSException) {
                    err.path = oldPath;
                    err.secondPath = newPath;
                }
                return Promise.reject(err);
            });
        }
        // TODO: copy from one location to another and then delete the source?
        throw new x.NotSupported("for now cross engine renamings are not supported");
    }

    async _rename() {
        this.throw("ENOSYS", "rename");
    }

    @callbackify
    async symlink(target, path, type) {
        // omg, here we have to swap them...
        return this._handlePath("symlink", Path.resolve(path), [new Path(target), type]);
    }

    _symlink() {
        this.throw("ENOSYS", "symlink");
    }

    @callbackify
    async link(rawExistingPath, rawNewPath) {
        const existingPath = Path.resolve(rawExistingPath);
        const newPath = Path.resolve(rawNewPath);

        if (this._numberOfEngines === 1) {
            // only one engine can handle it, itself
            return this._link(existingPath, newPath).catch((err) => {
                if (err instanceof FSException) {
                    err.path = existingPath;
                    err.secondPath = newPath;
                }
                return Promise.reject(err);
            });
        }
        const [engine1, node1, parts1] = await this._chooseEngine(existingPath, "rename");
        const [engine2, node2, parts2] = await this._chooseEngine(newPath, "rename");

        const existingPath2 = new Path(`/${parts1.slice(node1[LEVEL]).join("/")}`);
        const newPath2 = new Path(`/${parts2.slice(node2[LEVEL]).join("/")}`);

        if (engine1 === engine2) {
            return engine1.link(existingPath2, newPath2).catch((err) => {
                if (err instanceof FSException) {
                    err.path = existingPath;
                    err.secondPath = newPath;
                }
                return Promise.reject(err);
            });
        }
        throw new x.NotSupported("Cross engine hark links are not supported");
    }

    async _link() {
        this.throw("ENOSYS", "link");
    }

    @callbackify
    async fstat(fd) {
        return this._handleFd("fstat", fd);
    }

    _fstat() {
        this.throw("ENOSYS", "fstat");
    }

    @callbackify
    async fsync(fd) {
        return this._handleFd("fsync", fd);
    }

    _fsync() {
        this.throw("ENOSYS", "fsync");
    }

    @callbackify
    async fdatasync(fd) {
        return this._handleFd("fdatasync", fd);
    }

    _fdatasync() {
        this.throw("ENOSYS", "fdatasync");
    }

    @callbackify
    async stat(path) {
        return this._handlePath("stat", Path.resolve(path), []);
    }

    _stat() {
        this.throw("ENOSYS", "stat");
    }

    @callbackify
    async lstat(path) {
        return this._handlePath("lstat", Path.resolve(path), []);
    }

    _lstat() {
        this.throw("ENOSYS", "lstat");
    }

    @callbackify
    async readdir(rawPath, options) {
        if (!is.object(options)) {
            options = { encoding: options };
        }

        options.encoding = options.encoding || "utf8";

        const path = Path.resolve(rawPath);

        return this._handlePath("readdir", path, [options]);
    }

    async _readdir(path) {
        const siblings = this._getSiblingMounts(path);
        if (!siblings) {
            this.throw("ENOENT", path, "scandir");
        }
        // entries must be added inside _handlePath as siblings, hm...
        return [];
    }

    @callbackify
    async realpath(path, options) {
        if (!is.object(options)) {
            options = { encoding: options };
        }
        options.encoding = options.encoding || "utf8";

        return this._handlePath("realpath", Path.resolve(path), [options]);
    }

    async _realpath() {
        this.throw("ENOSYS", "realpath"); // or a common implementation?
    }

    @callbackify
    async readlink(path, options) {
        if (!is.object(options)) {
            options = { encoding: options };
        }
        options.encoding = options.encoding || "utf8";

        return this._handlePath("readlink", Path.resolve(path), [options]);
    }

    _readlink() {
        return this.throw("ENOSYS", "readlink");
    }

    createReadStream(path, options) {
        return new lazy.ReadStream(this, path, options);
    }

    createWriteStream(path, options) {
        return new lazy.WriteStream(this, path, options);
    }

    @callbackify
    async writeFile(path, data, options = {}) {
        if (!is.object(options)) {
            options = { encoding: options };
        } else {
            options = { ...options };
        }
        options.encoding = options.encoding || "utf8";
        options.mode = options.mode || 0o666;
        options.flag = options.flag || "w";

        const writeFd = (fd, isUserFd) => {
            const buffer = is.uint8Array(data)
                ? data
                : Buffer.from(String(data), options.encoding);

            const position = /a/.test(options.flag)
                ? null
                : 0;

            return writeAll(this, fd, isUserFd, buffer, 0, buffer.length, position);
        };

        if (isFd(path)) {
            return writeFd(path, true);
        }

        const fd = await this.open(path, options.flag, options.mode);
        return writeFd(fd, false);
    }

    @callbackify
    async appendFile(path, data, options = {}) {
        if (!is.object(options)) {
            options = { encoding: options };
        } else {
            options = { ...options };
        }
        options.encoding = options.encoding || "utf8";
        options.mode = options.mode || 0o666;
        options.flag = options.flag || "a";

        // force append behavior when using a supplied file descriptor
        if (!options.flag || isFd(path)) {
            options.flag = "a";
        }

        return this.writeFile(path, data, options);
    }

    @callbackify
    async readFile(path, options) {
        if (!is.object(options)) {
            options = { encoding: options };
        }
        options.flag = options.flag || "r";
        options.encoding = options.encoding || null;

        const context = new ReadFileContext(this, path, options.flag, options.encoding);
        return context.process();
    }

    @callbackify
    async mkdtemp(prefix, options = {}) {
        if (!is.object(options)) {
            options = { encoding: options };
        }
        options.encoding = options.encoding || "utf8";
        return this._handlePath("mkdtemp", prefix, [options]);
    }

    _mkdtemp() {
        this.throw("ENOSYS", "mkdtemp");
    }

    watchFile(filename, options = {}, listener) {
        if (is.function(options)) {
            [options, listener] = [{}, options];
        }
        options.persistent = "persistent" in options ? Boolean(options.persistent) : true;
        options.interval = options.interval || 5007;

        const watcher = new StatWatcher();

        watcher.on("change", listener);

        this._fileWatchers.set(filename, watcher); // different options?

        watcher.start(this, filename, options).catch(noop); // actually it should not throw

        return watcher;
    }

    unwatchFile(filename, listener) {
        if (!this._fileWatchers.has(filename)) {
            return;
        }
        const watcher = this._fileWatchers.get(filename);
        if (listener) {
            watcher.removeListener("change", listener);
        } else {
            watcher.stop();
            this._fileWatchers.delete(filename);
        }
    }

    watch(filename, options = {}, listener) {
        if (is.function(options)) {
            [options, listener] = [{}, options];
        }
        if (is.string(options)) {
            options = { encoding: options };
        }
        options.encoding = options.encoding || "utf8";
        options.persistent = "persistent" in options ? Boolean(options.persistent) : true;
        options.recursive = Boolean(options.recursive);

        const watcher = new FSWatcher();

        if (listener) {
            watcher.on("change", listener);
        }

        this._handlePath("watch", Path.resolve(filename), [options, listener, watcher]).catch((err) => {
            watcher.emit("error", err);
        });

        return watcher;
    }

    _watch(filename, options, listener, watcher) {
        watcher.emit("error", this.createError("ENOSYS", filename, "watch"));
    }

    async _handleFd(method, mappedFd, args = []) {
        if (!this._fdMap.has(mappedFd)) {
            this.throw("EBADF", syscallMap[method]);
        }
        const { fd, engine } = this._fdMap.get(mappedFd);
        const res = await engine === this
            ? engine[`_${method}`](fd, ...args)
            : engine[method](fd, ...args);
        if (method === "close") {
            // fd has been closed, we can delete the key
            this._fdMap.delete(mappedFd);
        }
        return res;
    }

    _storeFd(fd, engine) {
        const mapped = this._fd++;
        this._fdMap.set(mapped, { fd, engine });
        return mapped;
    }

    async _chooseEngine(path, method, secondPath) {
        let parts = path.parts.slice();

        // resolve .. that can refer to different engines,
        // but we do not handle cases where symlinks can refer to different engines
        // as i understand if we want to handle it we must stat each part of each path - huge overhead?

        chooseEngine: for (; ;) {
            let node = this.structure[path.root];

            let i;
            for (i = 0; i < parts.length; ++i) {
                const part = parts[i];
                switch (part) {
                    case "":
                    case ".": {
                        parts.splice(i, 1);
                        --i;
                        continue;
                    }
                    case "..": {
                        const parent = node[PARENT];
                        if (node === parent) {
                            parts.splice(i, 1);
                            --i;
                        } else {
                            node = parent;
                            parts.splice(i - 1, 2);
                            i -= 2;
                        }
                        continue;
                    }
                }
                if (!(part in node)) {
                    break;
                }
                node = node[part];
            }
            const engine = node[ENGINE];

            for (let j = i + 1; j < parts.length; ++j) {
                switch (parts[j]) {
                    case "":
                    case ".": {
                        const subPath = `/${parts.slice(i, j).join("/")}`;
                        let stat;
                        try {
                            stat = await engine.stat(subPath); // eslint-disable-line
                        } catch (err) {
                            if (err instanceof FSException) {
                                err.path = path;
                                if (secondPath) {
                                    err.secondPath = secondPath;
                                }
                                err.syscall = syscallMap[method];
                            }
                            throw err;
                        }
                        if (!stat.isDirectory()) {
                            this.throw("ENOTDIR", path, syscallMap[method], secondPath);
                        }
                        parts.splice(j, 1);
                        --j;
                        break;
                    }
                    case "..": {
                        const subPath = `/${parts.slice(i, j).join("/")}`;
                        try {
                            const stat = await engine.stat(subPath); // eslint-disable-line
                            if (stat.isFile()) {
                                // this is a file, but the pattern is "subPath/.." which is applicable only for directories
                                this.throw("ENOTDIR", path, syscallMap[method], secondPath);
                            }
                            const target = await engine.readlink(subPath); // eslint-disable-line

                            // it subPath is not a symlink, readlink will throw EINVAL
                            // so here we have a symlink to a directory

                            const targetPath = new Path(target);

                            if (targetPath.absolute) {
                                // assume all absolute links to be relative to the using engine
                                parts = parts.slice(0, i).concat(targetPath.parts).concat(parts.slice(j)); // do not cut ".."
                                j = i + 1;
                            } else {
                                parts = parts.slice(0, j - 1).concat(targetPath.parts).concat(parts.slice(j)); // also do not cut ".."
                                j -= 2;
                            }
                        } catch (err) {
                            switch (err.code) {
                                case "ENOENT": {
                                    this.throw("ENOENT", path, syscallMap[method], secondPath);
                                    break;
                                }
                                case "ENOTDIR": {
                                    this.throw("ENOTDIR", path, syscallMap[method], secondPath);
                                    break;
                                }
                                case "EINVAL": {
                                    // the previous part is not a symlink to a directory
                                    parts = parts.slice(0, j - 1).concat(parts.slice(j + 1));
                                    j -= 2;
                                    break;
                                }
                                default: {
                                    throw err;
                                }
                            }
                        }
                        break;
                    }
                }
                if (j < i) {
                    // moving to another engine
                    continue chooseEngine;
                }
            }
            if (parts.length >= i) {
                return [engine, node, parts];
            }
        }
    }

    _handleError(err, method, path, args) {
        if (err instanceof FSException) {
            switch (method) {
                case "link": {
                    err.path = path;
                    err.secondPath = args[0];
                    break;
                }
                default: {
                    err.path = path;
                }
            }
        }
        return Promise.reject(err);
    }

    /**
     * @param {string} method
     * @param {string} rawPath
     * @param {any[]} args
     */
    async _handlePath(method, path, args) {
        if (this._numberOfEngines === 1) {
            // only one engine can handle it, itself
            let p = this[`_${method}`](path, ...args);
            if (method === "open") {
                // store fd
                p = p.then((fd) => this._storeFd(fd, this), (err) => this._handleError(err, method, path, args));
            }
            return p;
        }

        const [engine, node, parts] = await this._chooseEngine(path, method);

        let p;
        const level = node[LEVEL];
        const newPath = new Path(`/${parts.slice(level).join("/")}`);
        if (engine === this) {
            p = new Promise((resolve) => resolve(engine[`_${method}`](newPath, ...args)));
        } else {
            p = new Promise((resolve) => resolve(engine[method](newPath, ...args)));
        }

        switch (method) {
            case "readdir": {
                if (level === 0) {
                    const [options] = args;
                    p = p.then((files) => { // eslint-disable-line
                        const siblings = this._getSiblingMounts(newPath);
                        if (!siblings) {
                            return files;
                        }
                        if (options.encoding === "buffer") {
                            return util.unique(files.concat(siblings.map((x) => Buffer.from(x))), (x) => x.toString());
                        }
                        return files.concat(siblings);
                    });
                }
                break;
            }
            case "open": {
                /**
                 * this method returns a file descriptor
                 * we must remember which engine returned it to perform reverse substitutions
                 */
                p = p.then((fd) => this._storeFd(fd, engine));
                break;
            }
        }

        return p.catch((err) => this._handleError(err, method, path, args));
    }

    _getSiblingMounts(path) {
        let node = this.structure[path.root];
        for (const part of path.parts) {
            switch (part) {
                case "":
                case ".": {
                    continue;
                }
                case "..": {
                    node = node[PARENT];
                    continue;
                }
            }
            if (!(part in node)) {
                node = null;
                break;
            }
            node = node[part];
        }
        if (node) {
            return Object.keys(node).sort();
        }
        return null;
    }

    /**
     * @param {AbstractEngine} engine
     * @param {string} rawPath
     */
    mount(engine, rawPath) {
        const path = new Path(rawPath);

        if (!(path.root in this.structure)) {
            this.structure[path.root] = {
                [LEVEL]: 0
            };
            this.structure[path.root][PARENT] = this.structure[path.root];
        }

        let root = this.structure[path.root];
        let level = 0;
        for (const part of path.parts) {
            if (!(part in root)) {
                root[part] = {
                    [LEVEL]: root[LEVEL],
                    [PARENT]: root,
                    [ENGINE]: root[ENGINE]
                };
            }
            root = root[part];
            ++level;
        }
        root[LEVEL] = level;
        root[ENGINE] = engine;
        ++this._numberOfEngines;
        return this;
    }

    mock(obj) {
        const origMethods = {};
        for (const method of methodsToMock) {
            origMethods[method] = obj[method];
            obj[method] = (...args) => this[method](...args);
        }
        obj.restore = () => {
            for (const method of methodsToMock) {
                obj[method] = origMethods[method];
            }
            delete obj.restore;
        };
        return obj;
    }
}

AbstractEngine.prototype.constants = constants; // provide the same constants
AbstractEngine.constants = constants;
