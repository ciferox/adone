// @ts-check

const {
    is,
    std,
    util,
    collection,
    x
} = adone;

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
    constructor(code, description, path, syscall) {
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

    get syscall() {
        return this._syscall;
    }

    set syscall(v) {
        this._syscall = v;
        this._updateMessage();
    }

    _updateMessage() {
        this.message = `${this.code}: ${this.description}${this._syscall ? `, ${this._syscall}` : ""}${this._path ? ` '${this._path.fullPath}'` : ""}`;
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
    ENOENT: (path, syscall) => new FSException("ENOENT", "no such file or directory", path, syscall),
    EISDIR: (path, syscall) => new FSException("EISDIR", "illegal operation on a directory", path, syscall),
    ENOTDIR: (path, syscall) => new FSException("ENOTDIR", "not a directory", path, syscall),
    ELOOP: (path, syscall) => new FSException("ELOOP", "too many symbolic links encountered", path, syscall),
    EINVAL: (path, syscall) => new FSException("EINVAL", "invalid argument", path, syscall),
    EBADF: (path, syscall) => new FSException("EBADF", "bad file descriptor", syscall),
    EEXIST: (path, syscall) => new FSException("EEXIST", "file already exists", path, syscall),
    ENOTEMPTY: (path, syscall) => new FSException("ENOTEMPTY", "directory not empty", path, syscall),
    EACCESS: (path, syscall) => new FSException("EACCESS", "permission denied", path, syscall),
    EPERM: (path, syscall) => new FSException("EPERM", "operation not permitted", path, syscall)
};

const ENGINE = Symbol("ENGINE");
const LEVEL = Symbol("LEVEL");
const PARENT = Symbol("PARENT");

const methodsToMock = [
    "readFile",
    "stat",
    "lstat",
    "readdir",
    "realpath"
];

const syscallMap = {
    lstat: "lstat",
    stat: "stat",
    readdir: "scandir",
    readlink: "readlink",
    open: "open",
    close: "close",
    read: "read"
};

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
        this.mount(this, "/");
        this._fd = 100; // generally, no matter which initial value we use, this is a fd counter for internal mappings
        this._fdMap = new collection.MapCache();
    }

    throw(code, path, syscall) {
        throw errors[code](path, syscall);
    }

    @callbackify
    async open(path, flags, mode = 0o666) {
        return this._handlePath("open", Path.resolve(path), [flags, mode]);
    }

    @callbackify
    async close(fd) {
        return this._handleFd("close", fd, []);
    }

    @callbackify
    async read(fd, buffer, offset, length, position) {
        return this._handleFd("read", fd, [buffer, offset, length, position]);
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
            if (!is.number(position)) {
                position = null;
            }
            return this._handleFd("write", fd, [buffer, offset, length, position]);
        }
        if (!is.string(buffer)) {
            buffer = String(buffer);
        }
        if (is.string(offset)) {
            length = offset;
            offset = null;
        }
        if (!is.number(offset)) {
            offset = null;
        }
        if (!is.string(length)) {
            length = "utf8";
        }
        return this._handleFd("write", fd, [buffer, offset, length]);
    }

    @callbackify
    async ftruncate(fd, length = 0) {
        return this._handleFd("ftruncate", fd, [length]);
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

    @callbackify
    async utimes(path, atime, mtime) {
        return this._handlePath("utimes", Path.resolve(path), [
            toUnixTimestamp(atime),
            toUnixTimestamp(mtime)
        ]);
    }

    @callbackify
    async unlink(path) {
        return this._handlePath("unlink", Path.resolve(path), []);
    }

    @callbackify
    async rmdir(path) {
        return this._handlePath("rmdir", Path.resolve(path), []);
    }

    @callbackify
    async mkdir(path, mode = 0o777) {
        return this._handlePath("mkdir", Path.resolve(path), [mode]);
    }

    @callbackify
    async access(path, mode = constants.F_OK) {
        return this._handlePath("access", Path.resolve(path), [mode]);
    }

    @callbackify
    async chmod(path, mode) {
        return this._handlePath("chmod", Path.resolve(path), [mode]);
    }

    @callbackify
    async chown(path, uid, gid) {
        return this._handlePath("chown", Path.resolve(path), [uid, gid]);
    }

    async rename(rawOldPath, rawNewPath) {
        const oldPath = Path.resolve(rawOldPath);
        const newPath = Path.resolve(rawNewPath);

        if (this._numberOfEngines === 1) {
            // only one engine can handle it, itself
            return this._rename(oldPath, newPath);
        }
        const [engine1, node1, parts1] = await this._chooseEngine(oldPath, "rename");
        const [engine2, node2, parts2] = await this._chooseEngine(newPath, "rename");

        const oldPath2 = new Path(`/${parts1.slice(node1[LEVEL]).join("/")}`);
        const newPath2 = new Path(`/${parts2.slice(node2[LEVEL]).join("/")}`);

        if (engine1 === engine2) {
            return engine1.rename(oldPath2, newPath2);
        }
        // TODO: copy from one location to another and then delete the source?
        throw new x.NotSupported("for now cross engine renamings are not supported");
    }

    @callbackify
    async symlink(target, path, type) {
        // omg, here we have to swap them...
        return this._handlePath("symlink", Path.resolve(path), [new Path(target), type]);
    }

    @callbackify
    async link(rawExistingPath, rawNewPath) {
        const existingPath = Path.resolve(rawExistingPath);
        const newPath = Path.resolve(rawNewPath);

        if (this._numberOfEngines === 1) {
            // only one engine can handle it, itself
            return this._link(existingPath, newPath);
        }
        const [engine1, node1, parts1] = await this._chooseEngine(existingPath, "link");
        const [engine2, node2, parts2] = await this._chooseEngine(newPath, "link");

        const existingPath2 = new Path(`/${parts1.slice(node1[LEVEL]).join("/")}`);
        const newPath2 = new Path(`/${parts2.slice(node2[LEVEL]).join("/")}`);

        if (engine1 === engine2) {
            return engine1.rename(existingPath2, newPath2);
        }
        throw new x.NotSupported("Cross engine hark links are not supported");
    }

    @callbackify
    async fstat(fd) {
        return this._handleFd("fstat", fd);
    }

    @callbackify
    async fsync(fd) {
        return this._handleFd("fsync", fd);
    }

    @callbackify
    async fdatasync(fd) {
        return this._handleFd("fdatasync", fd);
    }

    @callbackify
    async stat(path) {
        return this._handlePath("stat", Path.resolve(path), []);
    }

    @callbackify
    async lstat(path) {
        return this._handlePath("lstat", Path.resolve(path), []);
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

        return this._handlePath("realpath", path, [options]);
    }

    @callbackify
    async readlink(path, options) {
        if (!is.object(options)) {
            options = { encoding: options };
        }
        options.encoding = options.encoding || "utf8";

        return this._handlePath("readlink", Path.resolve(path), [options]);
    }

    async _handleFd(method, mappedFd, args = []) {
        if (!this._fdMap.has(mappedFd)) {
            this.throw("EBADF", undefined, syscallMap[method]);
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

    async _chooseEngine(path, method) {
        let parts = path.parts.slice();

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
                                err.syscall = syscallMap[method];
                            }
                            throw err;
                        }
                        if (!stat.isDirectory()) {
                            this.throw("ENOTDIR", path, syscallMap[method]);
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
                                this.throw("ENOTDIR", path, syscallMap[method]);
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
                                    this.throw("ENOENT", path, syscallMap[method]);
                                    break;
                                }
                                case "ENOTDIR": {
                                    this.throw("ENOTDIR", path, syscallMap[method]);
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
                p = p.then((fd) => this._storeFd(fd, this));
            }
            return p;
        }

        const [engine, node, parts] = await this._chooseEngine(path, method);

        let p;
        const level = node[LEVEL];
        const newPath = new Path(`/${parts.slice(level).join("/")}`);
        if (engine === this) {
            p = engine[`_${method}`](newPath, ...args);
        } else {
            p = engine[method](newPath, ...args);
        }

        switch (method) {
            case "readdir": { // TODO: not only level === 0
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
            }
        }

        return p.catch((err) => {
            if (err instanceof FSException) {
                err.path = path;
            }
            return Promise.reject(err);
        });
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
