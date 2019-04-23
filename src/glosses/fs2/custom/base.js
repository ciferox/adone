/* eslint-disable no-await-in-loop */
/* eslint-disable adone/no-null-comp */
/* eslint-disable adone/no-typeof */

// NOTE: The code of all filesystems must be self-sufficient to avoid any dependence on ADONE and other thrid-parties.
// This requirement is primarily due to the fact that filesystems are used in KRI to implement the bootstraper,
// in which there should not be any third-party dependencies and the size of the codebase should be minimal.

import fs from "fs";
import { isFunction, isNumber, isString, isBuffer, unique } from "../../../common";
import { NotSupportedException } from "../../errors";
import Path from "./path";
import { createError, FSException } from "./fs_exception";

const { constants, _toUnixTimestamp } = fs;


const FS_INSTANCE = Symbol("FS_INSTANCE");
const LEVEL = Symbol("LEVEL");
const PARENT = Symbol("PARENT");

// fs methods in alphabetical order
// [name, isAbstract]
const fsMethods = [
    ["access", true],
    ["accessSync", true],
    ["appendFile", true],
    ["appendFileSync", true],
    ["chmod", true],
    ["chmodSync", true],
    ["chown", true],
    ["chownSync", true],
    ["close", true],
    ["closeSync", true],
    ["copyFile", true],
    ["copyFileSync", true],
    ["createReadStream", true],
    ["createWriteStream", true],
    ["exists", true], // deprecated
    ["existsSync", true],
    ["fchmod", true],
    ["fchmodSync", true],
    ["fchown", true],
    ["fchownSync", true],
    ["fdatasync", true],
    ["fdatasyncSync", true],
    ["fstat", true],
    ["fstatSync", true],
    ["fsync", true],
    ["fsyncSync", true],
    ["ftruncate", true],
    ["ftruncateSync", true],
    ["futimes", true],
    ["futimesSync", true],
    ["lchmod", true],
    ["lchmodSync", true],
    ["lchown", true],
    ["lchownSync", true],
    ["link", true],
    ["linkSync", true],
    ["lstat", true],
    ["lstatSync", true],
    ["mkdir", true],
    ["mkdirSync", true],
    ["mkdtemp", true],
    ["mkdtempSync", true],
    ["open", true],
    ["openSync", true],
    ["read", true],
    ["readdir", true],
    ["readdirSync", true],
    ["readFile", true],
    ["readFileSync", true],
    ["readlink", true],
    ["readlinkSync", true],
    ["readSync", true],
    ["realpath", true],
    ["realpathSync", true],
    ["rename", true],
    ["renameSync", true],
    ["rmdir", true],
    ["rmdirSync", true],
    ["stat", true],
    ["statSync", true],
    ["symlink", true],
    ["symlinkSync", true],
    ["truncate", true],
    ["truncateSync", true],
    ["unlink", true],
    ["unlinkSync", true],
    ["utimes", true],
    ["utimesSync", true],
    ["write", true],
    ["writeFile", true],
    ["writeFileSync", true],
    ["writeSync", true],
    ["watch", true],
    ["watchFile", true],
    ["unwatchFile", true]
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

export default class BaseFileSystem {
    constructor({ root = "/" } = {}) {
        this.structure = {
            [FS_INSTANCE]: this,
            [PARENT]: this,
            [LEVEL]: 0
        };
        this._mountsNum = 0;
        this._fd = 10; // generally, no matter which initial value we use, this is a fd counter for internal mappings
        this._fdMap = new Map();
        this._initialized = false;
        this._initializing = false;
        this._uninitializing = false;
        this._uninitialized = false;
        this.root = root;
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
                if (v instanceof BaseFileSystem) {
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

    /**
     * Direved fs should do custom initialization in this method.
     */
    _initialize() {
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
                if (v instanceof BaseFileSystem) {
                    await v.uninitialize();
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

    /**
     * Derived fs should do custom uninitialization in this method.
     */
    _uninitialize() {
    }

    mount(customFs, rawPath) {
        const path = Path.wrap(rawPath, this.root);

        if (!(path.root in this.structure)) {
            this.structure[path.root] = {
                [LEVEL]: 0,
                [FS_INSTANCE]: this // use the current engine by default
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
                    [FS_INSTANCE]: root[FS_INSTANCE]
                };
            }
            root = root[part];
            ++level;
        }
        root[LEVEL] = level;
        root[FS_INSTANCE] = customFs;
        ++this._mountsNum;
        return this;
    }

    mock(obj) {
        const origMethods = {};
        for (const method of fsMethods) {
            origMethods[method] = obj[method];
            obj[method] = (...args) => this[method](...args);
        }
        obj.restore = () => {
            for (const method of fsMethods) {
                obj[method] = origMethods[method];
            }
            delete obj.restore;
        };
        return obj;
    }

    // fs methods

    access(path, mode = constants.F_OK, callback) {
        this._handlePath("access", this._resolve(path), callback, mode);
    }

    accessSync(path, mode = constants.F_OK) {
        return this._handlePathSync("access", this._resolve(path), [mode]);
    }

    appendFile(path, data, options, callback) {
        if (isFunction(options)) {
            callback = options;
            options = {};
        }
        if (typeof options !== "object") {
            options = { encoding: options };
        } else {
            options = { ...options };
        }
        options.encoding = options.encoding || "utf8";
        options.mode = options.mode || 0o666;
        options.flag = options.flag || "a";
        this._handlePath("appendFile", this._resolve(path), callback, data, options);
    }

    appendFileSync(path, data, options) {
        if (typeof options !== "object") {
            options = { encoding: options };
        } else {
            options = { ...options };
        }
        options.encoding = options.encoding || "utf8";
        options.mode = options.mode || 0o666;
        options.flag = options.flag || "a";
        return this._handlePathSync("appendFileSync", this._resolve(path), [data, options]);
    }

    chmod(path, mode, callback) {
        this._handlePath("chmod", this._resolve(path), callback, mode);
    }

    chmodSync(path, mode) {
        return this._handlePathSync("chmodSync", this._resolve(path), [mode]);
    }

    chown(path, uid, gid, callback) {
        this._handlePath("chown", this._resolve(path), callback, uid, gid);
    }

    chownSync(path, uid, gid) {
        return this._handlePathSync("chown", this._resolve(path), [uid, gid]);
    }

    close(fd, callback) {
        this._handleFd("close", fd, callback);
    }

    closeSync(fd) {
        return this._handleFdSync("close", fd, []);
    }

    // TODO
    copyFile(rawSrc, rawDest, flags, callback) {
        if (isFunction(flags)) {
            callback = flags;
            flags = 0;
        }
        const src = this._resolve(rawSrc);
        const dest = this._resolve(rawDest);

        if (this._mountsNum === 0) {
            // only one engine can handle it, itself
            this._copyFile(src, dest, flags, (err) => {
                if (err) {
                    if (err instanceof FSException) {
                        err.path = src;
                        err.secondPath = dest;
                    }
                    callback(err);
                    return;
                }
                callback(null);
            });
            return;
        }

        // const [
        //     [engine1, node1, parts1],
        //     [engine2, node2, parts2]
        // ] = await Promise.all([
        //     this._chooseEngine(src, "copyfile").catch((err) => {
        //         if (err instanceof FSException) {
        //             err.path = src;
        //             err.secondPath = dest;
        //         }
        //         return Promise.reject(err);
        //     }),
        //     this._chooseEngine(dest, "copyfile").catch((err) => {
        //         if (err instanceof FSException) {
        //             err.path = src;
        //             err.secondPath = dest;
        //         }
        //         return Promise.reject(err);
        //     })
        // ]);

        // const src2 = Path.fromParts(parts1.slice(node1[LEVEL]), engine1.root);
        // const dest2 = Path.fromParts(parts2.slice(node2[LEVEL]), engine2.root);

        // // efficient
        // if (engine1 === engine2) {
        //     return engine1.copyFile(src2, dest2).catch((err) => {
        //         if (err instanceof FSException) {
        //             err.path = src;
        //             err.secondPath = dest;
        //         }
        //         return Promise.reject(err);
        //     });
        // }

        // // cross engine copying...
        // // not so efficient...any other way?
        // // stream one file to another

        // if (flags === constants.COPYFILE_EXECL) {
        //     // have to throw if the dest exists
        //     const destStat = await engine2.lstat(dest2).catch((err) => {
        //         if (err.code === "ENOENT") { // does not exist
        //             return null;
        //         }
        //         return err; // does it mean that the file exists?
        //     });
        //     if (destStat) {
        //         this._throw("EEXIST", src, "copyfile", dest);
        //     }
        // }

        // const srcStream = engine1.createReadStream(src2);
        // const destStream = engine2.createWriteStream(dest2);
        // const err = await new Promise((resolve) => {
        //     let err;

        //     srcStream.once("error", (_err) => {
        //         if (err) {
        //             return; // the destroying has started
        //         }
        //         err = _err;
        //         srcStream.destroy();
        //         destStream.end();
        //     });

        //     destStream.once("error", (_err) => {
        //         if (err) {
        //             return; // the destroying has started
        //         }
        //         err = _err;
        //         srcStream.destroy();
        //         destStream.end();
        //     });

        //     destStream.once("close", () => {
        //         resolve(err);
        //     });

        //     srcStream.pipe(destStream);
        // });

        // if (err) {
        //     // try to remove the dest if an error was thrown
        //     await engine2.unlink(dest2).catch(noop);
        //     if (err instanceof FSException) {
        //         err.path = src;
        //         err.secondPath = dest;
        //     }
        //     throw err;
        // }
    }

    copyFileSync(rawSrc, rawDest, flags = 0) {
        const src = this._resolve(rawSrc);
        const dest = this._resolve(rawDest);

        if (this._mountsNum === 0) {
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

        const src2 = Path.fromParts(parts1.slice(node1[LEVEL]), engine1.root);
        const dest2 = Path.fromParts(parts2.slice(node2[LEVEL]), engine2.root);

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

        throw new NotSupportedException();
    }

    createReadStream(path, options) {
        return this._handlePathSync("createReadStream", this._resolve(path), [options]);
    }

    createWriteStream(path, options) {
        return this._handlePathSync("createWriteStream", this._resolve(path), [options]);
    }

    exists(path, callback) {
        this._handlePath("exists", this._resolve(path), callback);
    }

    existsSync(path) {
        return this._handlePathSync("existsSync", this._resolve(path));
    }

    fchmod(fd, mode, callback) {
        this._handleFd("fchmod", fd, callback, mode);
    }

    fchmodSync(fd, mode) {
        return this._handleFdSync("fchmod", fd, [mode]);
    }

    fchown(fd, uid, gid, callback) {
        this._handleFd("fchown", fd, callback, uid, gid);
    }

    fchownSync(fd, uid, gid) {
        return this._handleFdSync("fchown", fd, [uid, gid]);
    }

    fdatasync(fd, callback) {
        this._handleFd("fdatasync", fd, callback);
    }

    fdatasyncSync(fd) {
        return this._handleFdSync("fdatasync", fd);
    }

    fstat(fd, options, callback) {
        if (isFunction(options)) {
            callback = options;
            options = {};
        }
        return this._handleFd("fstat", fd, callback, options);
    }

    fstatSync(fd) {
        return this._handleFdSync("fstat", fd);
    }

    fsync(fd, callback) {
        this._handleFd("fsync", fd, callback);
    }

    fsyncSync(fd) {
        return this._handleFdSync("fsync", fd);
    }

    ftruncate(fd, length, callback) {
        if (isFunction(length)) {
            callback = length;
            length = 0;
        }
        this._handleFd("ftruncate", fd, callback, length);
    }

    ftruncateSync(fd, length = 0) {
        return this._handleFdSync("ftruncate", fd, [length]);
    }

    futimes(fd, atime, mtime, callback) {
        this._handleFd("futimes", fd, callback, _toUnixTimestamp(atime), _toUnixTimestamp(mtime));
    }

    futimesSync(fd, atime, mtime) {
        return this._handleFdSync("futimes", fd, [
            _toUnixTimestamp(atime),
            _toUnixTimestamp(mtime)
        ]);
    }

    lchmod(path, mode, callback) {
        this._handlePath("lchmod", this._resolve(path), callback, mode);
    }

    lchmodSync(path, mode) {
        return this._handlePathSync("lchmodSync", this._resolve(path), [mode]);
    }

    lchown(path, uid, gid, callback) {
        this._handlePath("lchown", this._resolve(path), callback, uid, gid);
    }

    lchownSync(path, uid, gid) {
        return this._handlePathSync("lchownSync", this._resolve(path), [uid, gid]);
    }

    // TODO
    link(rawExistingPath, rawNewPath, callback) {
        const existingPath = this._resolve(rawExistingPath);
        const newPath = this._resolve(rawNewPath);

        if (this._mountsNum === 0) {
            this._link(existingPath, newPath, (err) => {
                if (err) {
                    if (err instanceof FSException) {
                        err.path = existingPath;
                        err.secondPath = newPath;
                    }
                    callback(err);
                    return;
                }
                callback(null);
            });
            return;
        }

        // const [
        //     [engine1, node1, parts1],
        //     [engine2, node2, parts2]
        // ] = await Promise.all([
        //     this._chooseEngine(existingPath, "rename").catch((err) => {
        //         if (err instanceof FSException) {
        //             err.path = existingPath;
        //             err.secondPath = newPath;
        //         }
        //         return Promise.reject(err);
        //     }),
        //     this._chooseEngine(newPath, "rename").catch((err) => {
        //         if (err instanceof FSException) {
        //             err.path = existingPath;
        //             err.secondPath = newPath;
        //         }
        //         return Promise.reject(err);
        //     })
        // ]);

        // const existingPath2 = Path.fromParts(parts1.slice(node1[LEVEL]), engine1.root);
        // const newPath2 = Path.fromParts(parts2.slice(node2[LEVEL]),  engine2.root);

        // if (engine1 === engine2) {
        //     return engine1.link(existingPath2, newPath2).catch((err) => {
        //         if (err instanceof FSException) {
        //             err.path = existingPath;
        //             err.secondPath = newPath;
        //         }
        //         return Promise.reject(err);
        //     });
        // }
        // throw new NotSupportedException("Cross engine hark links are not supported");
    }

    linkSync(rawExistingPath, rawNewPath) {
        const existingPath = this._resolve(rawExistingPath);
        const newPath = this._resolve(rawNewPath);

        if (this._mountsNum === 0) {
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

        const existingPath2 = Path.fromParts(parts1.slice(node1[LEVEL]), engine1.root);
        const newPath2 = Path.fromParts(parts2.slice(node2[LEVEL]), engine2.root);

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
        throw new NotSupportedException("Cross engine hark links are not supported");
    }

    lstat(path, options, callback) {
        if (isFunction(options)) {
            callback = options;
            options = {};
        }
        this._handlePath("lstat", this._resolve(path), callback, options);
    }

    lstatSync(path) {
        return this._handlePathSync("lstat", this._resolve(path), []);
    }

    mkdir(path, options, callback) {
        if (isFunction(options)) {
            callback = options;
            options = 0o777;
        }
        this._handlePath("mkdir", this._resolve(path), callback, options);
    }

    mkdirSync(path, mode = 0o775) {
        return this._handlePathSync("mkdir", this._resolve(path), [mode]);
    }

    mkdtemp(prefix, options, callback) {
        if (isFunction(options)) {
            callback = options;
            options = {};
        }
        if (typeof options !== "object") {
            options = { encoding: options };
        }
        options.encoding = options.encoding || "utf8";
        this._handlePath("mkdtemp", prefix, callback, options);
    }

    mkdtempSync(prefix, options = {}) {
        if (typeof options !== "object") {
            options = { encoding: options };
        }
        options.encoding = options.encoding || "utf8";
        return this._handlePathSync("mkdtemp", prefix, [options]);
    }

    open(path, flags, mode = 0o666, callback) {
        if (isFunction(flags)) {
            callback = flags;
            mode = 0o666;
            flags = "r";
        } else if (isFunction(mode)) {
            callback = mode;
            mode = 0o666;
        }
        this._handlePath("open", this._resolve(path), callback, flags, mode);
    }

    openSync(path, flags, mode = 0o666) {
        return this._handlePathSync("open", this._resolve(path), [flags, mode]);
    }

    read(fd, buffer, offset, length, position, callback) {
        this._handleFd("read", fd, callback, buffer, offset, length, position);
    }

    readdir(rawPath, options, callback) {
        if (isFunction(options)) {
            callback = options;
            options = {};
        } else if (typeof options !== "object") {
            options = { encoding: options };
        }

        options.encoding = options.encoding || "utf8";

        this._handlePath("readdir", this._resolve(rawPath), callback, options);
    }

    _readdir(path, options, callback) {
        const siblings = this._getSiblingMounts(path);
        if (!siblings) {
            this._throw("ENOENT", path, undefined, "scandir");
        }
        // entries must be added inside _handlePath as siblings, hm...
        callback(null, []);
    }

    readdirSync(rawPath, options) {
        if (typeof options !== "object") {
            options = { encoding: options };
        }

        options.encoding = options.encoding || "utf8";

        const path = this._resolve(rawPath);

        return this._handlePathSync("readdir", path, [options]);
    }

    _readdirSync(path) {
        const siblings = this._getSiblingMounts(path);
        if (!siblings) {
            this._throw("ENOENT", path, undefined, "scandir");
        }
        // entries must be added inside _handlePath as siblings, hm...
        return [];
    }

    readFile(path, options, callback) {
        if (isFunction(options)) {
            callback = options;
            options = {};
        }
        if (typeof options !== "object") {
            options = { encoding: options };
        }
        options.flag = options.flag || "r";
        options.encoding = options.encoding || null;

        this._handlePath("readFile", this._resolve(path), callback, options);
    }

    readFileSync(path, options) {
        if (typeof options !== "object") {
            options = { encoding: options };
        }
        options.flag = options.flag || "r";
        options.encoding = options.encoding || null;

        return this._handlePathSync("readFileSync", this._resolve(path), [options]);
    }

    readlink(path, options, callback) {
        if (isFunction(options)) {
            callback = options;
            options = {};
        }
        if (typeof options !== "object") {
            options = { encoding: options };
        }
        options.encoding = options.encoding || "utf8";

        this._handlePath("readlink", this._resolve(path), callback, options);
    }

    readlinkSync(path, options) {
        if (typeof options !== "object") {
            options = { encoding: options };
        }
        options.encoding = options.encoding || "utf8";

        return this._handlePathSync("readlink", this._resolve(path), [options]);
    }

    readSync(fd, buffer, offset, length, position) {
        return this._handleFdSync("read", fd, [buffer, offset, length, position]);
    }

    realpath(path, options, callback) {
        if (isFunction(options)) {
            callback = options;
            options = {};
        }
        if (typeof options !== "object") {
            options = { encoding: options };
        }
        options.encoding = options.encoding || "utf8";

        this._handlePath("realpath", this._resolve(path), callback, options);
    }

    realpathSync(path, options) {
        if (typeof options !== "object") {
            options = { encoding: options };
        }
        options.encoding = options.encoding || "utf8";

        return this._handlePathSync("realpath", this._resolve(path), [options]);
    }

    // TODO
    rename(rawOldPath, rawNewPath, callback) {
        const oldPath = this._resolve(rawOldPath);
        const newPath = this._resolve(rawNewPath);

        if (this._mountsNum === 0) {
            // only one engine can handle it, itself
            return this._rename(oldPath, newPath, (err) => {
                if (err) {
                    if (err instanceof FSException) {
                        err.path = oldPath;
                        err.secondPath = newPath;
                    }
                    callback(err);
                    return;
                }
                callback(null);
            });
        }

        // const [
        //     [engine1, node1, parts1],
        //     [engine2, node2, parts2]
        // ] = await Promise.all([
        //     this._chooseEngine(oldPath, "rename").catch((err) => {
        //         if (err instanceof FSException) {
        //             err.path = oldPath;
        //             err.secondPath = newPath;
        //         }
        //         return Promise.reject(err);
        //     }),
        //     this._chooseEngine(newPath, "rename").catch((err) => {
        //         if (err instanceof FSException) {
        //             err.path = oldPath;
        //             err.secondPath = newPath;
        //         }
        //         return Promise.reject(err);
        //     })
        // ]);

        // const oldPath2 = Path.fromParts(parts1.slice(node1[LEVEL]), engine1.root);
        // const newPath2 = Path.fromParts(parts2.slice(node2[LEVEL]), engine2.root);

        // if (engine1 === engine2) {
        //     return engine1.rename(oldPath2, newPath2).catch((err) => {
        //         if (err instanceof FSException) {
        //             err.path = oldPath;
        //             err.secondPath = newPath;
        //         }
        //         return Promise.reject(err);
        //     });
        // }
        // // TODO: copy from one location to another and then delete the source?
        // throw new NotSupportedException("for now cross engine renamings are not supported");
    }

    renameSync(rawOldPath, rawNewPath) {
        const oldPath = this._resolve(rawOldPath);
        const newPath = this._resolve(rawNewPath);

        if (this._mountsNum === 0) {
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

        const oldPath2 = Path.fromParts(parts1.slice(node1[LEVEL]), engine1.root);
        const newPath2 = Path.fromParts(parts2.slice(node2[LEVEL]), engine2.root);

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
        throw new NotSupportedException("for now cross engine renamings are not supported");
    }

    rmdir(path, callback) {
        this._handlePath("rmdir", this._resolve(path), callback);
    }

    rmdirSync(path) {
        return this._handlePathSync("rmdir", this._resolve(path), []);
    }

    stat(path, options, callback) {
        if (isFunction(options)) {
            callback = options;
            options = {};
        }
        this._handlePath("stat", this._resolve(path), callback, options);
    }

    statSync(path) {
        return this._handlePathSync("stat", this._resolve(path), []);
    }

    symlink(target, path, type, callback) {
        if (isFunction(type)) {
            callback = type;
            type = "file";
        }

        // omg, here we have to swap them...
        // and i think we must resolve the target using the engine that will handle the request
        this._handlePath("symlink", this._resolve(path), callback, new Path(target, this.root), type);
    }

    symlinkSync(target, path, type) {
        return this._handlePathSync("symlink", this._resolve(path), [new Path(target, this.root), type]);
    }

    truncate(path, length, callback) {
        if (isFunction(length)) {
            callback = length;
            length = 0;
        }
        this._handlePath("truncate", this._resolve(path), callback, length);
    }

    truncateSync(path, length = 0) {
        return this._handlePathSync("truncateSync", this._resolve(path), [length]);
    }

    unlink(path, callback) {
        this._handlePath("unlink", this._resolve(path), callback);
    }

    unlinkSync(path) {
        return this._handlePathSync("unlink", this._resolve(path), []);
    }

    utimes(path, atime, mtime, callback) {
        this._handlePath("utimes", this._resolve(path), callback, _toUnixTimestamp(atime), _toUnixTimestamp(mtime));
    }

    utimesSync(path, atime, mtime) {
        return this._handlePathSync("utimes", this._resolve(path), [
            _toUnixTimestamp(atime),
            _toUnixTimestamp(mtime)
        ]);
    }

    watch(filename, options = {}, listener) {
        if (isFunction(options)) {
            [options, listener] = [{}, options];
        }
        if (isString(options)) {
            options = { encoding: options };
        }
        options.encoding = options.encoding || "utf8";
        options.persistent = "persistent" in options ? Boolean(options.persistent) : true;
        options.recursive = Boolean(options.recursive);

        return this._handlePathSync("watch", this._resolve(filename), options, listener);
    }

    watchFile(filename, options = {}, listener) {
        if (isFunction(options)) {
            [options, listener] = [{}, options];
        }
        options.persistent = "persistent" in options ? Boolean(options.persistent) : true;
        options.interval = options.interval || 5007;

        return this._handlePathSync("watchFile", this._resolve(filename), options, listener);
    }

    unwatchFile(filename, listener) {
        return this._handlePathSync("unwatchFile", this._resolve(filename), listener);
    }

    write(fd, buffer, offset, length, position, callback) {
        if (isFunction(offset)) {
            callback = offset;
            offset = undefined;
        } else if (isFunction(length)) {
            callback = length;
            length = undefined;
        } else if (isFunction(position)) {
            callback = position;
            position = undefined;
        }

        if (isBuffer(buffer)) {
            if (!isNumber(offset)) {
                offset = 0;
            }
            if (!isNumber(length)) {
                length = buffer.length - offset;
            }
            if (!isNumber(position) || position < 0) {
                position = null;
            }
            this._handleFd("write", fd, callback, buffer, offset, length, position);
            return;
        }
        if (!isString(buffer)) {
            buffer = String(buffer);
        }
        if (!isNumber(offset)) {
            offset = null;
        }
        if (!isString(length)) {
            length = "utf8";
        }
        this._handleFd("write", fd, callback, buffer, offset, length);
    }

    writeSync(fd, buffer, offset, length, position) {
        if (isBuffer(buffer)) {
            if (!isNumber(offset)) {
                offset = 0;
            }
            if (!isNumber(length)) {
                length = buffer.length - offset;
            }
            if (!isNumber(position) || position < 0) {
                position = null;
            }
            return this._handleFdSync("write", fd, [buffer, offset, length, position]);
        }
        if (!isString(buffer)) {
            buffer = String(buffer);
        }
        if (!isNumber(offset)) {
            offset = null;
        }
        if (!isString(length)) {
            length = "utf8";
        }
        return this._handleFdSync("write", fd, [buffer, offset, length]);
    }

    writeFile(path, data, options, callback) {
        if (isFunction(options)) {
            callback = options;
            options = {};
        }
        if (typeof options !== "object") {
            options = { encoding: options };
        } else {
            options = { ...options };
        }
        options.encoding = options.encoding || "utf8";
        options.mode = options.mode || 0o666;
        options.flag = options.flag || "w";
        this._handlePath("writeFile", this._resolve(path), callback, data, options);
    }

    writeFileSync(path, data, options) {
        if (typeof options !== "object") {
            options = { encoding: options };
        } else {
            options = { ...options };
        }
        options.encoding = options.encoding || "utf8";
        options.mode = options.mode || 0o666;
        options.flag = options.flag || "w";
        return this._handlePathSync("writeFileSync", this._resolve(path), [data, options]);
    }

    // end fs methods


    _handleFdSync(method, mappedFd, args = []) {
        if (!this._fdMap.has(mappedFd)) {
            this._throw("EBADF", syscallMap[method]);
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

    _handleFd(method, mappedFd, callback, ...args) {
        if (!this._fdMap.has(mappedFd)) {
            callback(this._createError("EBADF", syscallMap[method]));
            return;
        }
        const { fd, engine } = this._fdMap.get(mappedFd);
        engine[(engine === this) ? `_${method}` : method](engine, fd, ...args, (err, res) => {
            if (err) {
                callback(err);
                return;
            }
            if (method === "close") {
                // fd has been closed, we can delete the key
                this._fdMap.delete(mappedFd);
            }
            callback(null, res);
        });
    }

    _storeFd(fd, engine) {
        const mapped = this._fd++;
        this._fdMap.set(mapped, { fd, engine });
        return mapped;
    }

    _chooseEngineSync(path, method, dest) {
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
            const engine = node[FS_INSTANCE];

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
                                if (dest) {
                                    err.secondPath = dest;
                                }
                                err.syscall = syscallMap[method];
                            }
                            throw err;
                        }
                        if (!stat.isDirectory()) {
                            this._throw("ENOTDIR", path, dest, syscallMap[method]);
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
                                this._throw("ENOTDIR", path, dest, syscallMap[method]);
                            }
                            const target = engine.readlinkSync(subPath); // eslint-disable-line

                            // it subPath is not a symlink, readlink will throw EINVAL
                            // so here we have a symlink to a directory

                            const targetPath = new Path(target, engine.root);

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
                                    this._throw("ENOENT", path, dest, syscallMap[method]);
                                    break;
                                }
                                case "ENOTDIR": {
                                    this._throw("ENOTDIR", path, dest, syscallMap[method]);
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

    _chooseEngine(path, method, dest, callback) {
        if (!this.structure[path.root]) {
            // must be handled by this engine, no other case
            callback(null, this, this.structure, path.parts);
            return;
        }

        let parts = path.parts.slice();

        // resolve .. that can refer to different engines,
        // but we do not handle cases where symlinks can refer to different engines
        // as i understand if we want to handle it we must stat each part of each path - huge overhead?

        const chooseEngine = () => {
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
            const engine = node[FS_INSTANCE];

            const iterateParts = (j) => {
                if (j >= parts.length) {
                    if (parts.length >= i) {
                        callback(null, engine, node, parts);
                        return;
                    }
                    chooseEngine();
                    return;
                }

                const tryNext = () => {
                    if (j < i) {
                        // moving to another engine
                        chooseEngine();
                        return;
                    }
                    iterateParts(j + 1);
                };

                switch (parts[j]) {
                    case "":
                    case ".": {
                        const subPath = `/${parts.slice(i, j).join("/")}`;
                        engine.stat(subPath, (err, stat) => {
                            if (err) {
                                if (err instanceof FSException) {
                                    err.path = path;
                                    if (dest) {
                                        err.secondPath = dest;
                                    }
                                    err.syscall = syscallMap[method];
                                }
                                callback(err);
                                return;
                            }

                            if (!stat.isDirectory()) {
                                callback(this._createError("ENOTDIR", path.fullPath, dest, syscallMap[method]));
                                return;
                            }
                            parts.splice(j, 1);
                            --j;
                            tryNext();
                        });

                        return;
                    }
                    case "..": {
                        const subPath = `/${parts.slice(i, j).join("/")}`;
                        const checkError = (err) => {
                            switch (err.code) {
                                case "ENOENT": {
                                    callback(this._createError("ENOENT", path.fullPath, dest, syscallMap[method]));
                                    break;
                                }
                                case "ENOTDIR": {
                                    callback(this._createError("ENOTDIR", path.fullPath, dest, syscallMap[method]));
                                    break;
                                }
                                case "EINVAL": {
                                    // the previous part is not a symlink to a directory
                                    parts = parts.slice(0, j - 1).concat(parts.slice(j/* + 1*/));
                                    j -= 2;
                                    tryNext();
                                    break;
                                }
                                default: {
                                    callback(err);
                                }
                            }
                        };
                        engine.stat(subPath, (err, stat) => {
                            if (err) {
                                checkError(err);
                                return;
                            }

                            if (stat.isFile()) {
                                // this is a file, but the pattern is "subPath/.." which is applicable only for directories
                                callback(this._createError("ENOTDIR", path, dest, syscallMap[method]));
                                return;
                            }
                            engine.readlink(subPath, (err, target) => {
                                if (err) {
                                    checkError(err);
                                    return;
                                }
                                // it subPath is not a symlink, readlink will throw EINVAL
                                // so here we have a symlink to a directory

                                const targetPath = new Path(target, engine.root);

                                if (targetPath.absolute) {
                                    // assume all absolute links to be relative to the using engine
                                    parts = parts.slice(0, i).concat(targetPath.parts).concat(parts.slice(j)); // do not cut ".."
                                    j = i + 1;
                                } else {
                                    parts = parts.slice(0, j - 1).concat(targetPath.parts).concat(parts.slice(j)); // also do not cut ".."
                                    j -= 2;
                                }
                                tryNext();
                            });
                        });

                        return;
                    }
                }
                iterateParts(j + 1);
            };
            iterateParts(i + 1);
        };
        chooseEngine();
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
        return err;
    }

    _handlePathSync(method, path, args) {
        if (this._mountsNum === 0) {
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
                            ? unique(res.concat(siblings)).sort()
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
    _handlePath(method, path, callback, ...args) {
        if (this._mountsNum === 0) {
            this[`_${method}`](path, ...args, (err, result) => {
                if (err) {
                    callback(this._handleError(err, method, path, args));
                    return;
                }
                if (method === "open") {
                    // store fd
                    callback(null, this._storeFd(result, this));
                    return;
                }
                callback(null, result);
            });
            return;
        }

        this._chooseEngine(path, method, null, (err, engine, node, parts) => {
            if (err) {
                callback(err);
                return;
            }

            let p;
            const level = node[LEVEL];
            let fn;
            if (engine === this) {
                fn = engine[`_${method}`];
                args.unshift(path.replaceParts(parts));
            } else {
                fn = engine[method];
                args.unshift(`/${parts.slice(level).join("/")}`);
            }

            fn.call(engine, ...args, (err, result) => {
                if (err) {
                    callback(this._handleError(err, method, path, args));
                    return;
                }

                switch (method) {
                    case "readdir": {
                        if (level === 0) {
                            const [, options] = args;
                            const siblings = this._getSiblingMounts(path.replaceParts(parts));

                            const files = siblings
                                ? unique(result.concat(siblings)).sort()
                                : result;

                            callback(null, options.encoding === "buffer"
                                ? files.map((x) => Buffer.from(x))
                                : files);
                            return;
                        }
                        break;
                    }
                    case "open": {
                        /**
                         * this method returns a file descriptor
                         * we must remember which engine returned it to perform reverse substitutions
                         */
                        callback(null, this._storeFd(result, engine));
                        return;
                    }
                    case "realpath": {
                        if (engine !== this) {
                            if (result.startsWith(engine.root)) {
                                p = new Path(`/${result.slice(engine.root.length)}`);
                            } else {
                                p = new Path(result);
                            }
                            callback(null, this._resolve(`/${parts.slice(0, level).concat(p.parts).join("/")}`).fullPath);
                            return;
                        }
                    }
                }
                callback(null, result);
            });
        });
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

    _createError(code, path, dest, syscall) {
        return createError(code, path, dest, syscall);
    }

    _throw(code, path, dest, syscall) {
        throw this._createError(code, path, dest, syscall);
    }

    _resolve(path) {
        return Path.resolve(path, this.root);
    }
}

for (const [method, isAbstract] of fsMethods) {
    const m = `_${method}`;
    if (isAbstract && !BaseFileSystem.prototype[m]) {
        BaseFileSystem.prototype[m] = function () {
            this._throw("ENOSYS", method);
        };
    }
}
