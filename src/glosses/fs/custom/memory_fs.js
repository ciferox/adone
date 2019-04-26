/* eslint-disable adone/no-typeof */
/* eslint-disable adone/no-undefined-comp */
/* eslint-disable eqeqeq */
/* eslint-disable adone/no-null-comp */

import fs from "fs";
import aPath from "../../path";
import { Readable, Writable } from "stream";
import AsyncFileSystem from "./async_fs";
import createError, { FSException } from "./errors";

// resource counter

import { Leaf } from "./bitmap_tree.js";

const allocate = (tree, counter, snapshot) => {
    let changed;
    let treeNew;
    tree.allocate(
        counter,
        ({ counter: counter_, changed: changed_, tree: tree_ }) => {
            counter = counter_;
            changed = changed_;
            treeNew = tree_;
        },
        snapshot
    );
    // $FlowFixMe: changed is initialised
    return [counter, changed, treeNew];
};

const deallocate = (tree, counter, snapshot) => {
    let changed;
    let treeNew;
    tree.deallocate(
        counter,
        ({ changed: changed_, tree: tree_ }) => {
            changed = changed_;
            treeNew = tree_;
        },
        snapshot
    );
    // $FlowFixMe: changed is initialised
    return [changed, treeNew];
};

const check = (tree, counter) => {
    let set;
    tree.check(
        counter,
        (set_) => {
            set = set_;
        }
    );
    return Boolean(set);
};

/**
 * Class representing allocatable and deallocatable counters.
 * Counters are allocated in sequential manner, this applies to deallocated counters.
 * Once a counter is deallocated, it will be reused on the next allocation.
 * This is a mutable counter, which doesn't use snapshots.
 */
class Counter {
    /**
     * Creates a counter instance.
     * @throws {RangeError} - If blockSize is not a multiple of 32.
     */
    constructor(begin = 0, blockSize = 32, shrink = true, tree) {
        if (blockSize % 32 !== 0) {
            throw new RangeError("Blocksize for Counter must be a multiple of 32");
        }
        this._begin = begin;
        this._tree = tree || new Leaf(blockSize, shrink, 0);
    }

    /**
     * Allocates a counter sequentially.
     * If a counter is specified, it will allocate it explicitly and return a
     * changed boolean.
     * @throws {RangeError} - If the explicitly allocated counter is out of bounds.
     */
    allocate(counter) {
        if (counter != null) {
            if (counter < this._begin) {
                throw new RangeError("Counter needs to be greater or equal to the beginning offset");
            }
            counter = counter - this._begin;
        }
        const [counterAssigned, changed, treeNew] = allocate(this._tree, counter);
        this._tree = treeNew;
        if (counter == null) {
            return counterAssigned + this._begin;
        }
        return changed;
    }

    /**
     * Deallocates a number, it makes it available for reuse.
     */
    deallocate(counter) {
        const [changed, treeNew] = deallocate(this._tree, counter - this._begin);
        this._tree = treeNew;
        return changed;
    }

    /**
     * Checks if a number has been allocated or not.
     */
    check(counter) {
        return check(this._tree, counter - this._begin);
    }
}

const permaProxy = (container, name) => new Proxy({}, {
    getPrototypeOf: (_) => {
        return Reflect.getPrototypeOf(container[name]);
    },
    setPrototypeOf: (_, prototype) => {
        return Reflect.setPrototypeOf(container[name], prototype);
    },
    isExtensible: (_) => {
        return Reflect.isExtensible(container[name]);
    },
    preventExtensions: (_) => {
        return Reflect.preventExtensions(container[name]);
    },
    getOwnPropertyDescriptor: (_, property) => {
        return Reflect.getOwnPropertyDescriptor(container[name], property);
    },
    defineProperty: (_, property, descriptor) => {
        return Reflect.defineProperty(container[name], property, descriptor);
    },
    get: (_, property) => {
        let value = Reflect.get(container[name], property);
        if (typeof value === "function") {
            value = value.bind(container[name]);
        }
        return value;
    },
    set: (_, property, value) => {
        return Reflect.set(container[name], property, value);
    },
    has: (_, property) => {
        return Reflect.has(container[name], property);
    },
    deleteProperty: (_, property) => {
        return Reflect.delete(container[name], property);
    },
    ownKeys: (_) => {
        return Reflect.ownKeys(container[name]);
    },
    apply: (_, that, args) => {
        return Reflect.apply(container[name], that, args);
    },
    construct: (_, args, newTarget) => {
        return Reflect.construct(container[name], args, newTarget);
    }
});


const constants = {
    ...fs.constants,
    O_ACCMODE: 3,
    COPYFILE_EXCL: 1,
    SEEK_SET: 0,
    SEEK_CUR: 1,
    SEEK_END: 2,
    MAP_SHARED: 1,
    MAP_PRIVATE: 2
};

// permissions

const DEFAULT_ROOT_UID = 0;
const DEFAULT_ROOT_GID = 0;

/**
 * Default root directory permissions of `rwxr-xr-x`.
 */
const DEFAULT_ROOT_PERM = (constants.S_IRWXU |
    constants.S_IRGRP |
    constants.S_IXGRP |
    constants.S_IROTH |
    constants.S_IXOTH);

/**
 * Default file permissions of `rw-rw-rw-`.
 */
const DEFAULT_FILE_PERM = (constants.S_IRUSR |
    constants.S_IWUSR |
    constants.S_IRGRP |
    constants.S_IWGRP |
    constants.S_IROTH |
    constants.S_IWOTH);

/**
 * Default directory permissions of `rwxrwxrwx`.
 */
const DEFAULT_DIRECTORY_PERM = constants.S_IRWXU | constants.S_IRWXG | constants.S_IRWXO;

/**
 * Default symlink permissions of `rwxrwxrwx`.
 */
const DEFAULT_SYMLINK_PERM = constants.S_IRWXU | constants.S_IRWXG | constants.S_IRWXO;

/**
 * Applies umask to default set of permissions.
 */
const applyUmask = (perms, umask) => (perms & (~umask));

/**
 * Permission checking relies on ownership details of the iNode.
 * If the accessing user is the same as the iNode user, then only user permissions are used.
 * If the accessing group is the same as the iNode group, then only the group permissions are used.
 * Otherwise the other permissions are used.
 */
const resolveOwnership = (uid, gid, stat) => {
    if (uid === stat.uid) {
        return (stat.mode & constants.S_IRWXU) >> 6;
    } else if (gid === stat.gid) {
        return (stat.mode & constants.S_IRWXG) >> 3;
    }
    return stat.mode & constants.S_IRWXO;
};

/**
 * Checks the desired permissions with user id and group id against the metadata of an iNode.
 * The desired permissions can be bitwise combinations of constants.R_OK, constants.W_OK and constants.X_OK.
 */
const checkPermissions = (access, uid, gid, stat) => (access & resolveOwnership(uid, gid, stat)) === access;

// Streams

class ReadStream extends Readable {
    /**
     * Creates ReadStream.
     * It will asynchronously open the file descriptor if a file path was passed in.
     * It will automatically close the opened file descriptor by default.
     */
    constructor(path, options, vfs) {
        super({
            highWaterMark: options.highWaterMark,
            encoding: options.encoding
        });
        this._vfs = vfs;
        this.bytesRead = 0;
        this.path = path;
        this.fd = (options.fd === undefined) ? null : options.fd;
        this.flags = (options.flags === undefined) ? "r" : options.flags;
        this.mode = (options.mode === undefined) ? DEFAULT_FILE_PERM : options.mode;
        this.autoClose = (options.autoClose === undefined) ? true : options.autoClose;
        this.start = options.start;
        this.end = (options.end === undefined) ? Infinity : options.end;
        this.pos = options.start;
        if (typeof this.fd !== "number") {
            this._open();
        }
        super.on("end", () => {
            if (this.autoClose) {
                this.destroy();
            }
        });
    }

    /**
     * Open file descriptor if ReadStream was constructed from a file path.
     */
    _open() {
        this._vfs.open(this.path, this.flags, this.mode, (e, fd) => {
            if (e) {
                if (this.autoClose) {
                    this.destroy();
                }
                super.emit("error", e);
                return;
            }
            this.fd = fd;
            super.emit("open", fd);
            super.read();
        });
    }

    /**
     * Asynchronous read hook for stream implementation.
     * The size passed into this function is not the requested size, but the high watermark.
     * It's just a heuristic buffering size to avoid sending to many syscalls.
     * However since this is an in-memory filesystem, the size itself is irrelevant.
     * @private
     */
    _read(size) {
        if (typeof this.fd !== "number") {
            super.once("open", () => {
                this._read(size);
            });
            return;
        }
        if (this.destroyed) {
            return;
        }
        // this.pos is only ever used if this.start is specified
        if (this.pos != null) {
            size = Math.min(this.end - this.pos + 1, size);
        }
        if (size <= 0) {
            this.push(null);
            return;
        }

        this._vfs.read(
            this.fd,
            Buffer.allocUnsafe(size),
            0,
            size,
            this.pos,
            (e, bytesRead, buf) => {
                if (e) {
                    if (this.autoClose) {
                        this.destroy();
                    }
                    super.emit("error", e);
                    return;
                }
                if (bytesRead > 0) {
                    this.bytesRead += bytesRead;
                    this.push(buf.slice(0, bytesRead));
                } else {
                    this.push(null);
                }
            }
        );
        if (this.pos != null) {
            this.pos += size;
        }
    }

    /**
     * Destroy hook for stream implementation.
     * @private
     */
    _destroy(e, cb) {
        this._close((e_) => {
            cb(e || e_);
        });
    }

    /**
     * Close file descriptor if ReadStream was constructed from a file path.
     * @private
     */
    _close(cb) {
        if (cb) {
            super.once("close", cb);
        }
        if (typeof this.fd !== "number") {
            super.once("open", () => {
                this._close();
            });
            return;
        }
        if (this.closed) {
            return process.nextTick(() => super.emit("close"));
        }
        this.closed = true;
        this._vfs.close(this.fd, (e) => {
            if (e) {
                this.emit("error", e);
            } else {
                this.emit("close");
            }
        });
        this.fd = null;
    }

}

class WriteStream extends Writable {
    constructor(path, options, vfs) {
        super({
            highWaterMark: options.highWaterMark
        });
        this._vfs = vfs;
        this.bytesWritten = 0;
        this.path = path;
        this.fd = options.fd === undefined ? null : options.fd;
        this.flags = options.flags === undefined ? "w" : options.flags;
        this.mode = options.mode === undefined ? DEFAULT_FILE_PERM : options.mode;
        this.autoClose = options.autoClose === undefined ? true : options.autoClose;
        this.start = options.start;
        this.pos = this.start; // WriteStream maintains its own position
        if (options.encoding) {
            super.setDefaultEncoding(options.encoding);
        }
        if (typeof this.fd !== "number") {
            this._open();
        }
        super.on("finish", () => {
            if (this.autoClose) {
                this.destroy();
            }
        });
    }

    /**
     * Open file descriptor if WriteStream was constructed from a file path.
     * @private
     */
    _open() {
        this._vfs.open(this.path, this.flags, this.mode, (e, fd) => {
            if (e) {
                if (this.autoClose) {
                    this.destroy();
                }
                super.emit("error", e);
                return;
            }
            this.fd = fd;
            super.emit("open", fd);
        });
    }

    /**
     * Asynchronous write hook for stream implementation.
     * @private
     */
    // $FlowFixMe: _write hook adapted from Node `lib/internal/fs/streams.js`
    _write(data, encoding, cb) {
        if (typeof this.fd !== "number") {
            return super.once("open", () => {
                this._write(data, encoding, cb);
            });
        }
        this._vfs.write(this.fd, data, 0, data.length, this.pos, (e, bytesWritten) => {
            if (e) {
                if (this.autoClose) {
                    this.destroy();
                }
                cb(e);
                return;
            }
            this.bytesWritten += bytesWritten;
            cb();
        });
        if (this.pos !== undefined) {
            this.pos += data.length;
        }
    }

    /**
     * Vectorised write hook for stream implementation.
     * @private
     */
    _writev(chunks, cb) {
        this._write(
            Buffer.concat(chunks.map((chunk) => chunk.chunk)),
            undefined,
            cb
        );

    }

    /**
     * Destroy hook for stream implementation.
     * @private
     */
    _destroy(e, cb) {
        this._close((e_) => {
            cb(e || e_);
        });
    }

    /**
     * Close file descriptor if WriteStream was constructed from a file path.
     * @private
     */
    _close(cb) {
        if (cb) {
            super.once("close", cb);
        }
        if (typeof this.fd !== "number") {
            super.once("open", () => {
                this._close();
            });
            return;
        }
        if (this.closed) {
            return process.nextTick(() => super.emit("close"));
        }
        this.closed = true;
        this._vfs.close(this.fd, (e) => {
            if (e) {
                this.emit("error", e);
            } else {
                this.emit("close");
            }
        });
        this.fd = null;
    }

    /**
     * Final hook for stream implementation.
     * @private
     */
    _final(cb) {
        cb();

    }
}


// devices
const MAJOR_BITSIZE = 12;
const MINOR_BITSIZE = 20;
const MAJOR_MAX = (2 ** MAJOR_BITSIZE) - 1;
const MINOR_MAX = (2 ** MINOR_BITSIZE) - 1;
const MAJOR_MIN = 0;
const MINOR_MIN = 0;

class DeviceError extends Error {
    static ERROR_RANGE;

    static ERROR_CONFLICT;

    constructor(code, message) {
        super(message);
        this.code = code;
    }
}

Object.defineProperty(
    DeviceError,
    "ERROR_RANGE",
    { value: 1 }
);

Object.defineProperty(
    DeviceError,
    "ERROR_CONFLICT",
    { value: 2 }
);

class DeviceManager {
    constructor() {
        this._chrCounterMaj = new Counter(MAJOR_MIN);
        this._chrDevices = new Map();
    }

    getChr(major, minor) {
        const devicesAndCounterMin = this._chrDevices.get(major);
        if (devicesAndCounterMin) {
            const [devicesMin] = devicesAndCounterMin;
            return devicesMin.get(minor);
        }
    }

    registerChr(device, major, minor) {
        let autoAllocMaj;
        let autoAllocMin;
        let counterMin;
        let devicesMin;
        try {
            if (major === undefined) {
                major = this._chrCounterMaj.allocate();
                autoAllocMaj = major;
            } else {
                const devicesCounterMin = this._chrDevices.get(major);
                if (!devicesCounterMin) {
                    this._chrCounterMaj.allocate(major);
                    autoAllocMaj = major;
                } else {
                    [devicesMin, counterMin] = devicesCounterMin;
                }
            }
            if (!devicesMin || !counterMin) {
                counterMin = new Counter(MINOR_MIN);
                devicesMin = new Map();
            }
            if (minor === undefined) {
                minor = counterMin.allocate();
                autoAllocMin = minor;
            } else {
                if (!devicesMin.has(minor)) {
                    counterMin.allocate(minor);
                    autoAllocMin = minor;
                } else {
                    throw new DeviceError(DeviceError.ERROR_CONFLICT);
                }
            }
            if (major > MAJOR_MAX ||
                major < MAJOR_MIN ||
                minor > MINOR_MAX ||
                minor < MINOR_MIN) {
                throw new DeviceError(DeviceError.ERROR_RANGE);
            }
            devicesMin.set(minor, device);
            this._chrDevices.set(major, [devicesMin, counterMin]);
            return;
        } catch (e) {
            if (autoAllocMaj != null) {
                this._chrCounterMaj.deallocate(autoAllocMaj);
            }
            if (autoAllocMin != null && counterMin) {
                counterMin.deallocate(autoAllocMin);
            }
            throw e;
        }
    }

    deregisterChr(major, minor) {
        const devicesCounterMin = this._chrDevices.get(major);
        if (devicesCounterMin) {
            const [devicesMin, counterMin] = devicesCounterMin;
            if (devicesMin.delete(minor)) {
                counterMin.deallocate(minor);
            }
            if (!devicesMin.size) {
                this._chrDevices.delete(major);
                this._chrCounterMaj.deallocate(major);
            }
        }
    }
}

const mkDev = (major, minor) => ((major << MINOR_BITSIZE) | minor);

const unmkDev = (dev) => {
    const major = dev >> MINOR_BITSIZE;
    const minor = dev & ((1 << MINOR_BITSIZE) - 1);
    return [major, minor];
};


// 
class CurrentDirectory {
    constructor(iNodeMgr, iNode, curPath = []) {
        this._iNodeMgr = iNodeMgr;
        this._iNode = iNode;
        this._curPath = curPath;
        iNodeMgr.refINode(iNode);
    }

    changeDir(iNode, curPath) {
        this._iNodeMgr.refINode(iNode);
        this._iNodeMgr.unrefINode(this._iNode);
        this._iNode = iNode;
        this._curPath = curPath;
    }

    getINode() {
        return this._iNode;
    }

    getPathStack() {
        return [...this._curPath];
    }

    getPath() {
        return `/${this._curPath.join("/")}`;
    }
}

// INodes

class INode {
    constructor(metadata, iNodeMgr) {
        const now = (new Date()).getTime();
        this._stats = new fs.Stats(
            metadata.dev || 0,
            metadata.mode,
            metadata.nlink,
            metadata.uid,
            metadata.gid,
            metadata.rdev || 0,
            undefined, // blksize: in-memory doesn't have blocks
            metadata.ino,
            metadata.size,
            undefined, // blocks: in-memory doesn't have blocks
            metadata.atimeMs || now,
            metadata.mtimeMs || now,
            metadata.ctimeMs || now,
            metadata.birthtimeMs || now
        );
        this._iNodeMgr = iNodeMgr;
    }

    stat(clone = false) {
        if (clone) {
            const s = this._stats;
            const stat = new fs.Stats();
            stat.dev = s.dev;
            stat.ino = s.inode;
            stat.nlink = s.nlink;
            stat.uid = s.uid;
            stat.gid = s.gid;
            stat.rdev = s.rdev;
            stat.size = s.size;
            stat.blksize = s.blksize;
            stat.blocks = s.blocks;
            stat.mode = s.mode;
            stat.mtime = s.mtime;
            stat.mtimeMs = s.mtimeMs;
            stat.atime = s.atime;
            stat.atimeMs = s.atimeMs;
            stat.ctime = s.ctime;
            stat.ctimeMs = s.ctimeMs;
            stat.birthtime = s.birthtime;
            stat.birthtimeMs = s.birthtimeMs;
            return stat;
        }
        return this._stats;
    }
}

class File extends INode {
    constructor(props, iNodeMgr) {
        super(
            {
                ino: props.ino,
                uid: props.uid,
                gid: props.gid,
                mode: constants.S_IFREG | (props.mode & (~constants.S_IFMT)),
                size: (props.data) ? props.data.byteLength : 0
            },
            iNodeMgr
        );
        if (typeof props.data === "function") {
            let realData;
            const that = this;
            Object.defineProperty(that, "_data", {
                enumerable: true,
                configurable: true,
                get() {
                    realData = props.data();
                    Object.defineProperty(that, "_data", {
                        enumerable: true,
                        writable: true,
                        value: realData
                    });
                    return realData;
                },
                set(newData) {
                    realData = newData;
                    Object.defineProperty(that, "_data", {
                        enumerable: true,
                        writable: true,
                        value: realData
                    });
                }
            });
        } else {
            this._data = props.data
                ? props.data
                : Buffer.allocUnsafe(0);
        }
    }

    getData() {
        return this._data;
    }

    setData(data) {
        this._data = data;
    }

    read() {
    }

    write(buffer, position, append) {
        let data = this._data;
        let bytesWritten;
        if (append) {
            data = Buffer.concat([data, buffer]);
            bytesWritten = buffer.length;
        } else {
            position = Math.min(data.length, position);
            const overwrittenLength = data.length - position;
            const extendedLength = buffer.length - overwrittenLength;
            if (extendedLength > 0) {
                data = Buffer.concat([data, Buffer.allocUnsafe(extendedLength)]);
            }
            bytesWritten = buffer.copy(data, position);
        }
        this._data = data;
        return bytesWritten;
    }

    destructor() {
    }
}

class Directory extends INode {
    /**
     * Creates a directory.
     * Virtual directories have 0 size.
     * If there's no parent inode, we assume this is the root directory.
     */
    constructor(props, iNodeMgr) {
        // root will start with an nlink of 2 due to '..'
        // otherwise start with an nlink of 1
        if (props.parent === undefined) {
            props.parent = props.ino;
        }
        let nlink;
        if (props.parent === props.ino) {
            nlink = 2;
        } else {
            nlink = 1;
            iNodeMgr.linkINode(iNodeMgr.getINode(props.parent));
        }
        super(
            {
                ino: props.ino,
                mode: constants.S_IFDIR | (props.mode & (~constants.S_IFMT)),
                uid: props.uid,
                gid: props.gid,
                nlink,
                size: 0
            },
            iNodeMgr
        );
        this._dir = new Map([
            [".", props.ino],
            ["..", props.parent]
        ]);
    }

    /**
     * Gets an iterator of name to iNode index.
     * This prevents giving out mutability.
     */
    getEntries() {
        this._stats.atime = new Date();
        return this._dir.entries();
    }

    /**
     * Get the inode index for a name.
     */
    getEntryIndex(name) {
        return this._dir.get(name);
    }

    /**
     * Get inode for a name.
     */
    getEntry(name) {
        const index = this._dir.get(name);
        if (index !== undefined) {
            return this._iNodeMgr.getINode(index);
        }

    }

    /**
     * Add a name to inode index to this directory.
     * It will increment the link reference to the inode.
     * It is not allowed to add entries with the names `.` and `..`.
     */
    addEntry(name, index) {
        if (name === "." || name === "..") {
            throw new Error("Not allowed to add `.` or `..` entries");
        }
        const now = new Date();
        this._stats.mtime = now;
        this._stats.ctime = now;
        this._iNodeMgr.linkINode(this._iNodeMgr.getINode(index));
        this._dir.set(name, index);

    }

    /**
     * Delete a name in this directory.
     * It will decrement the link reference to the inode.
     * It is not allowed to delete entries with the names `.` and `..`.
     */
    deleteEntry(name) {
        if (name === "." || name === "..") {
            throw new Error("Not allowed to delete `.` or `..` entries");
        }
        const index = this._dir.get(name);
        if (index !== undefined) {
            const now = new Date();
            this._stats.mtime = now;
            this._stats.ctime = now;
            this._dir.delete(name);
            this._iNodeMgr.unlinkINode(this._iNodeMgr.getINode(index));
        }

    }

    /**
     * Rename a name in this directory.
     */
    renameEntry(oldName, newName) {
        if (oldName === "." || oldName === ".." || newName === "." || oldName === "..") {
            throw new Error("Not allowed to rename `.` or `..` entries");
        }
        const index = this._dir.get(oldName);
        if (index != null) {
            const now = new Date();
            this._stats.mtime = now;
            this._stats.ctime = now;
            this._dir.delete(oldName);
            this._dir.set(newName, index);
        }
    }

    /**
     * This is to be called when all hardlinks and references to this directory reduce to 0.
     * The destructor here is about unlinking the parent directory.
     * Because the `..` will no longer exist.
     */
    destructor() {
        // decrement the parent's nlink due to '..'
        // however do not do this on root otherwise there will be an infinite loop
        if (this._dir.get(".") !== this._dir.get("..")) {
            const parentIndex = this._dir.get("..");
            if (parentIndex != null) {
                this._iNodeMgr.unlinkINode(this._iNodeMgr.getINode(parentIndex));
            }
        }
    }
}

class Symlink extends INode {
    constructor(props, iNodeMgr) {
        super(
            {
                ino: props.ino,
                mode: constants.S_IFLNK | (props.mode & (~constants.S_IFMT)),
                uid: props.uid,
                gid: props.gid,
                size: Buffer.from(props.link).byteLength
            },
            iNodeMgr
        );
        this._link = props.link;
    }

    getLink() {
        return this._link;
    }

    destructor() {
    }
}

class CharacterDev extends INode {
    constructor(props, iNodeMgr) {
        super(
            {
                ino: props.ino,
                mode: constants.S_IFCHR | (props.mode & (~constants.S_IFMT)),
                uid: props.uid,
                gid: props.gid,
                rdev: props.rdev,
                size: 0
            },
            iNodeMgr
        );
    }

    getFileDesOps() {
        const [major, minor] = unmkDev(this.stat().rdev);
        return this._iNodeMgr._devMgr.getChr(major, minor);
    }

    destructor() {

    }
}

/**
 * Class that manages all iNodes including creation and deletion
 */
class INodeManager {
    /**
     * Creates an instance of the INodeManager.
     * It starts the inode counter at 1, as 0 is usually reserved in posix filesystems.
     */
    constructor(devMgr) {
        this._counter = new Counter(1);
        this._iNodes = new Map();
        this._iNodeRefs = new WeakMap();
        this._devMgr = devMgr;
    }

    /**
     * Creates an inode, from a INode constructor function.
     * The returned inode must be used and later manually deallocated.
     */
    createINode(INodeConstructor, props = {}) {
        props.ino = this._counter.allocate();
        props.mode = (typeof props.mode === "number") ? props.mode : 0;
        props.uid = (typeof props.uid === "number") ? props.uid : DEFAULT_ROOT_UID;
        props.gid = (typeof props.gid === "number") ? props.gid : DEFAULT_ROOT_GID;
        const iNode = new INodeConstructor(props, this);
        this._iNodes.set(props.ino, iNode);
        this._iNodeRefs.set(iNode, 0);
        return [iNode, props.ino];
    }

    getINode(index) {
        return this._iNodes.get(index);
    }

    /**
     * Links an inode, this increments the hardlink reference count.
     */
    linkINode(iNode) {
        if (iNode) {
            ++(iNode.stat().nlink);
        }
    }

    /**
     * Unlinks an inode, this decrements the hardlink reference count.
     */
    unlinkINode(iNode) {
        if (iNode) {
            --(iNode.stat().nlink);
            this._gcINode(iNode);
        }
    }

    /**
     * References an inode, this increments the private reference count.
     * Private reference count can be used by file descriptors and working directory position.
     */
    refINode(iNode) {
        if (iNode) {
            const refCount = this._iNodeRefs.get(iNode);
            if (refCount !== undefined) {
                this._iNodeRefs.set(iNode, refCount + 1);
            }
        }
    }

    /**
     * Unreferences an inode, this decrements the private reference count.
     */
    unrefINode(iNode) {
        if (iNode) {
            const refCount = this._iNodeRefs.get(iNode);
            if (refCount !== undefined) {
                this._iNodeRefs.set(iNode, refCount - 1);
                this._gcINode(iNode);
            }
        }
    }

    /**
     * Decides whether to garbage collect the inode.
     * The true usage count is the hardlink count plus the private reference count.
     * Usually if the true usage count is 0, then the inode is garbage collected.
     * However directories are special cased here, due to the `.` circular hardlink.
     * This allows directories to be garbage collected even when their usage count is 1.
     * This is possible also because there cannot be custom hardlinks to directories.
     */
    _gcINode(iNode) {
        const metadata = iNode.stat();
        const useCount = metadata.nlink + this._iNodeRefs.get(iNode);
        if (
            useCount === 0 ||
            (useCount === 1 && iNode instanceof Directory)
        ) {
            const index = metadata.ino;
            iNode.destructor();
            this._iNodes.delete(index);
            this._counter.deallocate(index);
        }
    }
}

// file descriptors

class FileDescriptor {
    constructor(iNode, flags) {
        this._iNode = iNode;
        this._flags = flags;
        this._pos = 0; // Starts the seek position at 0
    }

    getINode() {
        return this._iNode;
    }

    /**
     * Gets the file descriptor flags.
     * Unlike Linux filesystems, this retains creation and status flags.
     */
    getFlags() {
        return this._flags;
    }

    /**
     * Sets the file descriptor flags.
     */
    setFlags(flags) {
        this._flags = flags;
    }

    /**
     * Gets the file descriptor position.
     */
    getPos() {
        return this._pos;
    }

    /**
     * Sets the file descriptor position.
     */
    setPos(pos, flags = constants.SEEK_SET) {
        const iNode = this.getINode();
        let newPos;
        switch (true) {
            case iNode instanceof File:
            case iNode instanceof Directory:
                switch (flags) {
                    case constants.SEEK_SET:
                        newPos = pos;
                        break;
                    case constants.SEEK_CUR:
                        newPos = this._pos + pos;
                        break;
                    case constants.SEEK_END:
                        newPos = iNode.getData().length + pos;
                        break;
                    default:
                        newPos = this._pos;
                }
                if (newPos < 0) {
                    throw createError("EINVAL");
                }
                this._pos = newPos;
                break;
            case iNode instanceof CharacterDev: {
                const fops = iNode.getFileDesOps();
                if (!fops) {
                    throw createError("ENXIO");
                } else if (!fops.setPos) {
                    throw createError("ESPIPE");
                } else {
                    fops.setPos(this, pos, flags);
                }
                break;
            }
            default:
                throw createError("ESPIPE");
        }
    }

    /**
     * Reads from this file descriptor into a buffer.
     * It will always try to fill the input buffer.
     * If position is specified, the position change does not persist.
     * If the current file descriptor position is greater than or equal to the length of the data, this will read 0 bytes.
     */
    read(buffer, position = null) {
        let currentPosition;
        if (position === null) {
            currentPosition = this._pos;
        } else {
            currentPosition = position;
        }
        const iNode = this._iNode;
        let bytesRead;
        switch (true) {
            case iNode instanceof File: {
                const data = iNode.getData();
                const metadata = iNode.stat();
                bytesRead = data.copy(buffer, 0, currentPosition);
                metadata.atime = new Date();
                break;
            }
            case iNode instanceof CharacterDev: {
                const fops = iNode.getFileDesOps();
                if (!fops) {
                    this._throw("ENXIO");
                } else if (!fops.read) {
                    this._throw("EINVAL");
                } else {
                    bytesRead = fops.read(
                        this,
                        buffer,
                        currentPosition
                    );
                }
                break;
            }
            default:
                this._throw("EINVAL");
        }
        if (position === null) {
            this._pos = currentPosition + bytesRead;
        }
        return bytesRead;
    }

    /**
     * Writes to this file descriptor.
     * If position is specified, the position change does not persist.
     */
    write(buffer, position = null, extraFlags = 0) {
        let currentPosition;
        if (position === null) {
            currentPosition = this._pos;
        } else {
            currentPosition = position;
        }
        const iNode = this._iNode;
        let bytesWritten;
        switch (true) {
            case iNode instanceof File: {
                let data = iNode.getData();
                const metadata = iNode.stat();
                if ((this.getFlags() | extraFlags) & constants.O_APPEND) {
                    currentPosition = data.length;
                    data = Buffer.concat([data, buffer]);
                    bytesWritten = buffer.length;
                } else {
                    if (currentPosition > data.length) {
                        data = Buffer.concat([
                            data,
                            Buffer.alloc(currentPosition - data.length),
                            Buffer.allocUnsafe(buffer.length)
                        ]);
                    } else if (currentPosition <= data.length) {
                        const overwrittenLength = data.length - currentPosition;
                        const extendedLength = buffer.length - overwrittenLength;
                        if (extendedLength > 0) {
                            data = Buffer.concat([data, Buffer.allocUnsafe(extendedLength)]);
                        }
                    }
                    bytesWritten = buffer.copy(data, currentPosition);
                }
                iNode.setData(data);
                const now = new Date();
                metadata.mtime = now;
                metadata.ctime = now;
                metadata.size = data.length;
                break;
            }
            case iNode instanceof CharacterDev: {
                const fops = iNode.getFileDesOps();
                if (!fops) {
                    this._throw("ENXIO");
                } else if (!fops.write) {
                    this._throw("EINVAL");
                } else {
                    bytesWritten = fops.write(
                        this,
                        buffer,
                        currentPosition,
                        extraFlags
                    );
                }
                break;
            }
            default:
                this._throw("EINVAL");
        }
        if (position === null) {
            this._pos = currentPosition + bytesWritten;
        }
        return bytesWritten;
    }
}

class FileDescriptorManager {
    /**
     * Creates an instance of the FileDescriptorManager.
     * It starts the fd counter at 0.
     * Make sure not get real fd numbers confused with these fd numbers.
     */
    constructor(iNodeMgr) {
        this._counter = new Counter(0);
        this._fds = new Map();
        this._iNodeMgr = iNodeMgr;
    }

    /**
     * Creates a file descriptor.
     * This will increment the reference to the iNode preventing garbage collection by the INodeManager.
     */
    createFd(iNode, flags) {
        this._iNodeMgr.refINode(iNode);
        const index = this._counter.allocate();
        const fd = new FileDescriptor(iNode, flags);
        if (iNode instanceof CharacterDev) {
            const fops = iNode.getFileDesOps();
            if (!fops) {
                this._throw("ENXIO");
            } else if (fops.open) {
                fops.open(fd);
            }
        }

        this._fds.set(index, fd);

        return [fd, index];
    }

    /**
     * Gets the file descriptor object.
     */
    getFd(index) {
        return this._fds.get(index);
    }

    /**
     * Duplicates file descriptor index.
     * It may return a new file descriptor index that points to the same file descriptor.
     */
    dupFd(index) {
        const fd = this._fds.get(index);
        if (fd) {
            this._iNodeMgr.refINode(fd.getINode());
            const dupIndex = this._counter.allocate();
            this._fds.set(dupIndex, fd);
            return index;
        }
    }

    /**
     * Deletes a file descriptor.
     * This effectively closes the file descriptor.
     * This will decrement the reference to the iNode allowing garbage collection by the INodeManager.
     */
    deleteFd(fdIndex) {
        const fd = this._fds.get(fdIndex);
        if (fd) {
            const iNode = fd.getINode();
            if (iNode instanceof CharacterDev) {
                const fops = iNode.getFileDesOps();
                if (!fops) {
                    this._throw("ENXIO");
                } else if (fops.close) {
                    fops.close(fd);
                }
            }
            this._fds.delete(fdIndex);
            this._counter.deallocate(fdIndex);
            this._iNodeMgr.unrefINode(iNode);
        }
    }
}



// const emptyStats = () => {
//     const s = new fs.Stats();
//     s.dev = 0;
//     s.mode = 0;
//     s.nlink = 0;
//     s.uid = 0;
//     s.gid = 0;
//     s.rdev = 0;
//     s.blksize = isWindows ? undefined : 0;
//     s.ino = 0;
//     s.size = 0;
//     s.blocks = isWindows ? undefined : 0;
//     s.atimeMs = 0;
//     s.mtimeMs = 0;
//     s.ctimeMs = 0;
//     s.birthtimeMs = 0;
//     s.atime = new Date(0);
//     s.mtime = new Date(0);
//     s.ctime = new Date(0);
//     s.birthtime = new Date(0);
//     return s;
// };

// const statEqual = (prev, curr) => {
//     return prev.dev === curr.dev
//         && prev.ino === curr.ino
//         && prev.uid === curr.uid
//         && prev.gid === curr.gid
//         && prev.mode === curr.mode
//         && prev.size === curr.size
//         && prev.birthtimeMs === curr.birthtimeMs
//         && prev.ctimeMs === curr.ctimeMs
//         && prev.mtimeMs === curr.mtimeMs;
// };

// class StatWatcher extends EventEmitter {
//     constructor() {
//         super();
//         this.stopped = false;
//     }

//     async start(engine, filename, options) {
//         const { interval, persistent } = options;

//         // cache watchers?

//         let prev = null;
//         let enoent = false;

//         for (; ;) {
//             if (this.stopped) {
//                 break;
//             }
//             try {
//                 const newStats = await engine.stat(filename); // eslint-disable-line
//                 if (prev === null) {
//                     prev = newStats;
//                 } else if (!statEqual(prev, newStats)) {
//                     enoent = false;
//                     this.emit("change", prev, newStats);
//                     prev = newStats;
//                 }
//             } catch (err) {
//                 if (err.code === "ENOENT") {
//                     if (!enoent) {
//                         if (prev === null) {
//                             prev = emptyStats();
//                         }
//                         const newStats = emptyStats();
//                         this.emit("change", prev, newStats);
//                         enoent = true;
//                         prev = newStats;
//                     }
//                 }
//             }
//             await promise.delay(interval, { unref: !persistent }); // eslint-disable-line
//         }
//     }

//     stop() {
//         this.stopped = true;
//     }
// }

// class FSWatcher extends EventEmitter {
//     constructor() {
//         super();
//         this.engine = false;
//         this.watcher = null;
//         this.mountPath = null;
//         this.closed = false;
//     }

//     setWatcher(watcher) {
//         if (this.closed) { // it can be closed before we set the watcher instance
//             watcher.close();
//             return;
//         }
//         this.watcher = watcher;
//         this.watcher.on("change", (event, filename) => {
//             this.emit("change", event, filename);
//         });
//     }

//     close() {
//         this.closed = true;
//         if (this.watcher) {
//             this.watcher.close();
//         }
//     }
// }


/**
 * Asynchronous callback backup.
 */
const callbackUp = (err) => {
    if (err) {
        throw err;
    }
};

export default class MemoryFileSystem extends AsyncFileSystem {
    constructor({ umask = 0o022, root = "/" } = {}) {
        super({ root });
        this._devMgr = new DeviceManager();
        this._iNodeMgr = new INodeManager(this._devMgr);
        this._fdMgr = new FileDescriptorManager(this._iNodeMgr);

        const [rootNode] = this._iNodeMgr.createINode(Directory, {
            mode: DEFAULT_ROOT_PERM,
            uid: DEFAULT_ROOT_UID,
            gid: DEFAULT_ROOT_GID
        });
        this._uid = DEFAULT_ROOT_UID;
        this._gid = DEFAULT_ROOT_GID;
        this._umask = umask;
        this._root = rootNode;
        this._cwd = new CurrentDirectory(this._iNodeMgr, rootNode);
        // this._fileWatchers = new Map();
    }

    getUmask() {
        return this._umask;
    }

    setUmask(umask) {
        this._umask = umask;
    }

    getUid() {
        return this._uid;
    }

    setUid(uid) {
        this._uid = uid;
    }

    getGid() {
        return this._gid;
    }

    setGid(gid) {
        this._gid = gid;
    }

    cwd() {
        return this._cwd.getPath();
    }

    chdir(path) {
        path = this._getPath(path);
        const navigated = this._navigate(path, true);
        if (!navigated.target) {
            this._throw("ENOENT", path);
        }
        if (!(navigated.target instanceof Directory)) {
            this._throw("ENOTDIR", path);
        }
        if (!this._checkPermissions(constants.X_OK, navigated.target.stat())) {
            this._throw("EACCES", path);
        }
        this._cwd.changeDir(navigated.target, navigated.pathStack);
    }

    registerCharacterDevice(device, major, minor) {
        return this._devMgr.registerChr(device, major, minor);
    }

    // fs methods

    _accessSync(path, mode = constants.F_OK) {
        path = this._getPath(path);
        const target = this._navigate(path, true).target;
        if (!target) {
            this._throw("ENOENT", path);
        }
        if (mode === constants.F_OK) {
            return;
        }
        if (!this._checkPermissions(mode, target.stat())) {
            this._throw("EACCES", path);
        }
    }

    _appendFileSync(file, data = "undefined", options) {
        options = this._getOptions({
            encoding: "utf8",
            mode: DEFAULT_FILE_PERM,
            flag: "a"
        }, options);
        data = this._getBuffer(data, options.encoding);
        let fdIndex;
        try {
            let fd;
            if (typeof file === "number") {
                fd = this._fdMgr.getFd(file);
                if (!fd) {
                    this._throw("EBADF", null, null, "appendFile");
                }
                if (!(fd.getFlags() & (constants.O_WRONLY | constants.O_RDWR))) {
                    this._throw("EBADF", null, null, "appendFile");
                }
            } else {
                [fd, fdIndex] = this.__openSync(file, options.flag, options.mode);
            }
            try {
                fd.write(data, null, constants.O_APPEND);
            } catch (e) {
                if (e instanceof RangeError) {
                    this._throw("EFBIG", null, null, "appendFile");
                }
                throw e;
            }
        } finally {
            if (fdIndex !== undefined) {
                this._closeSync(fdIndex);
            }
        }
    }

    _chmodSync(path, mode) {
        path = this._getPath(path);
        const target = this._navigate(path, true).target;
        if (!target) {
            this._throw("ENOENT", path);
        }
        if (typeof mode !== "number") {
            throw new TypeError("mode must be an integer");
        }
        const targetMetadata = target.stat();
        if (this._uid !== DEFAULT_ROOT_UID && this._uid !== targetMetadata.uid) {
            this._throw("EPERM", null, null, "chmod");
        }
        targetMetadata.mode = (targetMetadata.mode & constants.S_IFMT) | mode;
    }

    _chownSync(path, uid, gid) {
        path = this._getPath(path);
        const target = this._navigate(path, true).target;
        if (!target) {
            this._throw("ENOENT", path);
        }
        const targetMetadata = target.stat();
        if (this._uid !== DEFAULT_ROOT_UID) {
            // you don't own the file
            if (targetMetadata.uid !== this._uid) {
                this._throw("EPERM", null, null, "chown");
            }
            // you cannot give files to others
            if (this._uid !== uid) {
                this._throw("EPERM", null, null, "chown");
            }
            // because we don't have user group hierarchies, we allow chowning to any group
        }
        if (typeof uid === "number") {
            targetMetadata.uid = uid;
        }
        if (typeof gid === "number") {
            targetMetadata.gid = gid;
        }
    }

    _chownrSync(path, uid, gid) {
        path = this._getPath(path);
        this.chownSync(path, uid, gid);
        let children;
        try {
            children = this.readdirSync(path);
        } catch (e) {
            if (e && e.code === "ENOTDIR") {
                return;
            }
            throw e;
        }
        children.forEach((child) => {
            // $FlowFixMe: path is string
            const pathChild = aPath.join(path, child);
            // don't traverse symlinks
            if (!this.lstatSync(pathChild).isSymbolicLink()) {
                this.chownrSync(pathChild, uid, gid);
            }
        });
    }

    _closeSync(fdIndex) {
        if (!this._fdMgr.getFd(fdIndex)) {
            this._throw("EBADF", null, null, "close");
        }
        this._fdMgr.deleteFd(fdIndex);
    }

    _copyFileSync(srcPath, dstPath, flags = 0) {
        srcPath = this._getPath(srcPath);
        dstPath = this._getPath(dstPath);
        let srcFd;
        let srcFdIndex;
        let dstFd;
        let dstFdIndex;
        try {
            // the only things that are copied is the data and the mode
            [srcFd, srcFdIndex] = this.__openSync(srcPath, constants.O_RDONLY);
            const srcINode = srcFd.getINode();
            if (srcINode instanceof Directory) {
                this._throw("EBADF", srcPath, dstPath);
            }
            let dstFlags = constants.WRONLY | constants.O_CREAT;
            if (flags & constants.COPYFILE_EXCL) {
                dstFlags |= constants.O_EXCL;
            }
            [dstFd, dstFdIndex] = this.__openSync(dstPath, dstFlags, srcINode.stat().mode);
            const dstINode = dstFd.getINode();
            if (dstINode instanceof File) {
                dstINode.setData(Buffer.from(srcINode.getData()));
            } else {
                this._throw("EINVAL", srcPath, dstPath);
            }
        } finally {
            if (srcFdIndex !== undefined) {
                this.closeSync(srcFdIndex);
            }
            if (dstFdIndex !== undefined) {
                this.closeSync(dstFdIndex);
            }
        }
    }

    _createReadStream(path, options) {
        path = this._getPath(path);
        options = this._getOptions(
            {
                flags: "r",
                encoding: null,
                fd: null,
                mode: DEFAULT_FILE_PERM,
                autoClose: true,
                end: Infinity
            },
            options
        );
        if (options.start !== undefined) {
            if (options.start > options.end) {
                throw new RangeError("ERR_VALUE_OUT_OF_RANGE");
            }
        }
        return new ReadStream(path, options, this);
    }

    _createWriteStream(path, options) {
        path = this._getPath(path);
        options = this._getOptions(
            {
                flags: "w",
                defaultEncoding: "utf8",
                fd: null,
                mode: DEFAULT_FILE_PERM,
                autoClose: true
            },
            options
        );
        if (options.start !== undefined) {
            if (options.start < 0) {
                throw new RangeError("ERR_VALUE_OUT_OF_RANGE");
            }
        }
        return new WriteStream(path, options, this);
    }

    _existsSync(path) {
        path = this._getPath(path);
        try {
            return Boolean(this._navigate(path, true).target);
        } catch (e) {
            return false;
        }
    }

    _fallocateSync(fdIndex, offset, len) {
        if (offset < 0 || len <= 0) {
            this._throw("EINVAL", null, null, "fallocate");
        }
        const fd = this._fdMgr.getFd(fdIndex);
        if (!fd) {
            this._throw("EBADF", null, null, "fallocate");
        }
        const iNode = fd.getINode();
        if (!(iNode instanceof File)) {
            this._throw("ENODEV", null, null, "fallocate");
        }
        if (!(fd.getFlags() & (constants.O_WRONLY | constants.O_RDWR))) {
            this._throw("EBADF", null, null, "fallocate");
        }
        const data = iNode.getData();
        const metadata = iNode.stat();
        if ((offset + len) > data.length) {
            let newData;
            try {
                newData = Buffer.concat([
                    data,
                    Buffer.alloc((offset + len) - data.length)
                ]);
            } catch (e) {
                if (e instanceof RangeError) {
                    this._throw("EFBIG", null, null, "fallocate");
                }
                throw e;
            }
            iNode.setData(newData);
            metadata.size = newData.length;
        }
        metadata.ctime = new Date();
    }

    _mmapSync(fdIndex, length, flags, offset = 0) {
        if (length < 1 || offset < 0) {
            this._throw("EINVAL", null, null, "mmap");
        }
        const fd = this._fdMgr.getFd(fdIndex);
        if (!fd) {
            this._throw("EBADF", null, null, "mmap");
        }
        const access = fd.getFlags() & constants.O_ACCMODE;
        if (access === constants.O_WRONLY) {
            this._throw("EACCES", null, null, "mmap");
        }
        const iNode = fd.getINode();
        if (!(iNode instanceof File)) {
            this._throw("ENODEV", null, null, "mmap");
        }
        switch (flags) {
            case constants.MAP_PRIVATE:
                return Buffer.from(iNode.getData().slice(offset, offset + length));
            case constants.MAP_SHARED:
                if (access !== constants.O_RDWR) {
                    this._throw("EACCES", null, null, "mmap");
                }
                return permaProxy(iNode, "_data").slice(offset, offset + length);
            default:
                this._throw("EINVAL", null, null, "mmap");
        }
    }

    _fchmodSync(fdIndex, mode) {
        const fd = this._fdMgr.getFd(fdIndex);
        if (!fd) {
            this._throw("EBADF", null, null, "fchmod");
        }
        if (typeof mode !== "number") {
            throw new TypeError("mode must be an integer");
        }
        const fdMetadata = fd.getINode().stat();
        if (this._uid !== DEFAULT_ROOT_UID && this._uid !== fdMetadata.uid) {
            this._throw("EPERM", null, null, "fchmod");
        }
        fdMetadata.mode = (fdMetadata.mode & constants.S_IMFT) | mode;
    }

    _fchownSync(fdIndex, uid, gid) {
        const fd = this._fdMgr.getFd(fdIndex);
        if (!fd) {
            this._throw("EBADF", null, null, "fchown");
        }
        const fdMetadata = fd.getINode().stat();
        if (this._uid !== DEFAULT_ROOT_UID) {
            // you don't own the file
            if (fdMetadata.uid !== this._uid) {
                this._throw("EPERM", null, null, "fchown");
            }
            // you cannot give files to others
            if (this._uid !== uid) {
                this._throw("EPERM", null, null, "fchown");
            }
            // because we don't have user group hierarchies, we allow chowning to any group
        }
        if (typeof uid === "number") {
            fdMetadata.uid = uid;
        }
        if (typeof gid === "number") {
            fdMetadata.gid = gid;
        }
    }

    _fdatasyncSync(fdIndex) {
        if (!this._fdMgr.getFd(fdIndex)) {
            this._throw("EBADF", null, null, "fdatasync");
        }
    }

    _fstatSync(fdIndex) {
        const fd = this._fdMgr.getFd(fdIndex);
        if (!fd) {
            this._throw("EBADF", null, null, "fstat");
        }
        return fd.getINode().stat(true);
    }

    _fsyncSync(fdIndex) {
        if (!this._fdMgr.getFd(fdIndex)) {
            this._throw("EBADF", null, null, "fsync");
        }
    }

    _ftruncateSync(fdIndex, len = 0) {
        if (len < 0) {
            this._throw("EINVAL", null, null, "ftruncate");
        }
        const fd = this._fdMgr.getFd(fdIndex);
        if (!fd) {
            this._throw("EBADF", null, null, "ftruncate");
        }
        const iNode = fd.getINode();
        if (!(iNode instanceof File)) {
            this._throw("EINVAL", null, null, "ftruncate");
        }
        if (!(fd.getFlags() & (constants.O_WRONLY | constants.O_RDWR))) {
            this._throw("EINVAL", null, null, "ftruncate");
        }
        const data = iNode.getData();
        const metadata = iNode.stat();
        let newData;
        try {
            if (len > data.length) {
                newData = Buffer.alloc(len);
                data.copy(newData, 0, 0, data.length);
                iNode.setData(newData);
            } else if (len < data.length) {
                newData = Buffer.allocUnsafe(len);
                data.copy(newData, 0, 0, len);
                iNode.setData(newData);
            } else {
                newData = data;
            }
        } catch (e) {
            if (e instanceof RangeError) {
                this._throw("EFBIG", null, null, "ftruncate");
            }
            throw e;
        }
        const now = new Date();
        metadata.mtime = now;
        metadata.ctime = now;
        metadata.size = newData.length;
        fd.setPos(Math.min(newData.length, fd.getPos()));
    }

    _futimesSync(fdIndex, atime, mtime) {
        const fd = this._fdMgr.getFd(fdIndex);
        if (!fd) {
            this._throw("EBADF", null, null, "futimes");
        }
        const metadata = fd.getINode().stat();
        let newAtime;
        let newMtime;
        if (typeof atime === "number") {
            newAtime = new Date(atime * 1000);
        } else if (typeof atime === "string") {
            newAtime = new Date(parseInt(atime) * 1000);
        } else if (atime instanceof Date) {
            newAtime = atime;
        } else {
            throw new TypeError("atime and mtime must be dates or unixtime in seconds");
        }
        if (typeof mtime === "number") {
            newMtime = new Date(mtime * 1000);
        } else if (typeof mtime === "string") {
            newMtime = new Date(parseInt(mtime) * 1000);
        } else if (mtime instanceof Date) {
            newMtime = mtime;
        } else {
            throw new TypeError("atime and mtime must be dates or unixtime in seconds");
        }
        metadata.atime = newAtime;
        metadata.mtime = newMtime;
        metadata.ctime = new Date();
    }

    _lchmodSync(path, mode) {
        path = this._getPath(path);
        const target = this._navigate(path, false).target;
        if (!target) {
            this._throw("ENOENT", path);
        }
        if (typeof mode !== "number") {
            throw new TypeError("mode must be an integer");
        }
        const targetMetadata = target.stat();
        if (this._uid !== DEFAULT_ROOT_UID && this._uid !== targetMetadata.uid) {
            this._throw("EPERM", null, null, "lchmod");
        }
        targetMetadata.mode = (targetMetadata.mode & constants.S_IFMT) | mode;
    }

    _lchownSync(path, uid, gid) {
        path = this._getPath(path);
        const target = this._navigate(path, false).target;
        if (!target) {
            this._throw("ENOENT", path);
        }
        const targetMetadata = target.stat();
        if (this._uid !== DEFAULT_ROOT_UID) {
            // you don't own the file
            if (targetMetadata.uid !== this._uid) {
                this._throw("EPERM", null, null, "lchown");
            }
            // you cannot give files to others
            if (this._uid !== uid) {
                this._throw("EPERM", null, null, "lchown");
            }
            // because we don't have user group hierarchies, we allow chowning to any group
        }
        if (typeof uid === "number") {
            targetMetadata.uid = uid;
        }
        if (typeof gid === "number") {
            targetMetadata.gid = gid;
        }
    }

    _linkSync(existingPath, newPath) {
        existingPath = this._getPath(existingPath);
        newPath = this._getPath(newPath);
        const navigatedExisting = this._navigate(existingPath, false);
        const navigatedNew = this._navigate(newPath, false);
        if (!navigatedExisting.target) {
            this._throw("ENOENT", existingPath, newPath, "link");
        }
        if (navigatedExisting.target instanceof Directory) {
            this._throw("EPERM", existingPath, newPath, "link");
        }
        if (!navigatedNew.target) {
            if (navigatedNew.dir.stat().nlink < 2) {
                this._throw("ENOENT", existingPath, newPath, "link");
            }
            if (!this._checkPermissions(constants.W_OK, navigatedNew.dir.stat())) {
                this._throw("EACCES", existingPath, newPath, "link");
            }
            const index = navigatedExisting.dir.getEntryIndex(navigatedExisting.name);
            navigatedNew.dir.addEntry(navigatedNew.name, index);
            navigatedExisting.target.stat().ctime = new Date();
        } else {
            this._throw("EEXIST", existingPath, newPath, "link");
        }
    }

    _lseekSync(fdIndex, position, seekFlags = constants.SEEK_SET) {
        const fd = this._fdMgr.getFd(fdIndex);
        if (!fd) {
            this._throw("EBADF", null, null, "lseek");
        }
        if (![constants.SEEK_SET, constants.SEEK_CUR, constants.SEEK_END].includes(seekFlags)) {
            this._throw("EINVAL", null, null, "lseek");
        }
        try {
            fd.setPos(position, seekFlags);
        } catch (e) {
            if (e instanceof FSException) {
                e.syscall = "lseek";
            }
            throw e;
        }
    }

    _lstatSync(path) {
        path = this._getPath(path);
        const { target } = this._navigate(path, false);
        if (target) {
            return target.stat(true);
        }
        this._throw("ENOENT", path);
    }

    _mkdirSync(path, mode = DEFAULT_DIRECTORY_PERM) {
        path = this._getPath(path);
        // we expect a non-existent directory
        path = path.replace(/(.+?)\/+$/, "$1");
        const navigated = this._navigate(path, true);
        if (navigated.target) {
            this._throw("EEXIST", path, null, "mkdir");
        } else if (!navigated.target && navigated.remaining) {
            this._throw("ENOENT", path, null, "mkdir");
        } else if (!navigated.target) {
            if (navigated.dir.stat().nlink < 2) {
                this._throw("ENOENT", path, null, "mkdir");
            }
            if (!this._checkPermissions(
                constants.W_OK,
                navigated.dir.stat()
            )) {
                this._throw("EACCES", path, null, "mkdir");
            }
            const [, index] = this._iNodeMgr.createINode(
                Directory,
                {
                    mode: applyUmask(mode, this._umask),
                    uid: this._uid,
                    gid: this._gid,
                    parent: navigated.dir.getEntryIndex(".")
                }
            );
            navigated.dir.addEntry(navigated.name, index);
        }
    }

    // mkdirp(path, ...args) {
    //     let cbIndex = args.findIndex((arg) => typeof arg === "function");
    //     const callback = args[cbIndex] || callbackUp;
    //     cbIndex = (cbIndex >= 0) ? cbIndex : args.length;
    //     this._callAsync(this.mkdirpSync.bind(this), [path, ...args.slice(0, cbIndex)], callback, callback);
    // }

    // mkdirpSync(path, mode = DEFAULT_DIRECTORY_PERM) {
    //     path = this._getPath(path);
    //     // we expect a directory
    //     path = path.replace(/(.+?)\/+$/, "$1");
    //     let iNode;
    //     let index;
    //     let currentDir;
    //     let navigated = this._navigate(path, true);
    //     while (true) {
    //         if (!navigated.target) {
    //             if (navigated.dir.stat().nlink < 2) {
    //                 this._throw("ENOENT", path);
    //             }
    //             if (!this._checkPermissions(
    //                 constants.W_OK,
    //                 navigated.dir.stat()
    //             )) {
    //                 this._throw("EACCES", path);
    //             }
    //             [iNode, index] = this._iNodeMgr.createINode(
    //                 Directory,
    //                 {
    //                     mode: applyUmask(mode, this._umask),
    //                     uid: this._uid,
    //                     gid: this._gid,
    //                     parent: navigated.dir.getEntryIndex(".")
    //                 }
    //             );
    //             navigated.dir.addEntry(navigated.name, index);
    //             if (navigated.remaining) {
    //                 currentDir = iNode;
    //                 navigated = this._navigateFrom(currentDir, navigated.remaining, true);
    //             } else {
    //                 break;
    //             }
    //         } else if (!(navigated.target instanceof Directory)) {
    //             this._throw("ENOTDIR", path);
    //         } else {
    //             break;
    //         }
    //     }
    // }

    _mkdtempSync(pathSPrefix, options) {
        options = this._getOptions({ encoding: "utf8" }, options);
        if (!pathSPrefix || typeof pathSPrefix !== "string") {
            throw new TypeError("filename prefix is required");
        }
        const getChar = () => {
            const possibleChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
            return possibleChars[Math.floor(Math.random() * possibleChars.length)];
        };
        let pathS;
        while (true) {
            pathS = pathSPrefix.concat(
                Array.from({ length: 6 }, () => getChar).map((f) => f()).join("")
            );
            try {
                this.mkdirSync(pathS);
                if (options.encoding === "buffer") {
                    return Buffer.from(pathS);
                }
                return Buffer.from(pathS).toString(options.encoding);

            } catch (e) {
                if (e.code !== "EEXIST") {
                    throw e;
                }
            }
        }
    }

    mknod(path, type, major, minor, ...args) {
        let cbIndex = args.findIndex((arg) => typeof arg === "function");
        const callback = args[cbIndex] || callbackUp;
        cbIndex = (cbIndex >= 0) ? cbIndex : args.length;
        this._callAsync(this.mknodSync.bind(this), [path, type, major, minor, ...args.slice(0, cbIndex)], callback, callback);
    }

    mknodSync(path, type, major, minor, mode = DEFAULT_FILE_PERM) {
        path = this._getPath(path);
        const navigated = this._navigate(path, false);
        if (navigated.target) {
            this._throw("EEXIST", path, null, "mknod");
        }
        if (navigated.dir.stat().nlink < 2) {
            this._throw("ENOENT", path, null, "mknod");
        }
        if (!this._checkPermissions(constants.W_OK, navigated.dir.stat())) {
            this._throw("EACCES", path, null, "mknod");
        }
        let index;
        switch (type) {
            case constants.S_IFREG:
                [, index] = this._iNodeMgr.createINode(
                    File,
                    {
                        mode: applyUmask(mode, this._umask),
                        uid: this._uid,
                        gid: this._gid
                    }
                );
                break;
            case constants.S_IFCHR:
                if (typeof major !== "number" || typeof minor !== "number") {
                    throw new TypeError("major and minor must set as numbers when creating device nodes");
                }
                if (major > MAJOR_MAX || minor > MINOR_MAX || minor < MAJOR_MIN || minor < MINOR_MIN) {
                    this._throw("EINVAL", path, null, "mknod");
                }
                [, index] = this._iNodeMgr.createINode(
                    CharacterDev,
                    {
                        mode: applyUmask(mode, this._umask),
                        uid: this._uid,
                        gid: this._gid,
                        rdev: mkDev(major, minor)
                    }
                );
                break;
            default:
                this._throw("EPERM", path, null, "mknod");
        }
        navigated.dir.addEntry(navigated.name, index);
    }

    _openSync(path, flags, mode = DEFAULT_FILE_PERM) {
        return this.__openSync(path, flags, mode)[1];
    }

    __openSync(path, flags, mode = DEFAULT_FILE_PERM) {
        path = this._getPath(path);
        if (typeof flags === "string") {
            switch (flags) {
                case "r":
                case "rs":
                    flags = constants.O_RDONLY;
                    break;
                case "r+":
                case "rs+":
                    flags = constants.O_RDWR;
                    break;
                case "w":
                    flags = (constants.O_WRONLY |
                        constants.O_CREAT |
                        constants.O_TRUNC);
                    break;
                case "wx":
                    flags = (constants.O_WRONLY |
                        constants.O_CREAT |
                        constants.O_TRUNC |
                        constants.O_EXCL);
                    break;
                case "w+":
                    flags = (constants.O_RDWR |
                        constants.O_CREAT |
                        constants.O_TRUNC);
                    break;
                case "wx+":
                    flags = (constants.O_RDWR |
                        constants.O_CREAT |
                        constants.O_TRUNC |
                        constants.O_EXCL);
                    break;
                case "a":
                    flags = (constants.O_WRONLY |
                        constants.O_APPEND |
                        constants.O_CREAT);
                    break;
                case "ax":
                    flags = (constants.O_WRONLY |
                        constants.O_APPEND |
                        constants.O_CREAT |
                        constants.O_EXCL);
                    break;
                case "a+":
                    flags = (constants.O_RDWR |
                        constants.O_APPEND |
                        constants.O_CREAT);
                    break;
                case "ax+":
                    flags = (constants.O_RDWR |
                        constants.O_APPEND |
                        constants.O_CREAT |
                        constants.O_EXCL);
                    break;
                default:
                    throw new TypeError(`Unknown file open flag: ${flags}`);
            }
        }
        if (typeof flags !== "number") {
            throw new TypeError(`Unknown file open flag: ${flags}`);
        }
        let navigated = this._navigate(path, false);
        if (navigated.target instanceof Symlink) {
            // cannot be symlink if O_NOFOLLOW
            if (flags & constants.O_NOFOLLOW) {
                this._throw("ELOOP", path, null, "open");
            }
            navigated = this._navigateFrom(
                navigated.dir,
                navigated.name + navigated.remaining,
                true,
                undefined,
                undefined,
                path
            );
        }
        let target = navigated.target;
        // cannot be missing unless O_CREAT
        if (!target) {
            // O_CREAT only applies if there's a left over name without any remaining path
            if (!navigated.remaining && (flags & constants.O_CREAT)) {
                // cannot create if the current directory has been unlinked from its parent directory
                if (navigated.dir.stat().nlink < 2) {
                    this._throw("ENOENT", path, null, "open");
                }
                if (!this._checkPermissions(
                    constants.W_OK,
                    navigated.dir.stat()
                )) {
                    this._throw("EACCES", path, null, "open");
                }
                let index;
                [target, index] = this._iNodeMgr.createINode(
                    File,
                    {
                        mode: applyUmask(mode, this._umask),
                        uid: this._uid,
                        gid: this._gid
                    }
                );
                navigated.dir.addEntry(navigated.name, index);
            } else {
                this._throw("ENOENT", path, null, "open");
            }
        } else {
            // target already exists cannot be created exclusively
            if ((flags & constants.O_CREAT) && (flags & constants.O_EXCL)) {
                this._throw("EEXIST", path, null, "open");
            }
            // cannot be directory if write capabilities are requested
            if ((target instanceof Directory) &&
                (flags & (constants.O_WRONLY | flags & constants.O_RDWR))) {
                this._throw("EISDIR", path, null, "open");
            }
            // must be directory if O_DIRECTORY
            if ((flags & constants.O_DIRECTORY) && !(target instanceof Directory)) {
                this._throw("ENOTDIR", path, null, "open");
            }
            // must truncate a file if O_TRUNC
            if ((flags & constants.O_TRUNC) &&
                (target instanceof File) &&
                (flags & (constants.O_WRONLY | constants.O_RDWR))) {
                target.setData(Buffer.alloc(0));
            }
            // convert file descriptor access flags into bitwise permission flags
            let access;
            if (flags & constants.O_RDWR) {
                access = constants.R_OK | constants.W_OK;
            } else if (flags & constants.O_WRONLY) {
                access = constants.W_OK;
            } else {
                access = constants.R_OK;
            }
            if (!this._checkPermissions(access, target.stat())) {
                this._throw("EACCES", path, null, "open");
            }
        }
        try {
            const fd = this._fdMgr.createFd(target, flags);
            return fd;
        } catch (e) {
            if (e instanceof FSException) {
                e.path = path;
                e.syscall = "open";
            }
            throw e;
        }
    }

    _readSync(fdIndex, buffer, offset = 0, length = 0, position = null) {
        const fd = this._fdMgr.getFd(fdIndex);
        if (!fd) {
            this._throw("EBADF", null, null, "read");
        }
        if (typeof position === "number" && position < 0) {
            this._throw("EINVAL", null, null, "read");
        }
        if (fd.getINode().stat().isDirectory()) {
            this._throw("EISDIR", null, null, "read");
        }
        const flags = fd.getFlags();
        if (flags & constants.O_WRONLY) {
            this._throw("EBADF", null, null, "read");
        }
        if (offset < 0 || offset > buffer.length) {
            throw new RangeError("Offset is out of bounds");
        }
        if (length < 0 || length > buffer.length) {
            throw new RangeError("Length extends beyond buffer");
        }
        buffer = this._getBuffer(buffer).slice(offset, offset + length);
        let bytesRead;
        try {
            bytesRead = fd.read(buffer, position);
        } catch (e) {
            if (e instanceof FSException) {
                e.syscall = "read";
            }
            throw e;
        }
        return bytesRead;
    }

    _readdirSync(path, options) {
        path = this._getPath(path);
        options = this._getOptions({ encoding: "utf8" }, options);
        const navigated = this._navigate(path, true);
        if (!navigated.target) {
            this._throw("ENOENT", path, null, "readdir");
        }
        if (!(navigated.target instanceof Directory)) {
            this._throw("ENOTDIR", path, null, "readdir");
        }
        if (!this._checkPermissions(constants.R_OK, navigated.target.stat())) {
            this._throw("EACCES", path, null, "readdir");
        }
        return [...navigated.target.getEntries()]
            .filter(([name, _]) => name !== "." && name !== "..")
            .map(([name, _]) => {
                // $FlowFixMe: options exists
                if (options.encoding === "buffer") {
                    return Buffer.from(name);
                }
                // $FlowFixMe: options exists and is not a string
                return Buffer.from(name).toString(options.encoding);

            });
    }

    _readFileSync(file, options) {
        options = this._getOptions({ encoding: null, flag: "r" }, options);
        let fdIndex;
        try {
            const buffer = Buffer.allocUnsafe(4096);
            let totalBuffer = Buffer.alloc(0);
            let bytesRead = null;
            if (typeof file === "number") {
                while (bytesRead !== 0) {
                    bytesRead = this._readSync(file, buffer, 0, buffer.length);
                    totalBuffer = Buffer.concat([totalBuffer, buffer.slice(0, bytesRead)]);
                }
            } else {
                fdIndex = this._openSync(file, options.flag);
                while (bytesRead !== 0) {
                    bytesRead = this._readSync(fdIndex, buffer, 0, buffer.length);
                    totalBuffer = Buffer.concat([totalBuffer, buffer.slice(0, bytesRead)]);
                }
            }
            return (options.encoding) ? totalBuffer.toString(options.encoding) : totalBuffer;
        } finally {
            if (fdIndex !== undefined) {
                this._closeSync(fdIndex);
            }
        }
    }

    _readlinkSync(path, options) {
        path = this._getPath(path);
        options = this._getOptions({ encoding: "utf8" }, options);
        const target = this._navigate(path, false).target;
        if (!target) {
            this._throw("ENOENT", path);
        }
        if (!(target instanceof Symlink)) {
            this._throw("EINVAL", path);
        }
        const link = target.getLink();
        if (options.encoding === "buffer") {
            return Buffer.from(link);
        }
        return Buffer.from(link).toString(options.encoding);
    }

    _realpathSync(path, options) {
        path = this._getPath(path);
        options = this._getOptions({ encoding: "utf8" }, options);
        const navigated = this._navigate(path, true);
        if (!navigated.target) {
            this._throw("ENOENT", path);
        }
        if (options.encoding === "buffer") {
            return Buffer.from(`/${navigated.pathStack.join("/")}`);
        }
        return Buffer.from(`/${navigated.pathStack.join("/")}`).toString(options.encoding);
    }

    _renameSync(oldPath, newPath) {
        oldPath = this._getPath(oldPath);
        newPath = this._getPath(newPath);
        const navigatedSource = this._navigate(oldPath, false);
        const navigatedTarget = this._navigate(newPath, false);
        if (!navigatedSource.target) {
            this._throw("ENOENT", oldPath, newPath, "rename");
        }
        if (navigatedSource.target instanceof Directory) {
            // if oldPath is a directory, target must be a directory (if it exists)
            if (navigatedTarget.target &&
                !(navigatedTarget.target instanceof Directory)) {
                this._throw("ENOTDIR", oldPath, newPath, "rename");
            }
            // neither oldPath nor newPath can point to root
            if (navigatedSource.target === this._root ||
                navigatedTarget.target === this._root) {
                this._throw("EBUSY", oldPath, newPath, "rename");
            }
            // if the target directory contains elements this cannot be done
            // this can be done without read permissions
            if (navigatedTarget.target && ([...navigatedTarget.target.getEntries()].length - 2)) {
                this._throw("ENOTEMPTY", oldPath, newPath, "rename");
            }
            // if any of the paths used .. or ., then `dir` is not the parent directory
            if (navigatedSource.name === "." ||
                navigatedSource.name === ".." ||
                navigatedTarget.name === "." ||
                navigatedTarget.name === "..") {
                this._throw("EBUSY", oldPath, newPath, "rename");
            }
            // cannot rename a source prefix of target
            if (navigatedSource.pathStack.length < navigatedTarget.pathStack.length) {
                let prefixOf = true;
                for (let i = 0; i < navigatedSource.pathStack.length; ++i) {
                    if (navigatedSource.pathStack[i] !== navigatedTarget.pathStack[i]) {
                        prefixOf = false;
                        break;
                    }
                }
                if (prefixOf) {
                    this._throw("EINVAL", oldPath, newPath, "rename");
                }
            }
        } else {
            // if oldPath is not a directory, then newPath cannot be an existing directory
            if (navigatedTarget.target && navigatedTarget.target instanceof Directory) {
                this._throw("EISDIR", oldPath, newPath, "rename");
            }
        }
        // both the navigatedSource.dir and navigatedTarget.dir must support write permissions
        if (!this._checkPermissions(constants.W_OK, navigatedSource.dir.stat()) ||
            !this._checkPermissions(constants.W_OK, navigatedTarget.dir.stat())) {
            this._throw("EACCES", oldPath, newPath, "rename");
        }
        // if they are in the same directory, it is simple rename
        if (navigatedSource.dir === navigatedTarget.dir) {
            navigatedSource.dir.renameEntry(navigatedSource.name, navigatedTarget.name);
            return;
        }
        const index = navigatedSource.dir.getEntryIndex(navigatedSource.name);
        if (navigatedTarget.target) {
            navigatedTarget.target.stat().ctime = new Date();
            navigatedTarget.dir.deleteEntry(navigatedTarget.name);
            navigatedTarget.dir.addEntry(navigatedTarget.name, index);
        } else {
            if (navigatedTarget.dir.stat().nlink < 2) {
                this._throw("ENOENT", oldPath, newPath, "rename");
            }
            navigatedTarget.dir.addEntry(navigatedTarget.name, index);
        }
        navigatedSource.target.stat().ctime = new Date();
        navigatedSource.dir.deleteEntry(navigatedSource.name);
    }

    _rmdirSync(path) {
        path = this._getPath(path);
        // if the path has trailing slashes, navigation would traverse into it
        // we must trim off these trailing slashes to allow these directories to be removed
        path = path.replace(/(.+?)\/+$/, "$1");
        const navigated = this._navigate(path, false);
        // this is for if the path resolved to root
        if (!navigated.name) {
            this._throw("EBUSY", path, null, "rmdir");
        }
        // on linux, when .. is used, the parent directory becomes unknown
        // in that case, they return with ENOTEMPTY
        // but the directory may in fact be empty
        // for this edge case, we instead use EINVAL
        if (navigated.name === "." || navigated.name === "..") {
            this._throw("EINVAL", path, null, "rmdir");
        }
        if (!navigated.target) {
            this._throw("ENOENT", path, null, "rmdir");
        }
        if (!(navigated.target instanceof Directory)) {
            this._throw("ENOTDIR", path, null, "rmdir");
        }
        if ([...navigated.target.getEntries()].length - 2) {
            this._throw("ENOTEMPTY", path, null, "rmdir");
        }
        if (!this._checkPermissions(constants.W_OK, navigated.dir.stat())) {
            this._throw("EACCES", path, null, "rmdir");
        }
        navigated.dir.deleteEntry(navigated.name);
    }

    _statSync(path, options) {
        path = this._getPath(path);
        const { target } = this._navigate(path, true);
        if (target) {
            return target.stat(true);
        }
        this._throw("ENOENT", path);
    }

    _symlinkSync(dstPath, srcPath, type = "file") {
        dstPath = this._getPath(dstPath);
        srcPath = this._getPath(srcPath);
        if (!dstPath) {
            this._throw("ENOENT", srcPath, dstPath, "symlink");
        }
        const navigated = this._navigate(srcPath, false);
        if (!navigated.target) {
            if (navigated.dir.stat().nlink < 2) {
                this._throw("ENOENT", srcPath, dstPath, "symlink");
            }
            if (!this._checkPermissions(constants.W_OK, navigated.dir.stat())) {
                this._throw("EACCES", srcPath, dstPath, "symlink");
            }
            const [, index] = this._iNodeMgr.createINode(
                Symlink,
                {
                    mode: DEFAULT_SYMLINK_PERM,
                    uid: this._uid,
                    gid: this._gid,
                    link: dstPath
                }
            );
            navigated.dir.addEntry(navigated.name, index);
            return;
        }
        this._throw("EEXIST", srcPath, dstPath, "symlink");
    }

    _truncateSync(file, len = 0) {
        if (len < 0) {
            this._throw("EINVAL", null, null, "ftruncate");
        }
        file = this._getPath(file);
        let fdIndex;
        try {
            fdIndex = this.openSync(file, constants.O_WRONLY);
            this.ftruncateSync(fdIndex, len);
        } finally {
            if (fdIndex !== undefined) {
                this.closeSync(fdIndex);
            }
        }
    }

    _unlinkSync(path) {
        path = this._getPath(path);
        const navigated = this._navigate(path, false);
        if (!navigated.target) {
            this._throw("ENOENT", path);
        }
        if (!this._checkPermissions(constants.W_OK, navigated.dir.stat())) {
            this._throw("EACCES", path);
        }
        if (navigated.target instanceof Directory) {
            this._throw("EISDIR", path);
        }
        navigated.target.stat().ctime = new Date();
        navigated.dir.deleteEntry(navigated.name);
    }

    // unwatchFile,

    _utimesSync(path, atime, mtime) {
        path = this._getPath(path);
        const target = this._navigate(path, true).target;
        if (!target) {
            this._throw("ENOENT", path, null, "utimes");
        }
        const metadata = target.stat();
        let newAtime;
        let newMtime;
        if (typeof atime === "number") {
            newAtime = new Date(atime * 1000);
        } else if (typeof atime === "string") {
            newAtime = new Date(parseInt(atime) * 1000);
        } else if (atime instanceof Date) {
            newAtime = atime;
        } else {
            throw new TypeError("atime and mtime must be dates or unixtime in seconds");
        }
        if (typeof mtime === "number") {
            newMtime = new Date(mtime * 1000);
        } else if (typeof mtime === "string") {
            newMtime = new Date(parseInt(mtime) * 1000);
        } else if (mtime instanceof Date) {
            newMtime = mtime;
        } else {
            throw new TypeError("atime and mtime must be dates or unixtime in seconds");
        }
        metadata.atime = newAtime;
        metadata.mtime = newMtime;
        metadata.ctime = new Date();
    }

    // watch,
    // watchFile,

    _writeSync(fdIndex, data, offsetOrPos, lengthOrEncoding, position = null) {
        const fd = this._fdMgr.getFd(fdIndex);
        if (!fd) {
            this._throw("EBADF", null, null, "write");
        }
        if (typeof position === "number" && position < 0) {
            this._throw("EINVAL", null, null, "write");
        }
        const flags = fd.getFlags();
        if (!(flags & (constants.O_WRONLY | constants.O_RDWR))) {
            this._throw("EBADF", null, null, "write");
        }
        let buffer;
        if (typeof data === "string") {
            position = (typeof offsetOrPos === "number") ? offsetOrPos : null;
            lengthOrEncoding = (typeof lengthOrEncoding === "string") ? lengthOrEncoding : "utf8";
            buffer = this._getBuffer(data, lengthOrEncoding);
        } else {
            offsetOrPos = (typeof offsetOrPos === "number") ? offsetOrPos : 0;
            if (offsetOrPos < 0 || offsetOrPos > data.length) {
                throw new RangeError("Offset is out of bounds");
            }
            lengthOrEncoding = (typeof lengthOrEncoding === "number") ? lengthOrEncoding : data.length;
            if (lengthOrEncoding < 0 || lengthOrEncoding > data.length) {
                throw new RangeError("Length is out of bounds");
            }
            buffer = this._getBuffer(data).slice(offsetOrPos, offsetOrPos + lengthOrEncoding);
        }
        try {
            return fd.write(buffer, position);
        } catch (e) {
            if (e instanceof RangeError) {
                this._throw("EFBIG", null, null, "write");
            }
            if (e instanceof FSException) {
                e.syscall = "write";
            }
            throw e;
        }
    }

    _writeFileSync(file, data, options) {
        options = this._getOptions({
            encoding: "utf8",
            mode: DEFAULT_FILE_PERM,
            flag: "w"
        }, options);
        let fdIndex;
        try {
            const buffer = this._getBuffer(data, options.encoding);
            if (typeof file === "number") {
                this._writeSync(file, buffer, 0, buffer.length, 0);
            } else {
                fdIndex = this._openSync(file, options.flag, options.mode);
                this._writeSync(fdIndex, buffer, 0, buffer.length, 0);
            }
        } finally {
            if (fdIndex !== undefined) {
                this._closeSync(fdIndex);
            }
        }
    }

    // // TODO
    // watch(filename, options = {}, listener) {
    //     if (isFunction(options)) {
    //         [options, listener] = [{}, options];
    //     }
    //     if (isString(options)) {
    //         options = { encoding: options };
    //     }
    //     options.encoding = options.encoding || "utf8";
    //     options.persistent = "persistent" in options ? Boolean(options.persistent) : true;
    //     options.recursive = Boolean(options.recursive);

    //     const watcher = new FSWatcher();

    //     if (listener) {
    //         watcher.on("change", listener);
    //     }

    //     this._handlePath("watch", this._resolve(filename), null, options, listener, watcher).catch((err) => {
    //         watcher.emit("error", err);
    //     });

    //     return watcher;
    // }

    // _watch(filename, options, listener, watcher) {
    //     watcher.emit("error", this.createError("ENOSYS", filename, "watch"));
    // }

    // watchFile(filename, options = {}, listener) {
    //     if (isFunction(options)) {
    //         [options, listener] = [{}, options];
    //     }
    //     options.persistent = "persistent" in options ? Boolean(options.persistent) : true;
    //     options.interval = options.interval || 5007;

    //     const watcher = new StatWatcher();

    //     watcher.on("change", listener);

    //     this._fileWatchers.set(filename, watcher); // different options?

    //     watcher.start(this, filename, options).catch(noop); // actually it should not throw

    //     return watcher;
    // }

    // unwatchFile(filename, listener) {
    //     if (!this._fileWatchers.has(filename)) {
    //         return;
    //     }
    //     const watcher = this._fileWatchers.get(filename);
    //     if (listener) {
    //         watcher.removeListener("change", listener);
    //     } else {
    //         watcher.stop();
    //         this._fileWatchers.delete(filename);
    //     }
    // }

    // end fs methods

    /**
     * Processes path types and collapses it to a string.
     * The path types can be string or Buffer or URL.
     * @private
     */
    _getPath(path) {
        if (typeof path === "string") {
            return path;
        }
        if (path instanceof Buffer) {
            return path.toString();
        }
        if (typeof path === "object" && typeof path.pathname === "string") {
            return this._getPathFromURL(path);
        }
        throw new TypeError("path must be a string or Buffer or URL");
    }

    /**
     * Acquires the file path from an URL object.
     * @private
     */
    _getPathFromURL(url) {
        if (url.hostname) {
            throw new TypeError("ERR_INVALID_FILE_URL_HOST");
        }
        const pathname = url.pathname;
        if (pathname.match(/%2[fF]/)) {
            // must not allow encoded slashes
            throw new TypeError("ERR_INVALID_FILE_URL_PATH");
        }
        return decodeURIComponent(pathname);
    }

    /**
     * Processes data types and collapses it to a Buffer.
     * The data types can be Buffer or Uint8Array or string.
     * @private
     */
    _getBuffer(data, encoding = null) {
        if (data instanceof Buffer) {
            return data;
        }
        if (data instanceof Uint8Array) {
            // zero copy implementation
            // also sliced to the view's constraint
            return Buffer.from(data.buffer).slice(
                data.byteOffset,
                data.byteOffset + data.byteLength
            );
        }
        if (typeof data === "string") {
            return Buffer.from(data, encoding);
        }
        throw new TypeError("data must be Buffer or Uint8Array or string");
    }

    /**
     * Takes a default set of options, and merges them shallowly into the user provided options.
     * Object spread syntax will ignore an undefined or null options object.
     * @private
     */
    _getOptions(defaultOptions, options) {
        if (typeof options === "string") {
            return { ...defaultOptions, encoding: options };
        }
        return { ...defaultOptions, ...options };
    }

    /**
     * Checks the permissions fixng the current uid and gid.
     * If the user is root, they can access anything.
     * @private
     */
    _checkPermissions(access, stat) {
        if (this._uid !== DEFAULT_ROOT_UID) {
            return checkPermissions(access, this._uid, this._gid, stat);
        }
        return true;

    }

    /**
     * Parses and extracts the first path segment.
     * @private
     */
    _parsePath(pathS) {
        const matches = pathS.match(/^([\s\S]*?)(?:\/+|$)([\s\S]*)/);
        if (matches) {
            const segment = matches[1] || "";
            const rest = matches[2] || "";
            return {
                segment,
                rest
            };
        }
        // this should not happen
        throw new Error(`Could not parse pathS: ${pathS}`);

    }

    /**
     * Navigates the filesystem tree from root.
     * You can interpret the results like:
     *   !target       => Non-existent segment
     *   name === ''   => Target is at root
     *   name === '.'  => dir is the same as target
     *   name === '..' => dir is a child directory
     * @private
     */
    _navigate(pathS, resolveLastLink = true, activeSymlinks = new Set(), origPathS = pathS) {
        if (!pathS) {
            this._throw("ENOENT", origPathS);
        }
        // multiple consecutive slashes are considered to be 1 slash
        pathS = pathS.replace(/\/+/, "/");
        // a trailing slash is considered to refer to a directory, thus it is converted to /.
        // functions that expect and specially handle missing directories should trim it away
        pathS = pathS.replace(/\/$/, "/.");
        if (pathS[0] === "/") {
            pathS = pathS.substring(1);
            if (!pathS) {
                return {
                    dir: this._root,
                    target: this._root,
                    name: "", // root is the only situation where the name is empty
                    remaining: "",
                    pathStack: []
                };
            }
            return this._navigateFrom(
                this._root,
                pathS,
                resolveLastLink,
                activeSymlinks,
                [],
                origPathS
            );

        }
        return this._navigateFrom(this._cwd.getINode(), pathS, resolveLastLink, activeSymlinks, this._cwd.getPathStack(), origPathS);
    }

    /**
     * Navigates the filesystem tree from a given directory.
     * You should not use this directly unless you first call _navigate and pass the remaining path to _navigateFrom.
     * Note that the pathStack is always the full path to the target.
     * @private
     */
    _navigateFrom(curdir, pathS, resolveLastLink = true, activeSymlinks = new Set(), pathStack = [], origPathS = pathS) {
        if (!pathS) {
            this._throw("ENOENT", origPathS);
        }
        if (!this._checkPermissions(constants.X_OK, curdir.stat())) {
            this._throw("EACCES", origPathS);
        }
        const parse = this._parsePath(pathS);
        if (parse.segment !== ".") {
            if (parse.segment === "..") {
                pathStack.pop(); // this is a noop if the pathStack is empty
            } else {
                pathStack.push(parse.segment);
            }
        }
        let nextDir;
        let nextPath;
        const target = curdir.getEntry(parse.segment);
        if (target instanceof File || target instanceof CharacterDev) {
            if (!parse.rest) {
                return {
                    dir: curdir,
                    target,
                    name: parse.segment,
                    remaining: "",
                    pathStack
                };
            }
            this._throw("ENOTDIR", origPathS);
        } else if (target instanceof Directory) {
            if (!parse.rest) {
                // if parse.segment is ., dir is not the same directory as target
                // if parse.segment is .., dir is the child directory
                return {
                    dir: curdir,
                    target,
                    name: parse.segment,
                    remaining: "",
                    pathStack
                };
            }
            nextDir = target;
            nextPath = parse.rest;
        } else if (target instanceof Symlink) {
            if (!resolveLastLink && !parse.rest) {
                return {
                    dir: curdir,
                    target,
                    name: parse.segment,
                    remaining: "",
                    pathStack
                };
            }
            if (activeSymlinks.has(target)) {
                this._throw("ELOOP", origPathS);
            } else {
                activeSymlinks.add(target);
            }
            // although symlinks should not have an empty links, it's still handled correctly here
            nextPath = aPath.join(target.getLink(), parse.rest);
            if (nextPath[0] === "/") {
                return this._navigate(nextPath, resolveLastLink, activeSymlinks, origPathS);
            }
            pathStack.pop();
            nextDir = curdir;

        } else {
            return {
                dir: curdir,
                target: null,
                name: parse.segment,
                remaining: parse.rest,
                pathStack
            };
        }
        return this._navigateFrom(nextDir, nextPath, resolveLastLink, activeSymlinks, pathStack, origPathS);
    }
}
MemoryFileSystem.prototype.constants = constants;
MemoryFileSystem.prototype.ReadStream = ReadStream;
MemoryFileSystem.prototype.WriteStream = WriteStream;

MemoryFileSystem.DEFAULT_ROOT_UID = DEFAULT_ROOT_UID;
MemoryFileSystem.DEFAULT_ROOT_GID = DEFAULT_ROOT_GID;
MemoryFileSystem.DEFAULT_FILE_PERM = DEFAULT_FILE_PERM;
MemoryFileSystem.DEFAULT_DIRECTORY_PERM = DEFAULT_DIRECTORY_PERM;
MemoryFileSystem.DEFAULT_SYMLINK_PERM = DEFAULT_SYMLINK_PERM;
MemoryFileSystem.File = File;
MemoryFileSystem.Directory = Directory;
MemoryFileSystem.Symlink = Symlink;
MemoryFileSystem.applyUmask = applyUmask;
