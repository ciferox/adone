/* eslint-disable adone/no-typeof */
/* eslint-disable eqeqeq */
/* eslint-disable adone/no-undefined-comp */
/* eslint-disable adone/no-null-comp */

import AsyncFileSystem from "./async";
import Path from "./path";
import fs from "fs";
import { EventEmitter } from "events";
import { isFunction, isNumber, isArray, isString, isBuffer, isWindows, noop, EMPTY_BUFFER } from "../../../common";
import { InvalidArgumentException, IllegalStateException } from "../../errors";

const {
    O_RDONLY,
    O_WRONLY,
    O_SYNC,
    O_RDWR,
    O_TRUNC,
    O_CREAT,
    O_EXCL,
    O_APPEND,
    F_OK,
    R_OK,
    W_OK,
    X_OK,
    COPYFILE_EXCL,
    O_NOFOLLOW,
    S_IFREG,
    S_IFLNK,
    S_IFDIR
} = fs.constants;

const {
    util
} = adone;

// limit to detect symlink loops
const UNWIND_LIMIT = 100;
const SYMLINK_LOOP = Symbol();

const getgid = isWindows ? () => -1 : process.getgid;
const getuid = isWindows ? () => -1 : process.getuid;
const getgroups = isWindows ? () => [-1] : process.getgroups;

/**
 * Splits complex keys like "a/b/c/d" into nested objects
 */
const expandPaths = (obj) => {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
        let dest = result; // where to add the key
        const parts = key.split("/");
        for (let i = 0; i < parts.length - 1; ++i) {
            if (!(parts[i] in dest)) {
                dest[parts[i]] = {};
            }
            dest = dest[parts[i]];
        }
        dest[parts[parts.length - 1]] = value;
    }
    return result;
};

const stringToFlags = (flags) => {
    if (isNumber(flags)) {
        return flags;
    }

    switch (flags) {
        case "r": return O_RDONLY;
        case "rs": // Fall through.
        case "sr": return O_RDONLY | O_SYNC;
        case "r+": return O_RDWR;
        case "rs+": // Fall through.
        case "sr+": return O_RDWR | O_SYNC;

        case "w": return O_TRUNC | O_CREAT | O_WRONLY;
        case "wx": // Fall through.
        case "xw": return O_TRUNC | O_CREAT | O_WRONLY | O_EXCL;

        case "w+": return O_TRUNC | O_CREAT | O_RDWR;
        case "wx+": // Fall through.
        case "xw+": return O_TRUNC | O_CREAT | O_RDWR | O_EXCL;

        case "a": return O_APPEND | O_CREAT | O_WRONLY;
        case "ax": // Fall through.
        case "xa": return O_APPEND | O_CREAT | O_WRONLY | O_EXCL;

        case "a+": return O_APPEND | O_CREAT | O_RDWR;
        case "ax+": // Fall through.
        case "xa+": return O_APPEND | O_CREAT | O_RDWR | O_EXCL;
    }

    throw new InvalidArgumentException(`invalid flag given ${flags}`);
};

class OpenedFile {
    constructor(file, flags, mode) {
        this.file = file;
        this.flags = stringToFlags(flags);
        this.mode = mode;
        this.filePosition = 0;
    }

    isOpenedForReading() {
        return (this.flags & O_RDWR) || !(this.flags & O_WRONLY); // ??
    }

    isOpenedForWriting() {
        return (this.flags & O_RDWR) || (this.flags & O_WRONLY);
    }

    read(buffer, offset, length, position) {
        const contents = this.file.contents;
        if (position == null) {
            const bytes = Math.min(contents.length - this.filePosition, length);
            contents.copy(buffer, offset, this.filePosition, this.filePosition + bytes);
            this.filePosition += bytes;
            this.file.updateAccessTime();
            return bytes;
        }
        const bytes = Math.min(position + length, contents.length) - position;
        contents.copy(buffer, offset, position, position + bytes);
        this.file.updateAccessTime();
        return bytes;
    }

    writeString(string, position, encoding) {
        if (this.flags & O_APPEND) {
            this.filePosition = this.file.contents.length;
        }
        const buffer = Buffer.from(string, encoding);
        if (position == null || this.flags & O_APPEND) { // O_APPEND to imitate the Linux behaviour
            if (this.filePosition === this.file.contents.length) {
                this.file.contents = Buffer.concat([this.file.contents, buffer]);
            } else {
                this.file.contents = Buffer.concat([
                    this.file.contents.slice(0, this.filePosition),
                    buffer,
                    this.file.contents.slice(this.filePosition + buffer.length)
                ]);
            }
            if (position == null) {
                this.filePosition += buffer.length;
            }
        } else {
            if (position > this.file.contents.length) {
                this.file.contents = Buffer.concat([
                    this.file.contents,
                    Buffer.alloc(position - this.file.contents.length),
                    buffer
                ]);
            } else if (buffer.length + position > this.file.contents.length) {
                this.file.contents = Buffer.concat([this.file.contents.slice(0, position), buffer]);
            } else {
                buffer.copy(this.file.contents, position);
            }
        }
        this.file.updateChangeTime();
        this.file.updateModifyTime();
        this.file.emit("change");
        return buffer.length; // ? when it can be less
    }

    writeBuffer(buffer, offset, length, position) {
        if (this.flags & O_APPEND) {
            this.filePosition = this.file.contents.length;
        }
        if (position == null || this.flags & O_APPEND) {
            if (this.filePosition === this.file.contents.length) {
                this.file.contents = Buffer.concat([this.file.contents, buffer.slice(offset, offset + length)]);
            } else {
                this.file.contents = Buffer.concat([
                    this.file.contents.slice(0, this.filePosition),
                    buffer.slice(offset, offset + length), // buffer is not so long?
                    this.file.contents.slice(this.filePosition + length)
                ]);
            }
            if (position == null) {
                this.filePosition += length;
            }
        } else {
            if (position > this.file.contents.length) {
                this.file.contents = Buffer.concat([
                    this.file.contents,
                    Buffer.alloc(position - this.file.contents.length),
                    buffer.slice(offset, offset + length)
                ]);
            } else if (length + position > this.file.contents.length) {
                this.file.contents = Buffer.concat([this.file.contents.slice(0, position), buffer.slice(offset, offset + length)]);
            } else {
                buffer.copy(this.file.contents, position, offset, offset + length);
            }
        }
        this.file.emit("change");
        this.file.updateChangeTime();
        this.file.updateModifyTime();
        return length; // ??
    }

    truncate(length) {
        const { file } = this;
        const clength = file.contents.length;
        if (length > clength) {
            file.contents = Buffer.concat([
                file.contents,
                Buffer.alloc(length - clength)
            ]);
        } else if (clength > length) {
            file.contents = file.contents.slice(0, length);
        }
        this.file.updateChangeTime();
        this.file.updateModifyTime();
        this.file.emit("change");
    }

    close() {
        //
    }
}

let inode = 1;

class AbstractFile extends EventEmitter {
    constructor({
        mtime = new Date(),
        ctime = new Date(),
        atime = new Date(),
        mode,
        gid = getgid(),
        uid = getuid()
    }) {
        super();
        this.mtime = mtime;
        this.ctime = ctime;
        this.atime = atime;
        this.birthtime = new Date();
        this.nlink = 1;
        this.ino = inode++;
        this.mode = mode;
        this.uid = uid;
        this.gid = gid;
    }

    updateAccessTime(time) {
        if (time === undefined) {
            this.atime = new Date();
        } else {
            this.atime = new Date(time);
        }
    }

    updateChangeTime(time) {
        if (time === undefined) {
            this.ctime = new Date();
        } else {
            this.ctime = new Date(time);
        }
    }

    updateModifyTime(time) {
        if (time === undefined) {
            this.mtime = new Date();
        } else {
            this.mtime = new Date(time);
        }
    }

    link() {
        ++this.nlink;
        this.updateChangeTime();
        this.emit("change");
    }

    unlink() {
        --this.nlink;
        this.updateChangeTime();
        if (this.nlink === 0) {
            this.emit("delete");
        } else {
            this.emit("change");
        }
    }
}

class File extends AbstractFile {
    constructor({
        size = 0,
        contents = EMPTY_BUFFER,
        beforeHook = noop,
        afterHook = noop,
        mtime,
        atime,
        ctime,
        uid,
        gid,
        mode = 0o644
    } = {}) {
        super({ mtime, atime, ctime, uid, gid, mode });

        this.contents = isBuffer(contents) ? contents : Buffer.from(contents);
        this.beforeHook = beforeHook;
        this.afterHook = afterHook;
        this.size = size; // we use it for stat calls when actually there is no contents
    }

    copy() {
        return new File({
            contents: Buffer.from(this.contents),
            mtime: new Date(),
            atime: new Date(),
            ctime: new Date(),
            birthtime: new Date(),
            uid: this.uid,
            gid: this.gid,
            mode: this.mode
        });
    }

    clone() {
        return new File({
            contents: this.contents,
            mtime: this.mtime,
            atime: this.atime,
            ctime: this.ctime,
            birthtime: this.birthtime,
            uid: this.uid,
            gid: this.gid,
            mode: this.mode
        });
    }

    stat() {
        const stat = new fs.Stats();
        stat.dev = 0; // ?
        stat.ino = this.inode;
        stat.nlink = this.nlink;
        stat.uid = this.uid;
        stat.gid = this.gid;
        stat.rdev = 0; // ?
        stat.size = this.contents.length || this.size;
        stat.blksize = 4096; // ?
        stat.blocks = 8; // ?
        stat.mode = this.mode | S_IFREG;
        stat.mtime = this.mtime;
        stat.mtimeMs = this.mtime.getTime();
        stat.atime = this.atime;
        stat.atimeMs = this.atime.getTime();
        stat.ctime = this.ctime;
        stat.ctimeMs = this.ctime.getTime();
        stat.birthtime = this.birthtime;
        stat.birthtimeMs = this.birthtime.getTime();
        return stat;
    }

    open(flags, mode) {
        return new OpenedFile(this, flags, mode);
    }
}

class Symlink extends AbstractFile {
    constructor(vfs, targetPath, {
        mtime,
        atime,
        ctime,
        uid,
        gid,
        beforeHook = noop,
        afterHook = noop
    } = {}) {
        super({ mtime, atime, ctime, uid, gid, mode: 0o777 });
        this.vfs = vfs;

        /**
         * Generally the target can be a reference to any file,
         * not only files that the memory engine handles.
         * For now we support only local(this instance memory engine) targets.
         */
        this.targetPath = targetPath;
        this.beforeHook = beforeHook;
        this.afterHook = afterHook;
    }

    clone() {
        return new Symlink(this.vfs, this.targetPath, {
            mtime: this.mtime,
            atime: this.atime,
            ctime: this.ctime,
            birthtime: this.birthtime,
            uid: this.uid,
            gid: this.gid
        });
    }

    stat() {
        const stat = new fs.Stats();
        stat.dev = 0; // ?
        stat.ino = this.inode;
        stat.nlink = this.nlink;
        stat.uid = this.uid;
        stat.gid = this.gid;
        stat.rdev = 0; // ?
        stat.size = 1; // ?
        stat.blksize = 4096; // ?
        stat.blocks = 8; // ?
        stat.mode = this.mode | S_IFLNK;
        stat.mtime = this.mtime;
        stat.mtimeMs = this.mtime.getTime();
        stat.atime = this.atime;
        stat.atimeMs = this.atime.getTime();
        stat.ctime = this.ctime;
        stat.ctimeMs = this.ctime.getTime();
        stat.birthtime = this.birthtime;
        stat.birthtimeMs = this.birthtime.getTime();
        return stat;
    }
}

class Directory extends AbstractFile {
    constructor(vfs, parent = undefined, path, {
        mtime,
        atime,
        ctime,
        uid,
        gid,
        mode = 0o775,
        beforeHook = noop,
        afterHook = noop
    } = {}) {
        super({ mtime, atime, ctime, uid, gid, mode });
        this.vfs = vfs;
        this.parent = parent || this;
        this.path = path;
        this.children = {};
        this.beforeHook = beforeHook;
        this.afterHook = afterHook;
        this.link(); // link from the parent?
    }

    // shallow clone
    clone() {
        const clone = new Directory(this.vfs, this.parent, this.path, {
            mtime: this.mtime,
            atime: this.atime,
            ctime: this.ctime,
            birthtime: this.birthtime,
            uid: this.uid,
            gid: this.gid,
            mode: this.mode
        });
        clone.children = this.children;
        return clone;
    }

    isEmpty() {
        return Object.keys(this.children).length === 0;
    }

    exists(filename) {
        return Boolean(this.children[filename]);
    }

    get(filename) {
        return this.children[filename];
    }

    clean() {
        for (const child of Object.keys(this.children)) {
            this.delete(child);
        }
    }

    delete(filename) {
        if (filename in this.children) {
            const node = this.children[filename];
            if (node instanceof Directory) {
                this.unlink();
            }
            node.unlink();
            delete this.children[filename];
            this.updateChangeTime();
            this.updateModifyTime();
            this.emit("delete", filename, node);
        }
    }

    getChildren() {
        return Object.keys(this.children).sort();
    }

    addNode(filename, node) {
        this.children[filename] = node;
        if (node instanceof Directory) {
            this.link(); // .. link
            this.updateModifyTime();
        } else {
            this.updateModifyTime();
            this.updateChangeTime();
        }
        this.emit("add", filename, node);
        return node;
    }

    addFile(filename, options) {
        const file = new File(options);
        this.children[filename] = file;
        this.updateChangeTime();
        this.updateModifyTime();
        this.emit("add", filename, file);
        return file;
    }

    addSymlink(filename, target, options) {
        const symlink = new Symlink(this.vfs, target, options);
        this.children[filename] = symlink;
        this.updateChangeTime();
        this.updateModifyTime();
        this.emit("add", filename, symlink);
        return symlink;
    }

    addDirectory(filename, options) {
        const directory = new Directory(this.vfs, this, this.path.join(filename), options);
        this.children[filename] = directory;
        this.link();
        this.updateModifyTime();
        this.emit("add", filename, directory);
        return directory;
    }

    stat() {
        const stat = new fs.Stats();
        stat.dev = 0; // ?
        stat.ino = this.inode;
        stat.nlink = this.nlink;
        stat.uid = this.uid;
        stat.gid = this.gid;
        stat.rdev = 0; // ?
        stat.size = 4; // ?
        stat.blksize = 4096; // ?
        stat.blocks = 8; // ?
        stat.mode = this.mode | S_IFDIR;
        stat.mtime = this.mtime;
        stat.mtimeMs = this.mtime.getTime();
        stat.atime = this.atime;
        stat.atimeMs = this.atime.getTime();
        stat.ctime = this.ctime;
        stat.ctimeMs = this.ctime.getTime();
        stat.birthtime = this.birthtime;
        stat.birthtimeMs = this.birthtime.getTime();
        return stat;
    }
}

class FSWatcher extends EventEmitter {
    constructor(filename, parentNode, node, options) {
        super();
        this.options = options;
        this.filename = filename;
        this.parentNode = parentNode;
        this.node = node;
        this.callbacks = new Map();
        this.__onChange = () => this.emit("change", "change", this.encode(filename));
        this.__onParentDelete = (changedFilename, changedNode) => {
            if (changedNode === node) {
                this.emit("change", "rename", this.encode(changedFilename));
            }
        };

        this.__onAdd = (filename, newNode) => {
            this.emit("change", "rename", filename);
            const onChange = () => this.emit("change", "change", this.encode(filename));
            newNode.on("change", onChange);
            this.callbacks.set(newNode, onChange);
        };

        this.__onDelete = (filename, removedNode) => {
            this.emit("change", "rename", filename);
            removedNode.removeListener("change", this.callbacks.get(removedNode));
        };
        this.__onSelfDelete = () => this.emit("change", "rename", filename);
    }

    encode(x) {
        const { options: { encoding } } = this;
        if (!encoding || encoding === "buffer") {
            return Buffer.from(x);
        }
        return x;
    }

    start() {
        const { parentNode, node, callbacks } = this;

        if (node instanceof Directory) {
            node.on("add", this.__onAdd).on("delete", this.__onDelete);
            parentNode.on("delete", this.__onParentDelete);

            for (const [name, child] of Object.entries(node.children)) {
                const onChange = () => this.emit("change", "change", this.encode(name));
                child.on("change", onChange);
                callbacks.set(child, onChange);
            }
        } else {
            node.on("change", this.__onChange);
            node.on("delete", this.__onSelfDelete);
        }
    }

    close() {
        const { parentNode, node } = this;
        if (node instanceof Directory) {
            node.removeListener("add", this.__onAdd).removeListener("delete", this.__onDelete);
            parentNode.removeListener("delete", this.__onParentDelete);
            for (const [child, callback] of this.callbacks.entries()) {
                child.removeListener("change", callback);
            }
        } else {
            node.removeListener("change", this.__onChange);
            node.removeListener("delete", this.__onSelfDelete);
        }
    }
}

export default class MemoryFileSystem extends AsyncFileSystem {
    constructor() {
        super({ root: "/", sep: "/" });
        this.clean();
    }

    _wrap(path) {
        return Path.wrap(path, { root: "/", sep: "/" });
    }

    getNode({
        path,
        syscall,
        handleLeafSymlink = true,
        root = this.root,
        unwinds = 0,
        throwOnEloop = true,
        ensureParent = false,
        mode = 0o775,
        secondPath,
        superuser = false
    }) {
        let parent = root;
        const parts = path.parts;
        let filename = "";
        for (let i = 0; i < parts.length; ++i) {
            if (root instanceof Directory) {
                this.assertPermissions(root, X_OK, path, syscall, secondPath, superuser);
            }
            const part = parts[i];
            if (part === "." || part === "") {
                if (root instanceof Directory) {
                    if (part) {
                        filename = part;
                    }
                    continue;
                }
                this.throw("ENOTDIR", path, syscall, secondPath);
            }
            if (part === "..") {
                if (root instanceof Directory) {
                    root = root.parent;
                    continue;
                }
                this.throw("ENOTDIR", path, syscall, secondPath);
            }
            filename = part;
            if (!(root instanceof Directory)) {
                if (i === parts.length - 1) {
                    return [null, parent, null, unwinds];
                }
                this.throw("ENOTDIR", path, syscall, secondPath);
            }
            parent = root;
            if (!root.exists(part)) {
                if (i === parts.length - 1) {
                    return [null, parent, null, unwinds];
                }

                if (ensureParent) {
                    // check if we are allowed to create files
                    this.assertPermissions(root, W_OK, path, syscall, secondPath, superuser);
                    root = root.addDirectory(part, { mode });
                    continue;
                }
                this.throw("ENOENT", path, syscall, secondPath);
            } else {
                root = root.get(part);
                if (root instanceof Directory) {
                    this.assertPermissions(root, X_OK, path, syscall, secondPath, superuser);
                } else if (i !== parts.length - 1 && !(root instanceof Symlink)) {
                    this.throw("ENOTDIR", path, syscall, secondPath);
                }
            }
            if (root instanceof Symlink && (handleLeafSymlink || i !== parts.length - 1)) {
                if (unwinds > UNWIND_LIMIT) {
                    if (throwOnEloop) {
                        this.throw("ELOOP", path, syscall, secondPath);
                    }
                    return [SYMLINK_LOOP, parent, null, unwinds];
                }

                try {
                    [root, parent, filename, unwinds] = this.getNode({
                        path: root.targetPath,
                        syscall,
                        handleLeafSymlink: true,
                        root: parent,
                        unwinds: unwinds + 1,
                        throwOnEloop: false,
                        secondPath
                    });
                } catch (err) {
                    this.throw(err.code, path, syscall, secondPath);
                }
                if (root === SYMLINK_LOOP) {
                    if (throwOnEloop) {
                        this.throw("ELOOP", path, syscall, secondPath);
                    } else {
                        return [SYMLINK_LOOP, parent, null, unwinds];
                    }
                }
                if (root === null) {
                    this.throw("ENOENT", path, syscall, secondPath);
                }
                if (i !== parts.length - 1 && !(root instanceof Directory)) {
                    this.throw("ENOTDIR", path, syscall, secondPath);
                }
            }
        }
        return [root, parent, filename, unwinds];
    }

    /**
     * @returns {Directory}
     */
    getDirectory(path, options, syscall, superuser = false) {
        const [node, parent] = this.getNode({ path, syscall, ensureParent: true, superuser });
        if (node) {
            if (!(node instanceof Directory)) {
                this.throw("ENOTDIR", path, syscall);
            }
            return node;
        }
        return parent.addDirectory(path.filename(), options);
    }

    getFile(path, syscall) {
        const [node] = this.getNode({ path, syscall });
        if (node === null) {
            this.throw("ENOENT", path);
            // throw new ENOENT(`no such file ${path.fullPath}`);
        }
        if (node instanceof Directory) {
            this.throw("EISDIR", path);
            // throw new EISDIR(`is a directory ${path.fullPath}`);
        }
        return node;
    }

    assertPermissions(node, mode, path, syscall, secondPath, superuser) {
        if (superuser) {
            return;
        }

        let set;

        if (node.uid === getuid()) {
            set = (node.mode >> 6) & 0o777;
        } else if (getgroups().includes(node.gid)) {
            set = (node.mode >> 3) & 0o777;
        } else {
            set = node.mode & 0o777;
        }

        if (set & mode) {
            return;
        }

        this.throw("EACCES", path, syscall, secondPath);
    }

    // fs methods

    _accessSync(path, mode) {
        const [node] = this.getNode({ path, syscall: "access" });
        if (node === null) {
            this.throw("ENOENT", path, "access");
        }
        if (mode === F_OK) {
            return;
        }
        // TODO: windows...

        this.assertPermissions(node, mode, path, "access");
    }

    // appendFile,
    // appendFileSync,

    _chmodSync(path, mode) {
        const [node] = this.getNode({ path, syscall: "chmod" });
        if (node === null) {
            this.throw("ENOENT", path, "chmod");
        }
        node.mode = ((node.mode >>> 12) << 12) | mode;
    }

    _chownSync(path, uid, gid) {
        const [node] = this.getNode({ path, syscall: "chown" });
        if (node === null) {
            this.throw("ENOENT", path, "chown");
        }
        node.gid = gid;
        node.uid = uid;
    }

    _closeSync(fd) {
        if (!this.fdMap.has(fd)) {
            this.throw("EBADF", "close");
        }
        const opened = this.fdMap.get(fd);
        opened.close();
        this.fdMap.delete(fd);
    }

    _copyFileSync(src, dst, flags) {
        const [srcNode] = this.getNode({ path: src, syscall: "copyfile", secondPath: dst });
        if (srcNode === null) {
            this.throw("ENOENT", src, "copyfile", dst);
        }
        if (srcNode instanceof Directory) {
            this.throw("EISDIR", src, "copyfile", dst);
        }
        // must be a file
        const [destNode, destNodeDirectory] = this.getNode({ path: dst, syscall: "copyfile", secondPath: dst });
        if (flags === COPYFILE_EXCL) {
            if (destNode) {
                this.throw("EEXIST", src, "copyfile", dst); // TODO: a special error message
            }
        }
        if (!destNode) {
            // a new file will be created
            this.assertPermissions(destNodeDirectory, W_OK, src, "copyfile", dst);
            destNodeDirectory.addNode(dst.filename(), srcNode.copy());
        } else {
            this.assertPermissions(destNode, W_OK, src, "copyfile", dst);
            destNode.contents = Buffer.from(srcNode.contents);
            destNode.mode = srcNode.mode;
            destNode.gid = srcNode.gid;
            destNode.uid = srcNode.uid;
            destNode.atime = new Date();
            destNode.ctime = new Date();
            destNode.mtime = new Date();
        }
    }

    // existsSync,

    _fchmodSync(fd, mode) {
        if (!this.fdMap.has(fd)) {
            this.throw("EBADF", "fchmod");
        }
        const opened = this.fdMap.get(fd);
        const node = opened.file;
        node.mode = ((node.mode >>> 12) << 12) | mode;
    }

    _fchownSync(fd, uid, gid) {
        if (!this.fdMap.has(fd)) {
            this.throw("EBADF", "syscall");
        }
        const node = this.fdMap.get(fd).file;
        node.gid = gid;
        node.uid = uid;
    }

    _fdatasyncSync(fd) {
        if (!this.fdMap.has(fd)) {
            this.throw("EBADF", "fdatasync");
        }
        // nothing?
    }

    _fstatSync(fd) {
        if (!this.fdMap.has(fd)) {
            this.throw("EBADF", "fstat");
        }
        const opened = this.fdMap.get(fd);
        return opened.file.stat();
    }

    _fsyncSync(fd) {
        if (!this.fdMap.has(fd)) {
            this.throw("EBADF", "fsync");
        }
        // nothing?
    }

    _ftruncateSync(fd, length) {
        if (!this.fdMap.has(fd)) {
            this.throw("EBADF", "ftruncate");
        }
        const opened = this.fdMap.get(fd);
        if (!opened.isOpenedForWriting()) {
            this.throw("EINVAL", undefined, "ftruncate");
        }
        opened.truncate(length);
    }

    _futimesSync(fd, atime, mtime) {
        if (!this.fdMap.has(fd)) {
            this.throw("EBADF", "futimes");
        }
        const node = this.fdMap.get(fd).file;
        node.updateAccessTime(atime * 1000);
        node.updateModifyTime(mtime * 1000);
        node.emit("change");
    }

    // lchmod,
    // lchmodSync,
    // lchown,
    // lchownSync,

    _linkSync(existingPath, newPath) {
        const [existingNode] = this.getNode({
            path: existingPath,
            syscall: "link",
            handleLeafSymlink: false
        });
        if (existingNode === null) {
            this.throw("ENOENT", existingPath, "link", newPath);
        }

        const [node, parent] = this.getNode({ path: newPath, syscall: "link" });

        if (node) {
            this.throw("EEXIST", existingPath, "link", newPath);
        }

        if (existingNode instanceof Directory) {
            this.throw("EPERM", existingPath, "link", newPath);
        }

        this.assertPermissions(parent, W_OK, existingPath, "link", newPath);
        existingNode.link();
        parent.addNode(newPath.filename(), existingNode);
    }

    _lstatSync(path) {
        const [node] = this.getNode({ path, syscall: "lstat", handleLeafSymlink: false });
        if (node === null) {
            this.throw("ENOENT", path, "lstat");
        }
        node.beforeHook("lstat"); // hmm
        return node.stat();
    }

    _mkdirSync(path, mode) {
        const [node, parent] = this.getNode({ path, syscall: "mkdir", handleLeafSymlink: false });
        if (node) {
            this.throw("EEXIST", path, "mkdir");
        }
        this.assertPermissions(parent, W_OK, path, "mkdir");
        parent.addDirectory(path.filename(), { mode });
    }

    // mkdtemp,
    // mkdtempSync,

    _openSync(path, flags, mode) {
        flags = stringToFlags(flags);

        const noFollow = (flags & O_NOFOLLOW) === O_NOFOLLOW;

        let [node, directory] = this.getNode({ // eslint-disable-line prefer-const
            path,
            syscall: "open",
            handleLeafSymlink: !noFollow
        });

        if (noFollow && node instanceof Symlink) {
            this.throw("ELOOP", path, "open");
        }

        const filename = path.filename();

        if (node) {
            if ((flags & O_EXCL) && (flags & O_CREAT)) {
                this.throw("EEXIST", path, "open");
            }
            if (node instanceof Directory && ((flags & O_RDWR) || (flags & O_WRONLY))) {
                this.throw("EISDIR", path, "open");
            }

            if ((flags & O_WRONLY) || (flags & O_TRUNC)) {
                this.assertPermissions(node, W_OK, path, "open");
            }

            if (flags & O_RDONLY) {
                this.assertPermissions(node, R_OK, path, "open");
            }

            if (flags & O_RDWR) {
                this.assertPermissions(node, R_OK | W_OK, path, "open");
            }

            if (flags & O_TRUNC) {
                if (node instanceof Directory) {
                    this.throw("EISDIR", path, "open");
                }
                // must be a file
                node.contents = EMPTY_BUFFER;
            }
        } else {
            if (!(flags & O_CREAT)) {
                this.throw("ENOENT", path, "open");
            }
            this.assertPermissions(directory, W_OK, path, "open");
            node = directory.addFile(filename, { mode });
        }

        const opened = node.open(flags, mode);
        const fd = this.fd++;
        this.fdMap.set(fd, opened);
        return fd;
    }

    _readdirSync(path, options) {
        const [node] = this.getNode({ path, syscall: "scandir" });
        if (node === null) {
            this.throw("ENOENT", path, "scandir");
        }
        if (!(node instanceof Directory)) {
            this.throw("ENOTDIR", path, "scandir");
        }
        this.assertPermissions(node, R_OK, path, "scandir");
        node.beforeHook("readdir");
        let children = node.getChildren();
        if (options.encoding === "buffer") {
            children = children.map(Buffer.from);
        }
        return node.afterHook("readdir", children) || children;
    }

    _readlinkSync(path, options) {
        const [node] = this.getNode({ path, syscall: "readlink", handleLeafSymlink: false });
        if (node === null) {
            this.throw("ENOENT", path, "readlink");
        }
        if (!(node instanceof Symlink)) {
            this.throw("EINVAL", path, "readlink");
        }
        node.beforeHook("readlink");
        let target = node.targetPath.fullPath;
        if (options.encoding === "buffer") {
            target = Buffer.from(target);
        }
        return node.afterHook("readlink", target) || target;
    }

    _readSync(fd, buffer, offset, length, position) {
        if (offset >= buffer.length) {
            throw new RangeError("Offset is out of bounds");
        }
        if (length > buffer.length - offset) {
            throw new Error("Length extends beyond buffer");
        }
        if (!this.fdMap.has(fd)) {
            return; // throw ?
        }
        const opened = this.fdMap.get(fd);
        if (!opened.isOpenedForReading()) {
            this.throw("EBADF", "read");
        }
        return opened.read(buffer, offset, length, position);
    }

    _realpathSync(path, options) {
        const [node, parent, filename] = this.getNode({ path });
        if (node === null) {
            this.throw("ENOENT", path);
        }

        let realpath = parent.path.join(filename).fullPath;

        if (options.encoding === "buffer") {
            realpath = Buffer.from(realpath);
        }

        return node.afterHook("realpath", realpath) || realpath;
    }

    _renameSync(oldPath, newPath) {
        const [oldNode, oldParent] = this.getNode({ path: oldPath, syscall: "rename", handleLeafSymlink: false });
        if (oldNode === "null") {
            this.throw("ENOENT", oldPath, "rename", newPath);
        }
        const [newNode, newDirectory] = this.getNode({ path: newPath, syscall: "rename", handleLeafSymlink: false });
        if (newDirectory === null) {
            this.throw("ENOENT", newPath, "rename", newPath);
        }
        if (oldNode === newNode) { // the same node
            return; // do nothing
        }
        if (newNode && newNode instanceof Directory && !(oldNode instanceof Directory)) {
            this.throw("EISDIR", oldPath, "rename", newPath);
        }
        if (oldNode instanceof Directory && newNode) {
            if (!(newNode instanceof Directory)) {
                this.throw("ENOTDIR", oldPath, "rename", newPath);
            }
            if (!newNode.isEmpty()) {
                this.throw("ENOTEMPTY", oldPath, "rename", newPath);
            }
        }
        // TODO: check if it is not a subdirectory of itself
        this.assertPermissions(oldParent, W_OK, oldPath, "rename", newPath);
        this.assertPermissions(newDirectory, W_OK, oldParent, "rename", newPath);
        oldParent.delete(oldPath.filename());

        if (newNode) {
            newDirectory.delete(newPath.filename());
        }
        newDirectory.addNode(newPath.filename(), oldNode);
    }

    _rmdirSync(path) {
        const [node, parent, filename] = this.getNode({ path, syscall: "rmdir", handleLeafSymlink: false });
        if (node === null) {
            this.throw("ENOENT", path, "rmdir");
        }
        if (filename === ".") {
            this.throw("EINVAL", path, "rmdir");
        }
        if (!(node instanceof Directory)) {
            this.throw("ENOTDIR", path, "rmdir");
        }
        if (!node.isEmpty()) {
            this.throw("ENOTEMPTY", path, "rmdir");
        }
        // root rmdir ?
        this.assertPermissions(parent, W_OK, path, "rmdir");
        parent.delete(path.filename());
    }

    _statSync(path) {
        const [node] = this.getNode({ path, syscall: "stat" });
        if (node === null) {
            this.throw("ENOENT", path, "stat");
        }
        node.beforeHook("stat"); // hmm
        return node.stat();
    }

    _symlinkSync(path, target) {
        let node;
        let parent;
        try {
            [node, parent] = this.getNode({ path, syscall: "symlink" });
        } catch (err) {
            err.path = target;
            err.secondPath = path;
            throw err;
        }
        if (node) {
            this.throw("EEXIST", target, "symlink", path);
        }
        this.assertPermissions(parent, W_OK, path, "symlink");
        parent.addSymlink(path.filename(), target);
    }

    // TODO
    // _truncateSync(path, length) {
    // }

    _unlinkSync(path) {
        const [node, parent] = this.getNode({ path, syscall: "unlink", handleLeafSymlink: false });

        if (node === null) {
            this.throw("ENOENT", path, "unlink");
        }

        if (node instanceof Directory) {
            this.throw("EISDIR", path, "unlink");
        }
        this.assertPermissions(parent, W_OK, path, "unlink");
        // opened descriptors ????? for now they will normally live until they are closed
        parent.delete(path.filename());
    }

    _utimesSync(path, atime, mtime) {
        const [node] = this.getNode({ path });
        if (node === null) {
            this.throw("ENOENT", path, "utime");
        }
        node.updateAccessTime(atime * 1000);
        node.updateModifyTime(mtime * 1000);
        node.emit("change");
    }

    _writeSync(fd, buffer, offset, length, position) {
        if (!this.fdMap.has(fd)) {
            this.throw("EBADF", "write");
        }
        const opened = this.fdMap.get(fd);
        if (!opened.isOpenedForWriting()) {
            this.throw("EBADF", "write");
        }
        if (isString(buffer)) {
            if (isNumber(length) && length < 0) {
                length = 0;
            }
            return opened.writeString(buffer, offset, length);
        }

        if (offset > buffer.length) {
            throw new RangeError("offset out of bounds");
        }

        if (length > buffer.length) {
            throw new RangeError("length out of bounds");
        }

        if (length > buffer.length - offset) {
            throw new RangeError("off + len > buffer.length");
        }

        if (isNumber(position) && position < 0) {
            position = 0;
        }

        return opened.writeBuffer(buffer, offset, length, position);
    }

    _watch(path, options, listener, watcher) {
        const [node, parent] = this.getNode({ path, syscall: "watch" });
        const filename = path.filename();
        const internalWatcher = new FSWatcher(filename, parent, node, options);
        internalWatcher.start();
        watcher.setWatcher(internalWatcher);
    }

    // extra methods

    addFile(path, options) {
        path = this._wrap(path);
        const [node, directory] = this.getNode({ path, ensureParent: true });
        if (typeof options !== "object") {
            options = { contents: options };
        }
        if (node) {
            throw new IllegalStateException("Already exists");
        }
        directory.addFile(path.filename(), options);

        return this;
    }

    addFiles(paths, callback) {
        paths = util.flatten(util.arrify(paths).map((path) => util.braces.expand(path)));
        for (const path of paths) {
            this.addFile(path, callback(path));
        }
        return this;
    }

    addSymlink(target, linkname, options) {
        target = this._wrap(target);
        linkname = this._wrap(linkname);
        const [node, linknameDirectory] = this.getNode({ path: linkname, ensureParent: true });
        if (node) {
            throw new IllegalStateException("Already exists");
        }
        linknameDirectory.addSymlink(linkname.filename(), target, options);

        return this;
    }

    addDirectory(path, options) {
        path = this._wrap(path);
        const [node, directory] = this.getNode({ path, ensureParent: true });
        if (node) {
            throw new IllegalStateException("Already exists");
        }
        directory.addDirectory(path.filename(), options);

        return this;
    }

    add(callback) {
        const TYPE = Symbol();
        const context = {
            file: (options = {}) => {
                if (isBuffer(options) || isString(options)) {
                    options = { contents: options };
                }
                return {
                    [TYPE]: "file",
                    options
                };
            },
            symlink: (path, options = {}) => ({
                [TYPE]: "symlink",
                path,
                options
            })
        };
        const structure = callback.call(context, context);
        const p = this._resolve("/");
        const visit = (path, obj, options) => {
            const directory = this.getDirectory(path, options, undefined, true);
            obj = expandPaths(obj);

            for (const [key, value] of util.entries(obj)) {
                const parts = util.braces.expand(key);
                for (const part of parts) {
                    switch (value[TYPE]) {
                        case "file": {
                            let { options } = value;
                            if (isFunction(options)) {
                                options = options(part, part);
                            }
                            directory.addFile(part, options);
                            break;
                        }
                        case "symlink": {
                            directory.addSymlink(part, new Path(value.path), value.options);
                            break;
                        }
                        default: {
                            if (isArray(value)) {
                                visit(path.join(part), ...value);
                            } else {
                                visit(path.join(part), value);
                            }
                        }
                    }
                }
            }
        };
        visit(p, structure);
        return this;
    }

    clean() {
        this.root = new Directory(this, undefined, new Path("/"));
        this.fd = 100;
        this.fdMap = new Map();

        return this;
    }
}