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

const {
    Path
} = adone.fs.engine;

const constants = std.fs.constants;

const sep = std.path.sep;
const defaultRoot = std.path.resolve("/");
// if (is.windows && defaultRoot[0] === "" && defaultRoot[1] === "") {
//     // network resource on windows
//     defaultRoot = ["\\"].concat(defaultRoot.slice(2));
// }

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

const tryReadSync = (engine, fd, isUserFd, buffer, pos, len) => {
    let threw = true;
    let bytesRead;
    try {
        bytesRead = engine.readSync(fd, buffer, pos, len);
        threw = false;
    } finally {
        if (threw && !isUserFd) {
            engine.closeSync(fd);
        }
    }
    return bytesRead;
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
    "openSync",
    "close",
    "closeSync",
    "read",
    "readSync",
    "write",
    "writeSync",
    "ftruncate",
    "ftruncateSync",
    "truncate",
    "truncateSync",
    "utimes",
    "utimesSync",
    "unlink",
    "unlinkSync",
    "rmdir",
    "rmdirSync",
    "mkdir",
    "mkdirSync",
    "access",
    "accessSync",
    "chmod",
    "chmodSync",
    "fchmod",
    "fchmodSync",
    "chown",
    "chownSync",
    "fchown",
    "fchownSync",
    "copyFile",
    "copyFileSync",
    "rename",
    "renameSync",
    "symlink",
    "symlinkSync",
    "link",
    "linkSync",
    "fstat",
    "fstatSync",
    "fsync",
    "fsyncSync",
    "fdatasync",
    "fdatasyncSync",
    "stat",
    "statSync",
    "lstat",
    "lstatSync",
    "readdir",
    "readdirSync",
    "realpath",
    "realpathSync",
    "readlink",
    "readlinkSync",
    "createReadStream",
    "createWriteStream",
    "writeFile",
    "writeFileSync",
    "appendFile",
    "appendFileSync",
    "readFile",
    "readFileSync",
    "mkdtemp",
    "mkdtempSync",
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

class StatWatcher extends event.Emitter {
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

class FSWatcher extends event.Emitter {
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
    constructor({ root = "/", sep = "/" } = {}) {
        this.structure = {
            [ENGINE]: this,
            [PARENT]: this,
            [LEVEL]: 0
        };
        this._numberOfMountedEngines = 0;
        this._fd = 100; // generally, no matter which initial value we use, this is a fd counter for internal mappings
        this._fdMap = new collection.MapCache();
        this._fileWatchers = new collection.MapCache();
        this._initialized = false;
        this._initializing = false;
        this._uninitializing = false;
        this._uninitialized = false;
        this.root = root;
        this.sep = sep;
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
            for (const v of Object.values(obj)) {
                if (v instanceof AbstractEngine) {
                    await v.initialize();
                } else {
                    await visit(v);
                }
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
            for (const v of Object.values(obj)) {
                if (v instanceof AbstractEngine) {
                    await v.initialize();
                } else {
                    await visit(v);
                }
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

    _resolve(path) {
        return Path.resolve(path, { root: this.root, sep: this.sep });
    }

    @callbackify
    async open(path, flags, mode = 0o666) {
        return this._handlePath("open", this._resolve(path), [flags, mode]);
    }

    _open() {
        this.throw("ENOSYS", "open");
    }

    openSync(path, flags, mode = 0o666) {
        return this._handlePathSync("open", this._resolve(path), [flags, mode]);
    }

    _openSync() {
        this.throw("ENOSYS", "open");
    }

    @callbackify
    async close(fd) {
        return this._handleFd("close", fd, []);
    }

    _close() {
        this.throw("ENOSYS", "close");
    }

    closeSync(fd) {
        return this._handleFdSync("close", fd, []);
    }

    _closeSync() {
        this.throw("ENOSYS", "close");
    }

    @callbackify
    async read(fd, buffer, offset, length, position) {
        return this._handleFd("read", fd, [buffer, offset, length, position]);
    }

    _read() {
        this.throw("ENOSYS", "read");
    }

    readSync(fd, buffer, offset, length, position) {
        return this._handleFdSync("read", fd, [buffer, offset, length, position]);
    }

    _readSync() {
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

    writeSync(fd, buffer, offset, length, position) {
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
            return this._handleFdSync("write", fd, [buffer, offset, length, position]);
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
        return this._handleFdSync("write", fd, [buffer, offset, length]);
    }

    _writeSync() {
        this.throw("ENOSYS", "write");
    }

    @callbackify
    async ftruncate(fd, length = 0) {
        return this._handleFd("ftruncate", fd, [length]);
    }

    _ftruncate() {
        this.throw("ENOSYS", "ftruncate");
    }

    ftruncateSync(fd, length = 0) {
        return this._handleFdSync("ftruncate", fd, [length]);
    }

    _ftruncateSync() {
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

    truncateSync(path, length = 0) {
        if (is.number(path)) {
            return this.ftruncate(path, length);
        }
        const fd = this.openSync(path, "r+");
        try {
            this.ftruncateSync(fd, length);
        } finally {
            this.closeSync(fd);
        }
    }

    @callbackify
    async utimes(path, atime, mtime) {
        return this._handlePath("utimes", this._resolve(path), [
            toUnixTimestamp(atime),
            toUnixTimestamp(mtime)
        ]);
    }

    _utimes() {
        this.throw("ENOSYS", "utimes");
    }

    utimesSync(path, atime, mtime) {
        return this._handlePathSync("utimes", this._resolve(path), [
            toUnixTimestamp(atime),
            toUnixTimestamp(mtime)
        ]);
    }

    _utimesSync() {
        this.throw("ENOSYS", "utimes");
    }

    @callbackify
    async futimes(fd, atime, mtime) {
        return this._handleFd("futimes", fd, [
            toUnixTimestamp(atime),
            toUnixTimestamp(mtime)
        ]);
    }

    _futimes() {
        this.throw("ENOSYS", "futimes");
    }

    futimesSync(fd, atime, mtime) {
        return this._handleFdSync("futimes", fd, [
            toUnixTimestamp(atime),
            toUnixTimestamp(mtime)
        ]);
    }

    _futimesSync() {
        this.throw("ENOSYS", "futimes");
    }

    @callbackify
    async unlink(path) {
        return this._handlePath("unlink", this._resolve(path), []);
    }

    _unlink() {
        this.throw("ENOSYS", "unlink");
    }

    unlinkSync(path) {
        return this._handlePathSync("unlink", this._resolve(path), []);
    }

    _unlinkSync() {
        this.throw("ENOSYS", "unlink");
    }

    @callbackify
    async rmdir(path) {
        return this._handlePath("rmdir", this._resolve(path), []);
    }

    _rmdir() {
        this.throw("ENOSYS", "unlink");
    }

    rmdirSync(path) {
        return this._handlePathSync("rmdir", this._resolve(path), []);
    }

    _rmdirSync() {
        this.throw("ENOSYS", "rmdir");
    }

    @callbackify
    async mkdir(path, mode = 0o775) {
        return this._handlePath("mkdir", this._resolve(path), [mode]);
    }

    _mkdir() {
        this.throw("ENOSYS", "mkdir");
    }

    mkdirSync(path, mode = 0o775) {
        return this._handlePathSync("mkdir", this._resolve(path), [mode]);
    }

    _mkdirSync() {
        this.throw("ENOSYS", "mkdir");
    }

    @callbackify
    async access(path, mode = constants.F_OK) {
        return this._handlePath("access", this._resolve(path), [mode]);
    }

    _access() {
        this.throw("ENOSYS", "access");
    }

    accessSync(path, mode = constants.F_OK) {
        return this._handlePathSync("access", this._resolve(path), [mode]);
    }

    _accessSync() {
        this.throw("ENOSYS", "access");
    }

    @callbackify
    async chmod(path, mode) {
        return this._handlePath("chmod", this._resolve(path), [mode]);
    }

    _chmod() {
        this.throw("ENOSYS", "chmod");
    }

    chmodSync(path, mode) {
        return this._handlePathSync("chmod", this._resolve(path), [mode]);
    }

    _chmodSync() {
        this.throw("ENOSYS", "chmod");
    }

    @callbackify
    async fchmod(fd, mode) {
        return this._handleFd("fchmod", fd, [mode]);
    }

    _fchmod() {
        this.throw("ENOSYS", "fchmod");
    }

    fchmodSync(fd, mode) {
        return this._handleFdSync("fchmod", fd, [mode]);
    }

    _fchmodSync() {
        this.throw("ENOSYS", "fchmod");
    }

    @callbackify
    async chown(path, uid, gid) {
        return this._handlePath("chown", this._resolve(path), [uid, gid]);
    }

    _chown() {
        this.throw("ENOSYS", "chown");
    }

    chownSync(path, uid, gid) {
        return this._handlePathSync("chown", this._resolve(path), [uid, gid]);
    }

    _chownSync(path, uid, gid) {
        this.throw("ENOSYS", "chown");
    }

    @callbackify
    async fchown(fd, uid, gid) {
        return this._handleFd("fchown", fd, [uid, gid]);
    }

    _fchown() {
        this.throw("ENOSYS", "fchown");
    }

    fchownSync(fd, uid, gid) {
        return this._handleFdSync("fchown", fd, [uid, gid]);
    }

    _fchownSync() {
        this.throw("ENOSYS", "fchown");
    }

    @callbackify
    async copyFile(rawSrc, rawDest, flags = 0) {
        const src = this._resolve(rawSrc);
        const dest = this._resolve(rawDest);

        if (this._numberOfMountedEngines === 0) {
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

        const src2 = Path.fromParts(parts1.slice(node1[LEVEL]), { root: engine1.root, sep: engine1.sep });
        const dest2 = Path.fromParts(parts2.slice(node2[LEVEL]), { root: engine2.root, sep: engine2.sep });

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

    _copyFile() {
        this.throw("ENOSYS", "rename"); // fallback to copy via streams?
    }

    copyFileSync(rawSrc, rawDest, flags = 0) {
        const src = this._resolve(rawSrc);
        const dest = this._resolve(rawDest);

        if (this._numberOfMountedEngines === 0) {
            // only one engine can handle it, itself
            try {
                return this._copyFileSync(src, dest, flags);
            } catch (err) {
                if (err instanceof FSException) {
                    err.path = src;
                    err.secondPath = dest;
                }
                throw err;
            }
        }

        let engine1;
        let node1;
        let parts1;

        try {
            [engine1, node1, parts1] = this._chooseEngineSync(src, "copyfile");
        } catch (err) {
            if (err instanceof FSException) {
                err.path = src;
                err.secondPath = dest;
            }
            throw err;
        }

        let engine2;
        let node2;
        let parts2;

        try {
            [engine2, node2, parts2] = this._chooseEngineSync(dest, "copyfile");
        } catch (err) {
            if (err instanceof FSException) {
                err.path = src;
                err.secondPath = dest;
            }
            throw err;
        }

        const src2 = Path.fromParts(parts1.slice(node1[LEVEL]), { root: engine1.root, sep: engine1.sep });
        const dest2 = Path.fromParts(parts2.slice(node2[LEVEL]), { root: engine2.root, sep: engine2.sep });

        // efficient
        if (engine1 === engine2) {
            try {
                return engine1.copyFile(src2, dest2);
            } catch (err) {
                if (err instanceof FSException) {
                    err.path = src;
                    err.secondPath = dest;
                }
                throw err;
            }
        }

        // implement sync stream ?

        throw new x.NotSupported();
    }

    _copyFileSync() {
        this.throw("ENOSYS", "copyfile");
    }

    @callbackify
    async rename(rawOldPath, rawNewPath) {
        const oldPath = this._resolve(rawOldPath);
        const newPath = this._resolve(rawNewPath);

        if (this._numberOfMountedEngines === 0) {
            // only one engine can handle it, itself
            return this._rename(oldPath, newPath).catch((err) => {
                if (err instanceof FSException) {
                    err.path = oldPath;
                    err.secondPath = newPath;
                }
                return Promise.reject(err);
            });
        }

        const [
            [engine1, node1, parts1],
            [engine2, node2, parts2]
        ] = await Promise.all([
            this._chooseEngine(oldPath, "rename").catch((err) => {
                if (err instanceof FSException) {
                    err.path = oldPath;
                    err.secondPath = newPath;
                }
                return Promise.reject(err);
            }),
            this._chooseEngine(newPath, "rename").catch((err) => {
                if (err instanceof FSException) {
                    err.path = oldPath;
                    err.secondPath = newPath;
                }
                return Promise.reject(err);
            })
        ]);

        const oldPath2 = Path.fromParts(parts1.slice(node1[LEVEL]), { root: engine1.root, sep: engine1.sep });
        const newPath2 = Path.fromParts(parts2.slice(node2[LEVEL]), { root: engine2.root, sep: engine2.sep });

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

    renameSync(rawOldPath, rawNewPath) {
        const oldPath = this._resolve(rawOldPath);
        const newPath = this._resolve(rawNewPath);

        if (this._numberOfMountedEngines === 0) {
            // only one engine can handle it, itself
            try {
                return this._renameSync(oldPath, newPath);
            } catch (err) {
                if (err instanceof FSException) {
                    err.path = oldPath;
                    err.secondPath = newPath;
                }
                throw err;
            }
        }

        let engine1;
        let node1;
        let parts1;

        try {
            [engine1, node1, parts1] = this._chooseEngineSync(oldPath, "rename");
        } catch (err) {
            if (err instanceof FSException) {
                err.path = oldPath;
                err.secondPath = newPath;
            }
            throw err;
        }

        let engine2;
        let node2;
        let parts2;

        try {
            [engine2, node2, parts2] = this._chooseEngineSync(newPath, "rename");
        } catch (err) {
            if (err instanceof FSException) {
                err.path = oldPath;
                err.secondPath = newPath;
            }
            throw err;
        }

        const oldPath2 = Path.fromParts(parts1.slice(node1[LEVEL]), { root: engine1.root, sep: engine1.sep });
        const newPath2 = Path.fromParts(parts2.slice(node2[LEVEL]), { root: engine2.root, sep: engine2.sep });

        if (engine1 === engine2) {
            try {
                return engine1.rename(oldPath2, newPath2);
            } catch (err) {
                if (err instanceof FSException) {
                    err.path = oldPath;
                    err.secondPath = newPath;
                }
                throw err;
            }
        }
        // TODO: copy from one location to another and then delete the source?
        throw new x.NotSupported("for now cross engine renamings are not supported");
    }

    _renameSync() {
        this.throw("ENOSYS", "rename");
    }

    @callbackify
    async symlink(target, path, type) {
        // omg, here we have to swap them...
        // and i think we must resolve the target using the engine that will handle the request
        return this._handlePath("symlink", this._resolve(path), [new Path(target, { root: this.root, sep: this.sep }), type]);
    }

    _symlink() {
        this.throw("ENOSYS", "symlink");
    }

    symlinkSync(target, path, type) {
        return this._handlePathSync("symlink", this._resolve(path), [new Path(target, { root: this.root, sep: this.sep }), type]);
    }

    _symlinkSync() {
        this.throw("ENOSYS", "symlink");
    }

    @callbackify
    async link(rawExistingPath, rawNewPath) {
        const existingPath = this._resolve(rawExistingPath);
        const newPath = this._resolve(rawNewPath);

        if (this._numberOfMountedEngines === 0) {
            // only one engine can handle it, itself
            return this._link(existingPath, newPath).catch((err) => {
                if (err instanceof FSException) {
                    err.path = existingPath;
                    err.secondPath = newPath;
                }
                return Promise.reject(err);
            });
        }

        const [
            [engine1, node1, parts1],
            [engine2, node2, parts2]
        ] = await Promise.all([
            this._chooseEngine(existingPath, "rename").catch((err) => {
                if (err instanceof FSException) {
                    err.path = existingPath;
                    err.secondPath = newPath;
                }
                return Promise.reject(err);
            }),
            this._chooseEngine(newPath, "rename").catch((err) => {
                if (err instanceof FSException) {
                    err.path = existingPath;
                    err.secondPath = newPath;
                }
                return Promise.reject(err);
            })
        ]);

        const existingPath2 = Path.fromParts(parts1.slice(node1[LEVEL]), { root: engine1.root, sep: engine1.sep });
        const newPath2 = Path.fromParts(parts2.slice(node2[LEVEL]), { root: engine2.root, sep: engine2.sep });

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

    _link() {
        this.throw("ENOSYS", "link");
    }

    linkSync(rawExistingPath, rawNewPath) {
        const existingPath = this._resolve(rawExistingPath);
        const newPath = this._resolve(rawNewPath);

        if (this._numberOfMountedEngines === 0) {
            // only one engine can handle it, itself
            try {
                return this._linkSync(existingPath, newPath);
            } catch (err) {
                if (err instanceof FSException) {
                    err.path = existingPath;
                    err.secondPath = newPath;
                }
                throw err;
            }
        }

        let engine1;
        let node1;
        let parts1;

        try {
            [engine1, node1, parts1] = this._chooseEngineSync(existingPath, "rename");
        } catch (err) {
            if (err instanceof FSException) {
                err.path = existingPath;
                err.secondPath = newPath;
            }
            throw err;
        }

        let engine2;
        let node2;
        let parts2;

        try {
            [engine2, node2, parts2] = this._chooseEngineSync(newPath, "rename");
        } catch (err) {
            if (err instanceof FSException) {
                err.path = existingPath;
                err.secondPath = newPath;
            }
            throw err;
        }

        const existingPath2 = Path.fromParts(parts1.slice(node1[LEVEL]), { root: engine1.root, sep: engine1.sep });
        const newPath2 = Path.fromParts(parts2.slice(node2[LEVEL]), { root: engine2.root, sep: engine2.sep });

        if (engine1 === engine2) {
            try {
                return engine1.link(existingPath2, newPath2);
            } catch (err) {
                if (err instanceof FSException) {
                    err.path = existingPath;
                    err.secondPath = newPath;
                }
                throw err;
            }
        }
        throw new x.NotSupported("Cross engine hark links are not supported");
    }

    _linkSync() {
        this.throw("ENOSYS", "link");
    }

    @callbackify
    async fstat(fd) {
        return this._handleFd("fstat", fd);
    }

    _fstat() {
        this.throw("ENOSYS", "fstat");
    }

    fstatSync(fd) {
        return this._handleFdSync("fstat", fd);
    }

    _fstatSync() {
        this.throw("ENOSYS", "fstat");
    }

    @callbackify
    async fsync(fd) {
        return this._handleFd("fsync", fd);
    }

    _fsync() {
        this.throw("ENOSYS", "fsync");
    }

    fsyncSync(fd) {
        return this._handleFdSync("fsync", fd);
    }

    _fsyncSync() {
        this.throw("ENOSYS", "fsync");
    }

    @callbackify
    async fdatasync(fd) {
        return this._handleFd("fdatasync", fd);
    }

    _fdatasync() {
        this.throw("ENOSYS", "fdatasync");
    }

    fdatasyncSync(fd) {
        return this._handleFdSync("fdatasync", fd);
    }

    _fdatasyncSync() {
        this.throw("ENOSYS", "fdatasync");
    }

    @callbackify
    async stat(path) {
        return this._handlePath("stat", this._resolve(path), []);
    }

    _stat() {
        this.throw("ENOSYS", "stat");
    }

    statSync(path) {
        return this._handlePathSync("stat", this._resolve(path), []);
    }

    _statSync() {
        this.throw("ENOSYS", "stat");
    }

    @callbackify
    async lstat(path) {
        return this._handlePath("lstat", this._resolve(path), []);
    }

    _lstat() {
        this.throw("ENOSYS", "lstat");
    }

    lstatSync(path) {
        return this._handlePathSync("lstat", this._resolve(path), []);
    }

    _lstatSync() {
        this.throw("ENOSYS", "lstat");
    }

    @callbackify
    async readdir(rawPath, options) {
        if (!is.object(options)) {
            options = { encoding: options };
        }

        options.encoding = options.encoding || "utf8";

        return this._handlePath("readdir", this._resolve(rawPath), [options]);
    }

    async _readdir(path) {
        const siblings = this._getSiblingMounts(path);
        if (!siblings) {
            this.throw("ENOENT", path, "scandir");
        }
        // entries must be added inside _handlePath as siblings, hm...
        return [];
    }

    readdirSync(rawPath, options) {
        if (!is.object(options)) {
            options = { encoding: options };
        }

        options.encoding = options.encoding || "utf8";

        const path = this._resolve(rawPath);

        return this._handlePathSync("readdir", path, [options]);
    }

    _readdirSync(path) {
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

        return this._handlePath("realpath", this._resolve(path), [options]);
    }

    _realpath() {
        this.throw("ENOSYS", "realpath"); // or a common implementation?
    }

    realpathSync(path, options) {
        if (!is.object(options)) {
            options = { encoding: options };
        }
        options.encoding = options.encoding || "utf8";

        return this._handlePathSync("realpath", this._resolve(path), [options]);
    }

    _realpathSync() {
        this.throw("ENOSYS", "realpath");
    }

    @callbackify
    async readlink(path, options) {
        if (!is.object(options)) {
            options = { encoding: options };
        }
        options.encoding = options.encoding || "utf8";

        return this._handlePath("readlink", this._resolve(path), [options]);
    }

    _readlink() {
        return this.throw("ENOSYS", "readlink");
    }

    readlinkSync(path, options) {
        if (!is.object(options)) {
            options = { encoding: options };
        }
        options.encoding = options.encoding || "utf8";

        return this._handlePathSync("readlink", this._resolve(path), [options]);
    }

    _readlinkSync() {
        this.throw("ENOSYS", "readlink");
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

    writeFileSync(path, data, options = {}) {
        if (!is.object(options)) {
            options = { encoding: options };
        } else {
            options = { ...options };
        }
        options.encoding = options.encoding || "utf8";
        options.mode = options.mode || 0o666;
        options.flag = options.flag || "w";

        const isUserFd = isFd(path); // file descriptor ownership

        const fd = isUserFd ? path : this.openSync(path, options.flag, options.mode);

        if (!is.uint8Array(data)) {
            data = Buffer.from(`${data}`, options.encoding || "utf8");
        }
        let offset = 0;
        let length = data.length;
        let position = /a/.test(options.flag) ? null : 0;
        try {
            while (length > 0) {
                const written = this.writeSync(fd, data, offset, length, position);
                offset += written;
                length -= written;
                if (!is.null(position)) {
                    position += written;
                }
            }
        } finally {
            if (!isUserFd) {
                this.closeSync(fd);
            }
        }
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

    appendFileSync(path, data, options = {}) {
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

        return this.writeFileSync(path, data, options);
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

    readFileSync(path, options) {
        if (!is.object(options)) {
            options = { encoding: options };
        }
        options.flag = options.flag || "r";
        options.encoding = options.encoding || null;

        const isUserFd = isFd(path); // file descriptor ownership
        const fd = isUserFd ? path : this.openSync(path, options.flag || "r", 0o666);

        let stat;
        try {
            stat = this.fstatSync(fd);
        } catch (err) {
            if (!isUserFd) {
                this.closeSync(fd);
            }
            throw err;
        }

        // Use stats array directly to avoid creating an fs.Stats instance just for
        // our internal use.
        let size;
        if ((stat.mode & constants.S_IFMT) === constants.S_IFREG) {
            size = stat.size;
        } else {
            size = 0;
        }
        let pos = 0;
        let buffer; // single buffer with file data
        let buffers; // list for when size is unknown

        if (size === 0) {
            buffers = [];
        } else {
            try {
                buffer = Buffer.allocUnsafe(size);
            } catch (err) {
                if (!isUserFd) {
                    this.closeSync(fd);
                }
                throw err;
            }
        }

        let bytesRead;

        if (size !== 0) {
            do {
                bytesRead = tryReadSync(this, fd, isUserFd, buffer, pos, size - pos);
                pos += bytesRead;
            } while (bytesRead !== 0 && pos < size);
        } else {
            do {
                // the kernel lies about many files.
                // Go ahead and try to read some bytes.
                buffer = Buffer.allocUnsafe(8192);
                bytesRead = tryReadSync(this, fd, isUserFd, buffer, 0, 8192);
                if (bytesRead !== 0) {
                    buffers.push(buffer.slice(0, bytesRead));
                }
                pos += bytesRead;
            } while (bytesRead !== 0);
        }

        if (!isUserFd) {
            this.closeSync(fd);
        }

        if (size === 0) {
            // data was collected into the buffers list.
            buffer = Buffer.concat(buffers, pos);
        } else if (pos < size) {
            buffer = buffer.slice(0, pos);
        }

        if (options.encoding) {
            buffer = buffer.toString(options.encoding);
        }
        return buffer;
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

    mkdtempSync(prefix, options = {}) {
        if (!is.object(options)) {
            options = { encoding: options };
        }
        options.encoding = options.encoding || "utf8";
        return this._handlePath("mkdtemp", prefix, [options]);
    }

    _mkdtempSync() {
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

        this._handlePath("watch", this._resolve(filename), [options, listener, watcher]).catch((err) => {
            watcher.emit("error", err);
        });

        return watcher;
    }

    _watch(filename, options, listener, watcher) {
        watcher.emit("error", this.createError("ENOSYS", filename, "watch"));
    }

    _handleFdSync(method, mappedFd, args = []) {
        if (!this._fdMap.has(mappedFd)) {
            this.throw("EBADF", syscallMap[method]);
        }
        const { fd, engine } = this._fdMap.get(mappedFd);
        const res = engine === this
            ? engine[`_${method}Sync`](fd, ...args)
            : engine[`${method}Sync`](fd, ...args);
        if (method === "close") {
            // fd has been closed, we can delete the key
            this._fdMap.delete(mappedFd);
        }
        return res;
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

    _chooseEngineSync(path, method, secondPath) {
        if (!this.structure[path.root]) {
            // must be handled by this engine, no other case
            return [this, this.structure, path.parts];
        }

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
                            stat = engine.statSync(subPath); // eslint-disable-line
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
                            const stat = engine.statSync(subPath); // eslint-disable-line
                            if (stat.isFile()) {
                                // this is a file, but the pattern is "subPath/.." which is applicable only for directories
                                this.throw("ENOTDIR", path, syscallMap[method], secondPath);
                            }
                            const target = engine.readlinkSync(subPath); // eslint-disable-line

                            // it subPath is not a symlink, readlink will throw EINVAL
                            // so here we have a symlink to a directory

                            const targetPath = new Path(target, { root: engine.root, sep: engine.sep });

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

    async _chooseEngine(path, method, secondPath) {
        if (!this.structure[path.root]) {
            // must be handled by this engine, no other case
            return [this, this.structure, path.parts];
        }

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

                            const targetPath = new Path(target, { root: engine.root, sep: engine.sep });

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
                case "symlink": {
                    err.path = args[0];
                    err.secondPath = path;
                    break;
                }
                default: {
                    err.path = path;
                }
            }
        }
        throw err;
    }

    _handlePathSync(method, path, args) {
        if (this._numberOfMountedEngines === 0) {
            // only one engine can handle it, itself
            try {
                const res = this[`_${method}Sync`](path, ...args);
                if (method === "open") {
                    return this._storeFd(res, this);
                }
                return res;
            } catch (err) {
                this._handleError(err, method, path, args);
            }
        }
        const [engine, node, parts] = this._chooseEngineSync(path, method);

        const level = node[LEVEL];

        try {
            const res = engine === this
                ? engine[`_${method}Sync`](path.replaceParts(parts), ...args)
                : engine[`${method}Sync`](`/${parts.slice(level).join("/")}`, ...args);
            switch (method) {
                case "readdir": {
                    if (level === 0) {
                        const [options] = args;
                        const siblings = this._getSiblingMounts(path.replaceParts(parts));

                        const files = siblings
                            ? util.unique(res.concat(siblings)).sort()
                            : res;

                        return options.encoding === "buffer"
                            ? files.map((x) => Buffer.from(x))
                            : files;
                    }
                    break;
                }
                case "open": {
                    /**
                     * this method returns a file descriptor
                     * we must remember which engine returned it to perform reverse substitutions
                     */
                    return this._storeFd(res, engine);
                }
                case "realpath": {
                    if (engine === this) {
                        return res;
                    }

                    // ...
                    let p;

                    if (res.startsWith(engine.root)) {
                        p = new Path(`/${res.slice(engine.root.length)}`);
                    } else {
                        p = new Path(res);
                    }

                    return this._resolve(`/${parts.slice(0, level).concat(p.parts).join("/")}`).fullPath;
                }
            }
            return res;
        } catch (err) {
            this._handleError(err, method, path, args);
        }
    }

    /**
     * @param {string} method
     * @param {string} rawPath
     * @param {any[]} args
     */
    async _handlePath(method, path, args) {
        if (this._numberOfMountedEngines === 0) {
            // only one engine can handle it, itself
            let p = new Promise((resolve) => resolve(this[`_${method}`](path, ...args)));
            if (method === "open") {
                // store fd
                p = p.then((fd) => this._storeFd(fd, this));
            }
            return p.catch((err) => this._handleError(err, method, path, args));
        }

        const [engine, node, parts] = await this._chooseEngine(path, method);

        let p;
        const level = node[LEVEL];
        if (engine === this) {
            p = new Promise((resolve) => resolve(engine[`_${method}`](path.replaceParts(parts), ...args)));
        } else {
            p = new Promise((resolve) => resolve(engine[method](`/${parts.slice(level).join("/")}`, ...args)));
        }

        switch (method) {
            case "readdir": {
                if (level === 0) {
                    const [options] = args;
                    p = p.then((engineFiles) => { // eslint-disable-line
                        const siblings = this._getSiblingMounts(path.replaceParts(parts));

                        const files = siblings
                            ? util.unique(engineFiles.concat(siblings)).sort()
                            : engineFiles;

                        return options.encoding === "buffer"
                            ? files.map((x) => Buffer.from(x))
                            : files;
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
            case "realpath": {
                if (engine !== this) {
                    p = p.then((path) => {
                        if (path.startsWith(engine.root)) {
                            p = new Path(`/${path.slice(engine.root.length)}`);
                        } else {
                            p = new Path(path);
                        }
                        return this._resolve(`/${parts.slice(0, level).concat(p.parts).join("/")}`).fullPath;
                    });
                }
            }
        }

        return p.catch((err) => this._handleError(err, method, path, args));
    }

    _getSiblingMounts(path) {
        let node = this.structure;
        if (!node[path.root]) {
            // no mounts - no siblings
            return null;
        }
        node = node[path.root];
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
        const path = Path.wrap(rawPath, { root: this.root, sep: this.sep });

        if (!(path.root in this.structure)) {
            this.structure[path.root] = {
                [LEVEL]: 0,
                [ENGINE]: this // use the current engine by default
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
        ++this._numberOfMountedEngines;
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
