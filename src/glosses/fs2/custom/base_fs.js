/* eslint-disable no-await-in-loop */
/* eslint-disable adone/no-null-comp */
/* eslint-disable adone/no-typeof */

// NOTE: The code of all filesystems must be self-sufficient to avoid any dependence on ADONE and other thrid-parties.
// This requirement is primarily due to the fact that filesystems are used in KRI to implement the bootstraper,
// in which there should not be any third-party dependencies and the size of the codebase should be minimal.

import fs from "fs";
import { isFunction, isNumber, isString, unique } from "../../../common";
import { NotSupportedException } from "../../errors";
import createError, { FSException } from "./errors";
import * as aPath from "../../path";

const { constants } = fs;

const FS_INSTANCE = Symbol("FS_INSTANCE");
const LEVEL = Symbol("LEVEL");
const PARENT = Symbol("PARENT");

// fs methods in alphabetical order
// [name, isAbstract]
const fsMethods = [
    "access",
    "accessSync",
    "appendFile",
    "appendFileSync",
    "chmod",
    "chmodSync",
    "chown",
    "chownSync",
    "chownr", // extra
    "chownrSync", // extra
    "close",
    "closeSync",
    "copyFile",
    "copyFileSync",
    "createReadStream",
    "createWriteStream",
    "exists", // deprecated
    "existsSync",
    "fallocate", // extra
    "fallocateSync", // extra
    "fchmod",
    "fchmodSync",
    "fchown",
    "fchownSync",
    "fdatasync",
    "fdatasyncSync",
    "fstat",
    "fstatSync",
    "fsync",
    "fsyncSync",
    "ftruncate",
    "ftruncateSync",
    "futimes",
    "futimesSync",
    "lchmod",
    "lchmodSync",
    "lchown",
    "lchownSync",
    "link",
    "linkSync",
    "lseek", // extra
    "lseekSync", // extra
    "lstat",
    "lstatSync",
    "mkdir",
    "mkdirSync",
    "mkdtemp",
    "mkdtempSync",
    "mmap", // extra
    "mmapSync", // extra
    "open",
    "openSync",
    "read",
    "readdir",
    "readdirSync",
    "readFile",
    "readFileSync",
    "readlink",
    "readlinkSync",
    "readSync",
    "realpath",
    "realpathSync",
    "rename",
    "renameSync",
    "rmdir",
    "rmdirSync",
    "stat",
    "statSync",
    "symlink",
    "symlinkSync",
    "truncate",
    "truncateSync",
    "unlink",
    "unlinkSync",
    "utimes",
    "utimesSync",
    "write",
    "writeFile",
    "writeFileSync",
    "writeSync",
    "watch",
    "watchFile",
    "unwatchFile"
];

const appenFileOptions = (opts) => {
    let options;
    if (typeof opts !== "object") {
        options = { encoding: opts };
    } else {
        options = opts === null
            ? { encoding: null }
            : { ...opts };
    }
    options.encoding = isString(options.encoding)
        ? options.encoding
        : options.encoding === null
            ? null
            : "utf8";
    options.mode = options.mode || 0o666;
    options.flag = options.flag || "a";
    return options;
};

const readFileOptions = (opts) => {
    let options;
    if (typeof opts !== "object") {
        options = { encoding: opts };
    } else {
        options = opts === null
            ? { encoding: null }
            : { ...opts };
    }
    options.encoding = isString(options.encoding)
        ? options.encoding
        : null;
    options.flag = options.flag || "r";
    return options;
}

const readdirOptions = (opts) => {
    // console.log(opts);
    let options;
    if (typeof opts !== "object") {
        options = { encoding: opts };
    } else {
        options = opts === null
            ? { encoding: null }
            : { ...opts };
    }
    // console.log(adone.inspect(options.encoding));
    options.encoding = isString(options.encoding)
        ? options.encoding
        : options.encoding === null
            ? null
            : "utf8";
    return options;
};

const readlinkOptions = readdirOptions;

const writeFileOptions = (opts) => {
    let options;
    if (typeof opts !== "object") {
        options = { encoding: opts };
    } else {
        options = opts === null
            ? { encoding: null }
            : { ...opts };
    }
    options.encoding = isString(options.encoding)
        ? options.encoding
        : options.encoding === null
            ? null
            : "utf8";
    options.mode = options.mode || 0o666;
    options.flag = options.flag || "w";
    return options;
};


const parsePath = (path) => {
    const info = aPath.parse(path);
    info.full = path.replace(/[\\/]/g, aPath.sep);
    info.parts = [...info.dir.split(aPath.sep), info.base].filter(adone.identity);
    if (info.full.endsWith(aPath.sep)) {
        info.parts.push("");
    }
    info.isAbsolute = info.root.length > 0;
    return info;
};

export default class BaseFileSystem {
    constructor({ root = "/" } = {}) {
        this.structure = {
            [FS_INSTANCE]: this,
            [PARENT]: this,
            [LEVEL]: 0
        };
        this._mountsNum = 0;
        this._fd = 10;
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
        const pathInfo = parsePath(rawPath);

        if (!(pathInfo.root in this.structure)) {
            this.structure[pathInfo.root] = {
                [LEVEL]: 0,
                [FS_INSTANCE]: this // use the current engine by default
            };
            this.structure[pathInfo.root][PARENT] = this.structure[pathInfo.root];
        }
        let root = this.structure[pathInfo.root];
        let level = 0;
        for (const part of pathInfo.parts) {
            if (part.length > 0) { // skip empty parts
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

    access(path, mode, callback) {
        if (isFunction(mode)) {
            callback = mode;
            mode = constants.F_OK;
        }
        this._handlePath("access", path, callback, mode);
    }

    accessSync(path, mode = constants.F_OK) {
        return this._handlePathSync("accessSync", path, mode);
    }

    appendFile(path, data, options, callback) {
        if (isFunction(options)) {
            callback = options;
            options = {};
        }
        if (isNumber(path)) {
            this._handleFd("appendFile", path, callback, data, appenFileOptions(options));
        } else {
            this._handlePath("appendFile", path, callback, data, appenFileOptions(options));
        }
    }

    appendFileSync(path, data, options) {
        if (isNumber(path)) {
            return this._handleFdSync("appendFileSync", path, data, appenFileOptions(options));
        }
        return this._handlePathSync("appendFileSync", path, data, appenFileOptions(options));
    }

    chmod(path, mode, callback) {
        this._handlePath("chmod", path, callback, mode);
    }

    chmodSync(path, mode) {
        return this._handlePathSync("chmodSync", path, mode);
    }

    chown(path, uid, gid, callback) {
        this._handlePath("chown", path, callback, uid, gid);
    }

    chownSync(path, uid, gid) {
        return this._handlePathSync("chownSync", path, uid, gid);
    }

    chownr(path, uid, gid, callback) {
        this._handlePath("chownr", path, callback, uid, gid);
    }

    chownrSync(path, uid, gid) {
        return this._handlePathSync("chownrSync", path, uid, gid);
    }

    close(fd, callback) {
        this._handleFd("close", fd, callback);
    }

    closeSync(fd) {
        return this._handleFdSync("closeSync", fd);
    }

    // TODO
    copyFile(rawSrc, rawDest, flags, callback) {
        if (isFunction(flags)) {
            callback = flags;
            flags = 0;
        }
        const src = rawSrc;
        const dest = rawDest;

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
        //     this._chooseFsInstance(src, "copyfile").catch((err) => {
        //         if (err instanceof FSException) {
        //             err.path = src;
        //             err.secondPath = dest;
        //         }
        //         return Promise.reject(err);
        //     }),
        //     this._chooseFsInstance(dest, "copyfile").catch((err) => {
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
        const src = rawSrc;
        const dest = rawDest;

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
            [engine1, node1, parts1] = this._chooseFsInstanceSync(src, "copyfile");
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
            [engine2, node2, parts2] = this._chooseFsInstanceSync(dest, "copyfile");
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
        return this._handlePathSync("createReadStream", path, options);
    }

    createWriteStream(path, options) {
        return this._handlePathSync("createWriteStream", path, options);
    }

    exists(path, callback) {
        this._handlePath("exists", path, callback);
    }

    existsSync(path) {
        return this._handlePathSync("existsSync", path);
    }

    fallocate(fd, offset, length, callback) {
        this._handleFd("fallocate", fd, callback, offset, length);
    }

    fallocateSync(fd, offset, length) {
        return this._handleFdSync("fallocateSync", fd, offset, length);
    }

    fchmod(fd, mode, callback) {
        this._handleFd("fchmod", fd, callback, mode);
    }

    fchmodSync(fd, mode) {
        return this._handleFdSync("fchmodSync", fd, mode);
    }

    fchown(fd, uid, gid, callback) {
        this._handleFd("fchown", fd, callback, uid, gid);
    }

    fchownSync(fd, uid, gid) {
        return this._handleFdSync("fchownSync", fd, uid, gid);
    }

    fdatasync(fd, callback) {
        this._handleFd("fdatasync", fd, callback);
    }

    fdatasyncSync(fd) {
        return this._handleFdSync("fdatasyncSync", fd);
    }

    fstat(fd, options, callback) {
        if (isFunction(options)) {
            callback = options;
            options = {};
        }
        return this._handleFd("fstat", fd, callback, options);
    }

    fstatSync(fd) {
        return this._handleFdSync("fstatSync", fd);
    }

    fsync(fd, callback) {
        this._handleFd("fsync", fd, callback);
    }

    fsyncSync(fd) {
        return this._handleFdSync("fsyncSync", fd);
    }

    ftruncate(fd, length, callback) {
        if (isFunction(length)) {
            callback = length;
            length = 0;
        }
        this._handleFd("ftruncate", fd, callback, length);
    }

    ftruncateSync(fd, length = 0) {
        return this._handleFdSync("ftruncateSync", fd, length);
    }

    futimes(fd, atime, mtime, callback) {
        this._handleFd("futimes", fd, callback, atime, mtime);
    }

    futimesSync(fd, atime, mtime) {
        return this._handleFdSync("futimesSync", fd, atime, mtime);
    }

    lchmod(path, mode, callback) {
        this._handlePath("lchmod", path, callback, mode);
    }

    lchmodSync(path, mode) {
        return this._handlePathSync("lchmodSync", path, mode);
    }

    lchown(path, uid, gid, callback) {
        this._handlePath("lchown", path, callback, uid, gid);
    }

    lchownSync(path, uid, gid) {
        return this._handlePathSync("lchownSync", path, uid, gid);
    }

    // TODO
    link(rawExistingPath, rawNewPath, callback) {
        const existingPath = rawExistingPath;
        const newPath = rawNewPath;

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
        //     this._chooseFsInstance(existingPath, "rename").catch((err) => {
        //         if (err instanceof FSException) {
        //             err.path = existingPath;
        //             err.secondPath = newPath;
        //         }
        //         return Promise.reject(err);
        //     }),
        //     this._chooseFsInstance(newPath, "rename").catch((err) => {
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
        const existingPath = rawExistingPath;
        const newPath = rawNewPath;

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
            [engine1, node1, parts1] = this._chooseFsInstanceSync(existingPath, "rename");
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
            [engine2, node2, parts2] = this._chooseFsInstanceSync(newPath, "rename");
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

    lseek(fd, position, seekFlags, callback) {
        if (isFunction(seekFlags)) {
            callback = seekFlags;
            seekFlags = 0/*constants.SEEK_SET*/;
        }
        this._handleFd("lseek", fd, callback, position, seekFlags);
    }

    lseekSync(fd, position, seekFlags = 0/*constants.SEEK_SET*/) {
        return this._handleFdSync("lseekSync", fd, position, seekFlags);
    }

    lstat(path, options, callback) {
        if (isFunction(options)) {
            callback = options;
            options = {};
        }
        this._handlePath("lstat", path, callback, options);
    }

    lstatSync(path) {
        return this._handlePathSync("lstatSync", path);
    }

    mkdir(path, options, callback) {
        if (isFunction(options)) {
            callback = options;
            options = 0o777;
        }
        this._handlePath("mkdir", path, callback, options);
    }

    mkdirSync(path, options = 0o777) {
        return this._handlePathSync("mkdirSync", path, options);
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
        return this._handlePathSync("mkdtemp", prefix, options);
    }

    mmap(fd, length, flags, offset, callback) {
        if (isFunction(offset)) {
            callback = offset;
            offset = 0;
        }
        this._handleFd("mmap", fd, callback, length, flags, offset);
    }

    mmapSync(fd, length, flags, offset = 0) {
        return this._handleFdSync("mmapSync", fd, length, flags, offset);
    }

    open(path, flags, mode, callback) {
        if (isFunction(flags)) {
            callback = flags;
            mode = 0o666;
            flags = "r";
        } else if (isFunction(mode)) {
            callback = mode;
            mode = 0o666;
        }
        this._handlePath("open", path, callback, flags, mode);
    }

    openSync(path, flags = "r", mode = 0o666) {
        return this._handlePathSync("openSync", path, flags, mode);
    }

    read(fd, buffer, offset, length, position, callback) {
        this._handleFd("read", fd, callback, buffer, offset, length, position);
    }

    readSync(fd, buffer, offset, length, position) {
        return this._handleFdSync("readSync", fd, buffer, offset, length, position);
    }

    readdir(rawPath, options, callback) {
        if (isFunction(options)) {
            callback = options;
            options = {};
        }
        this._handlePath("readdir", rawPath, callback, readdirOptions(options));
    }

    _readdir(path, options, callback) {
        const siblings = this._getSiblingMounts(path);
        if (!siblings) {
            this._throw("ENOENT", path, null, "scandir");
        }
        // entries must be added inside _handlePath as siblings, hm...
        callback(null, []);
    }

    readdirSync(rawPath, options) {
        return this._handlePathSync("readdirSync", rawPath, readdirOptions(options));
    }

    _readdirSync(path) {
        const siblings = this._getSiblingMounts(path);
        if (!siblings) {
            this._throw("ENOENT", path, null, "scandir");
        }
        // entries must be added inside _handlePath as siblings, hm...
        return [];
    }

    readFile(path, options, callback) {
        if (isFunction(options)) {
            callback = options;
            options = {};
        }
        if (isNumber(path)) {
            this._handleFd("readFile", path, callback, readFileOptions(options));
        } else {
            this._handlePath("readFile", path, callback, readFileOptions(options));
        }
    }

    readFileSync(path, options) {
        if (isNumber(path)) {
            return this._handleFdSync("readFileSync", path, readFileOptions(options));
        }
        return this._handlePathSync("readFileSync", path, readFileOptions(options));
    }

    readlink(path, options, callback) {
        if (isFunction(options)) {
            callback = options;
            options = {};
        }
        this._handlePath("readlink", path, callback, readlinkOptions(options));
    }

    readlinkSync(path, options) {
        return this._handlePathSync("readlinkSync", path, readlinkOptions(options));
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

        this._handlePath("realpath", path, callback, options);
    }

    realpathSync(path, options) {
        if (typeof options !== "object") {
            options = { encoding: options };
        }
        options.encoding = options.encoding || "utf8";

        return this._handlePathSync("realpath", path, options);
    }

    // TODO
    rename(rawOldPath, rawNewPath, callback) {
        const oldPath = rawOldPath;
        const newPath = rawNewPath;

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
        //     this._chooseFsInstance(oldPath, "rename").catch((err) => {
        //         if (err instanceof FSException) {
        //             err.path = oldPath;
        //             err.secondPath = newPath;
        //         }
        //         return Promise.reject(err);
        //     }),
        //     this._chooseFsInstance(newPath, "rename").catch((err) => {
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
        const oldPath = rawOldPath;
        const newPath = rawNewPath;

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
            [engine1, node1, parts1] = this._chooseFsInstanceSync(oldPath, "rename");
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
            [engine2, node2, parts2] = this._chooseFsInstanceSync(newPath, "rename");
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
        this._handlePath("rmdir", path, callback);
    }

    rmdirSync(path) {
        return this._handlePathSync("rmdirSync", path);
    }

    stat(path, options, callback) {
        if (isFunction(options)) {
            callback = options;
            options = {};
        }
        this._handlePath("stat", path, callback, options);
    }

    statSync(path) {
        return this._handlePathSync("statSync", path);
    }

    symlink(target, path, type, callback) {
        if (isFunction(type)) {
            callback = type;
            type = "file";
        }

        // omg, here we have to swap them...
        // and i think we must resolve the target using the engine that will handle the request
        this._handlePath("symlink", target, callback, path, type);
    }

    symlinkSync(target, path, type) {
        return this._handlePathSync("symlinkSync", target, path, type);
    }

    truncate(path, length, callback) {
        if (isFunction(length)) {
            callback = length;
            length = 0;
        }
        this._handlePath("truncate", path, callback, length);
    }

    truncateSync(path, length = 0) {
        return this._handlePathSync("truncateSync", path, length);
    }

    unlink(path, callback) {
        this._handlePath("unlink", path, callback);
    }

    unlinkSync(path) {
        return this._handlePathSync("unlinkSync", path);
    }

    utimes(path, atime, mtime, callback) {
        this._handlePath("utimes", path, callback, atime, mtime);
    }

    utimesSync(path, atime, mtime) {
        return this._handlePathSync("utimesSync", path, atime, mtime);
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

        return this._handlePathSync("watch", filename, options, listener);
    }

    watchFile(filename, options = {}, listener) {
        if (isFunction(options)) {
            [options, listener] = [{}, options];
        }
        options.persistent = "persistent" in options ? Boolean(options.persistent) : true;
        options.interval = options.interval || 5007;

        return this._handlePathSync("watchFile", filename, options, listener);
    }

    unwatchFile(filename, listener) {
        return this._handlePathSync("unwatchFile", filename, listener);
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
        this._handleFd("write", fd, callback, buffer, offset, length, position);
    }

    writeSync(fd, buffer, offset, length, position) {
        return this._handleFdSync("writeSync", fd, buffer, offset, length, position);
    }

    writeFile(path, data, options, callback) {
        if (isFunction(options)) {
            callback = options;
            options = {};
        }
        if (isNumber(path)) {
            this._handleFd("writeFile", path, callback, data, writeFileOptions(options));
        } else {
            this._handlePath("writeFile", path, callback, data, writeFileOptions(options));
        }
    }

    writeFileSync(path, data, options) {
        if (isNumber(path)) {
            return this._handleFdSync("writeFileSync", path, data, writeFileOptions(options));
        }
        return this._handlePathSync("writeFileSync", path, data, writeFileOptions(options));
    }

    // end fs methods


    _handleFdSync(method, mappedFd, ...args) {
        if (!this._fdMap.has(mappedFd)) {
            this._throw("EBADF", null, null, method);
        }
        const { fd, fs } = this._fdMap.get(mappedFd);
        const res = fs[fs === this ? `_${method}` : method](fd, ...args);
        if (method === "close") {
            // fd has been closed, we can delete the key
            this._fdMap.delete(mappedFd);
        }
        return res;
    }

    _handleFd(method, mappedFd, callback, ...args) {
        if (!this._fdMap.has(mappedFd)) {
            callback(this._createError("EBADF", null, null, method));
            return;
        }
        const { fd, fs } = this._fdMap.get(mappedFd);
        fs[fs === this ? `_${method}` : method](fd, ...args, (err, ...args) => {
            if (err) {
                callback(err);
                return;
            }
            if (method === "close") {
                // fd has been closed, we can delete the key
                this._fdMap.delete(mappedFd);
            }
            callback(null, ...args);
        });
    }

    _storeFd(fd, fsInstance) {
        const mapped = this._fd++;
        this._fdMap.set(mapped, { fd, fs: fsInstance });
        return mapped;
    }

    _chooseFsInstanceSync(path, method, dest) {
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
            const fsInstance = node[FS_INSTANCE];

            for (let j = i + 1; j < parts.length; ++j) {
                switch (parts[j]) {
                    case "":
                    case ".": {
                        const subPath = `/${parts.slice(i, j).join("/")}`;
                        let stat;
                        try {
                            stat = fsInstance.statSync(subPath); // eslint-disable-line
                        } catch (err) {
                            if (err instanceof FSException) {
                                err.path = path;
                                if (dest) {
                                    err.secondPath = dest;
                                }
                                err.syscall = method;
                            }
                            throw err;
                        }
                        if (!stat.isDirectory()) {
                            this._throw("ENOTDIR", path, dest, method);
                        }
                        parts.splice(j, 1);
                        --j;
                        break;
                    }
                    case "..": {
                        const subPath = `/${parts.slice(i, j).join("/")}`;
                        try {
                            const stat = fsInstance.statSync(subPath); // eslint-disable-line
                            if (stat.isFile()) {
                                // this is a file, but the pattern is "subPath/.." which is applicable only for directories
                                this._throw("ENOTDIR", path, dest, method);
                            }
                            const target = fsInstance.readlinkSync(subPath); // eslint-disable-line

                            // it subPath is not a symlink, readlink will throw EINVAL
                            // so here we have a symlink to a directory

                            const pathInfo = aPath.parse(target);
                            // const targetPath = new Path(target, fsInstance.root);

                            if (pathInfo.isAbsolute) {
                                // assume all absolute links to be relative to the using engine
                                parts = parts.slice(0, i).concat(pathInfo.parts).concat(parts.slice(j)); // do not cut ".."
                                j = i + 1;
                            } else {
                                parts = parts.slice(0, j - 1).concat(pathInfo.parts).concat(parts.slice(j)); // also do not cut ".."
                                j -= 2;
                            }
                        } catch (err) {
                            switch (err.code) {
                                case "ENOENT": {
                                    this._throw("ENOENT", path, dest, method);
                                    break;
                                }
                                case "ENOTDIR": {
                                    this._throw("ENOTDIR", path, dest, method);
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
                return [fsInstance, node, parts];
            }
        }
    }

    _chooseFsInstance(path, method, dest, callback) {
        const pathInfo = parsePath(path);
        if (!this.structure[pathInfo.root]) {
            // must be handled by this engine, no other case
            callback(null, this, this.structure, pathInfo.parts);
            return;
        }

        let parts = pathInfo.parts.slice();

        // resolve .. that can refer to different engines,
        // but we do not handle cases where symlinks can refer to different engines
        // as i understand if we want to handle it we must stat each part of each path - huge overhead?

        const nextInstance = () => {
            let node = this.structure[pathInfo.root];

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
            const fsInstance = node[FS_INSTANCE];

            const iterateParts = (j) => {
                if (j >= parts.length) {
                    if (parts.length >= i) {
                        callback(null, fsInstance, node, parts);
                        return;
                    }
                    nextInstance();
                    return;
                }

                const tryNext = () => {
                    if (j < i) {
                        // moving to another engine
                        nextInstance();
                        return;
                    }
                    iterateParts(j + 1);
                };

                switch (parts[j]) {
                    case "":
                    case ".": {
                        const subPath = `/${parts.slice(i, j).join("/")}`;
                        fsInstance.stat(subPath, (err, stat) => {
                            if (err) {
                                if (err instanceof FSException) {
                                    err.path = path;
                                    if (dest) {
                                        err.secondPath = dest;
                                    }
                                    err.syscall = method;
                                }
                                callback(err);
                                return;
                            }

                            if (!stat.isDirectory()) {
                                callback(this._createError("ENOTDIR", path, dest, method));
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
                                    callback(this._createError("ENOENT", path, dest, method));
                                    break;
                                }
                                case "ENOTDIR": {
                                    callback(this._createError("ENOTDIR", path, dest, method));
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
                        fsInstance.stat(subPath, (err, stat) => {
                            if (err) {
                                checkError(err);
                                return;
                            }

                            if (stat.isFile()) {
                                // this is a file, but the pattern is "subPath/.." which is applicable only for directories
                                callback(this._createError("ENOTDIR", path, dest, method));
                                return;
                            }
                            fsInstance.readlink(subPath, (err, target) => {
                                if (err) {
                                    checkError(err);
                                    return;
                                }
                                // it subPath is not a symlink, readlink will throw EINVAL
                                // so here we have a symlink to a directory

                                const targetInfo = parsePath(target);

                                if (targetInfo.isAbsolute) {
                                    // assume all absolute links to be relative to the using engine
                                    parts = parts.slice(0, i).concat(targetInfo.parts).concat(parts.slice(j)); // do not cut ".."
                                    j = i + 1;
                                } else {
                                    parts = parts.slice(0, j - 1).concat(targetInfo.parts).concat(parts.slice(j)); // also do not cut ".."
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
        nextInstance();
    }

    _handleError(err, method, path, args) {
        if (err instanceof FSException) {
            switch (method) {
                case "symlink": {
                    err.path = args[0];
                    err.dest = path;
                    break;
                }
                default: {
                    err.path = path;
                }
            }
        }
        return err;
    }

    _handlePathSync(method, path, ...args) {
        const pathInfo = parsePath(path);
        if (this._mountsNum === 0) {
            // only one engine can handle it, itself
            try {
                const res = this[`_${method}`](pathInfo.full, ...args);
                if (method === "openSync") {
                    return this._storeFd(res, this);
                }
                return res;
            } catch (err) {
                throw this._handleError(err, method, pathInfo.full, args);
            }
        }
        const [fsInstance, node, parts] = this._chooseFsInstanceSync(pathInfo.full, method);

        const level = node[LEVEL];

        try {
            const res = fsInstance === this
                ? fsInstance[`_${method}`](`${pathInfo.root}${parts.join(aPath.sep)}`, ...args)
                : fsInstance[method](`${pathInfo.root}${parts.slice(level).join("/")}`, ...args);
            switch (method) {
                case "readdir": {
                    if (level === 0) {
                        const [options] = args;
                        const siblings = this._getSiblingMounts(`${pathInfo.root}${parts.join(aPath.sep)}`);

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
                    return this._storeFd(res, fsInstance);
                }
                case "realpath": {
                    if (fsInstance === this) {
                        return res;
                    }

                    // ...
                    let pathInfo;

                    if (res.startsWith(fsInstance.root)) {
                        pathInfo = parsePath(`/${res.slice(fsInstance.root.length)}`);
                    } else {
                        pathInfo = parsePath(res);
                    }

                    return `/${parts.slice(0, level).concat(pathInfo.parts).join("/")}`;
                }
            }
            return res;
        } catch (err) {
            this._handleError(err, method, pathInfo.full, args);
        }
    }

    /**
     * @param {string} method
     * @param {string} rawPath
     * @param {any[]} args
     */
    _handlePath(method, path, callback, ...args) {
        const pathInfo = parsePath(path);
        if (this._mountsNum === 0) {
            this[`_${method}`](pathInfo.full, ...args, (err, result) => {
                if (err) {
                    callback(this._handleError(err, method, pathInfo.full, args));
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

        this._chooseFsInstance(pathInfo.full, method, null, (err, fsInstance, node, parts) => {
            if (err) {
                callback(err);
                return;
            }

            const level = node[LEVEL];
            let fn;
            if (fsInstance === this) {
                fn = fsInstance[`_${method}`];
                args.unshift(`/${parts.join("/")}`);
            } else {
                fn = fsInstance[method];
                args.unshift(`/${parts.slice(level).join("/")}`);
            }

            fn.call(fsInstance, ...args, (err, result) => {
                if (err) {
                    callback(this._handleError(err, method, path, args));
                    return;
                }

                switch (method) {
                    case "readdir": {
                        if (level === 0) {
                            const [, options] = args;
                            const siblings = this._getSiblingMounts(`/${parts.join("/")}`);

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
                        callback(null, this._storeFd(result, fsInstance));
                        return;
                    }
                    case "realpath": {
                        if (fsInstance !== this) {
                            let pathInfo;
                            if (result.startsWith(fsInstance.root)) {
                                pathInfo = parsePath(`/${result.slice(fsInstance.root.length)}`);
                            } else {
                                pathInfo = parsePath(result);
                            }
                            callback(null, `/${parts.slice(0, level).concat(pathInfo.parts).join("/")}`);
                            return;
                        }
                    }
                }
                callback(null, result);
            });
        });
    }

    _getSiblingMounts(path) {
        const pathInfo = parsePath(path);
        let node = this.structure;
        if (!node[pathInfo.root]) {
            // no mounts - no siblings
            return null;
        }
        node = node[pathInfo.root];
        for (const part of pathInfo.parts) {
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

    // _resolve(path) {
    //     return Path.resolve(path, this.root);
    // }
}

for (const method of fsMethods) {
    const m = `_${method}`;
    if (!BaseFileSystem.prototype[m]) {
        BaseFileSystem.prototype[m] = function () {
            this._throw("ENOSYS", null, null, method);
        };
    }
}
