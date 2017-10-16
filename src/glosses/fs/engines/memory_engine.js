const {
    x,
    fs: {
        engine: {
            Path,
            AbstractEngine
        },
        constants: {
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
            O_NOFOLLOW
        }
    },
    event,
    collection,
    is,
    std,
    util,
    noop,
    emptyBuffer
} = adone;

const { sep } = std.path;

// limit to detect symlink loops
const UNWIND_LIMIT = 100;
const SYMLINK_LOOP = Symbol();

// const lazy = adone.lazify({
//     uid: () => is.windows ? -1 : process.getuid(),
//     gid: () => is.windows ? -1 : adone
// });

const stringToFlags = (flags) => {
    if (is.number(flags)) {
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

    throw new x.InvalidArgument(`invalid flag given ${flags}`);
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
        if (is.nil(position)) {
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
        if (is.nil(position) || this.flags & O_APPEND) { // O_APPEND to imitate the Linux behaviour
            if (this.filePosition === this.file.contents.length) {
                this.file.contents = Buffer.concat([this.file.contents, buffer]);
            } else {
                this.file.contents = Buffer.concat([
                    this.file.contents.slice(0, this.filePosition),
                    buffer,
                    this.file.contents.slice(this.filePosition + buffer.length)
                ]);
            }
            if (is.nil(position)) {
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
        if (is.nil(position) || this.flags & O_APPEND) {
            if (this.filePosition === this.file.contents.length) {
                this.file.contents = Buffer.concat([this.file.contents, buffer.slice(offset, offset + length)]);
            } else {
                this.file.contents = Buffer.concat([
                    this.file.contents.slice(0, this.filePosition),
                    buffer.slice(offset, offset + length), // buffer is not so long?
                    this.file.contents.slice(this.filePosition + length)
                ]);
            }
            if (is.nil(position)) {
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

class AbstractFile extends event.EventEmitter {
    constructor({
        mtime = new Date(),
        ctime = new Date(),
        atime = new Date(),
        mode,
        gid = process.getgid(),
        uid = process.getuid()
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
        if (is.undefined(time)) {
            this.atime = new Date();
        } else {
            this.atime = new Date(time);
        }
    }

    updateChangeTime(time) {
        if (is.undefined(time)) {
            this.ctime = new Date();
        } else {
            this.ctime = new Date(time);
        }
    }

    updateModifyTime(time) {
        if (is.undefined(time)) {
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
        contents = adone.emptyBuffer,
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

        this.contents = is.buffer(contents) ? contents : Buffer.from(contents);
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
        const stat = new std.fs.Stats();
        stat.dev = 0; // ?
        stat.ino = this.inode;
        stat.nlink = this.nlink;
        stat.uid = this.uid;
        stat.gid = this.gid;
        stat.rdev = 0; // ?
        stat.size = this.contents.length || this.size;
        stat.blksize = 4096; // ?
        stat.blocks = 8; // ?
        stat.mode = this.mode | std.fs.constants.S_IFREG;
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
        const stat = new std.fs.Stats();
        stat.dev = 0; // ?
        stat.ino = this.inode;
        stat.nlink = this.nlink;
        stat.uid = this.uid;
        stat.gid = this.gid;
        stat.rdev = 0; // ?
        stat.size = 1; // ?
        stat.blksize = 4096; // ?
        stat.blocks = 8; // ?
        stat.mode = this.mode | std.fs.constants.S_IFLNK;
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
        const stat = new std.fs.Stats();
        stat.dev = 0; // ?
        stat.ino = this.inode;
        stat.nlink = this.nlink;
        stat.uid = this.uid;
        stat.gid = this.gid;
        stat.rdev = 0; // ?
        stat.size = 4; // ?
        stat.blksize = 4096; // ?
        stat.blocks = 8; // ?
        stat.mode = this.mode | std.fs.constants.S_IFDIR;
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

class FSWatcher extends event.EventEmitter {
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

class VFS {
    constructor(engine) {
        this.engine = engine;
        this.root = new Directory(this, undefined, new Path(sep, { root: sep }));
        this.fd = 100;
        this.fdMap = new collection.MapCache();
    }

    throw(code, path, syscall, secondPath) {
        this.engine.throw(code, path, syscall, secondPath);
    }

    addFile(path, options) {
        path = Path.wrap(path);
        const [node, directory] = this.getNode({ path, ensureParent: true });
        if (!is.object(options)) {
            options = { contents: options };
        }
        if (node) {
            throw new x.IllegalState("Already exists");
        }
        directory.addFile(path.filename(), options);
    }

    addSymlink(target, linkname, options) {
        target = Path.wrap(target);
        linkname = Path.wrap(linkname);
        const [node, linknameDirectory] = this.getNode({ path: linkname, ensureParent: true });
        if (node) {
            throw new x.IllegalState("Already exists");
        }
        linknameDirectory.addSymlink(linkname.filename(), target, options);
    }

    addDirectory(path, options) {
        path = Path.wrap(path);
        const [node, directory] = this.getNode({ path, ensureParent: true });
        if (node) {
            throw new x.IllegalState("Already exists");
        }
        directory.addDirectory(path.filename(), options);
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
        secondPath
    }) {
        let parent = root;
        const parts = path.relativeParts;
        let filename = "";
        for (let i = 0; i < parts.length; ++i) {
            if (root instanceof Directory) {
                this.assertPermissions(root, X_OK, path, syscall, secondPath);
            }
            const part = parts[i];
            filename = part;
            if (part === "." || part === "") {
                if (root instanceof Directory) {
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
            if (!(root instanceof Directory)) {
                if (i === parts.length - 1) {
                    return [null, parent, null, unwinds];
                }
                this.throw("ENOENT", path, syscall, secondPath);
            }
            parent = root;
            if (!root.exists(part)) {
                if (i === parts.length - 1) {
                    return [null, parent, unwinds];
                }

                if (ensureParent) {
                    // check if we are allowed to create files
                    this.assertPermissions(root, W_OK, path, syscall, secondPath);
                    root = root.addDirectory(part, { mode });
                    continue;
                }
                this.throw("ENOENT", path, syscall, secondPath);
            } else {
                root = root.get(part);
                if (root instanceof Directory) {
                    this.assertPermissions(root, X_OK, path, syscall, secondPath);
                }
            }
            if (root instanceof Symlink && (handleLeafSymlink || i !== parts.length - 1)) {
                if (unwinds > UNWIND_LIMIT) {
                    if (throwOnEloop) {
                        this.throw("ELOOP", path, syscall, secondPath);
                    }
                    return [SYMLINK_LOOP, parent, null, unwinds];
                }

                [root, parent, filename, unwinds] = this.getNode({
                    path: root.targetPath,
                    syscall,
                    handleLeafSymlink: true,
                    root: parent,
                    unwinds: unwinds + 1,
                    throwOnEloop: false,
                    secondPath
                });
                if (root === SYMLINK_LOOP) {
                    if (throwOnEloop) {
                        this.throw("ELOOP", path, syscall, secondPath);
                    } else {
                        return [SYMLINK_LOOP, parent, null, unwinds];
                    }
                }
                if (!root) {
                    return [null, parent, filename, unwinds];
                }
            }
        }
        return [root, parent, filename, unwinds];
    }

    /**
     * @returns {Directory}
     */
    getDirectory(path, options, syscall) {
        const [node, parent] = this.getNode({ path, syscall, ensureParent: true });
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
        if (is.null(node)) {
            this.throw("ENOENT", path);
            // throw new ENOENT(`no such file ${path.fullPath}`);
        }
        if (node instanceof Directory) {
            this.throw("EISDIR", path);
            // throw new EISDIR(`is a directory ${path.fullPath}`);
        }
        return node;
    }

    clean() {
        this.root = new Directory(this, undefined, new Path(sep, { root: sep }));
    }

    assertPermissions(node, mode, path, syscall, secondPath) {
        let set;

        if (node.uid === process.getuid()) {
            set = (node.mode >> 6) & 0o777;
        } else if (process.getgroups().includes(node.gid)) {
            set = (node.mode >> 3) & 0o777;
        } else {
            set = node.mode & 0o777;
        }

        if (set & mode) {
            return;
        }

        this.throw("EACCES", path, syscall, secondPath);
    }

    async stat(path) {
        const [node] = this.getNode({ path, syscall: "stat" });
        if (is.null(node)) {
            this.throw("ENOENT", path, "stat");
        }
        node.beforeHook("stat"); // hmm
        return node.stat();
    }

    async lstat(path) {
        const [node] = this.getNode({ path, syscall: "lstat", handleLeafSymlink: false });
        if (is.null(node)) {
            this.throw("ENOENT", path, "lstat");
        }
        node.beforeHook("lstat"); // hmm
        return node.stat();
    }

    async readdir(path, options) {
        const [node] = this.getNode({ path, syscall: "scandir" });
        if (is.null(node)) {
            this.throw("ENOENT", path, "scandir");
        }
        if (!(node instanceof Directory)) {
            this.throw("ENOTDIR", path, "scandir");
        }
        this.assertPermissions(node, R_OK, path, "scandir");
        await node.beforeHook("readdir");
        let children = node.getChildren();
        if (options.encoding === "buffer") {
            children = children.map(Buffer.from);
        }
        return (await node.afterHook("readdir", children)) || children;
    }

    async realpath(path, options) {
        const [node, parent, filename] = this.getNode({ path });
        if (is.null(node)) {
            this.throw("ENOENT", path);
        }

        let realpath = parent.path.join(filename).fullPath;

        if (options.encoding === "buffer") {
            realpath = Buffer.from(realpath);
        }

        return (await node.afterHook("realpath", realpath)) || realpath;
    }

    async open(path, flags, mode) {
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
                node.contents = emptyBuffer;
            }
        } else {
            if (!(flags & O_CREAT)) {
                this.throw("ENOENT", path, "open");
            }
            this.assertPermissions(directory, W_OK, path, "open");
            node = directory.addFile(filename, { mode });
        }

        const opened = await node.open(flags, mode);
        const fd = this.fd++;
        this.fdMap.set(fd, opened);
        return fd;
    }

    async close(fd) {
        if (!this.fdMap.has(fd)) {
            this.throw("EBADF", "close");
        }
        const opened = this.fdMap.get(fd);
        await opened.close();
        this.fdMap.delete(fd);
    }

    async read(fd, buffer, offset, length, position) {
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

    async write(fd, buffer, offset, length, position) {
        if (!this.fdMap.has(fd)) {
            this.throw("EBADF", "write");
        }
        const opened = this.fdMap.get(fd);
        if (!opened.isOpenedForWriting()) {
            this.throw("EBADF", "write");
        }
        if (is.string(buffer)) {
            if (is.number(length) && length < 0) {
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

        if (is.number(position) && position < 0) {
            position = 0;
        }

        return opened.writeBuffer(buffer, offset, length, position);
    }

    async ftruncate(fd, length) {
        if (!this.fdMap.has(fd)) {
            this.throw("EBADF", "ftruncate");
        }
        const opened = this.fdMap.get(fd);
        if (!opened.isOpenedForWriting()) {
            this.throw("EINVAL", undefined, "ftruncate");
        }
        opened.truncate(length);
    }

    async unlink(path) {
        const [node, parent] = this.getNode({ path, syscall: "unlink", handleLeafSymlink: false });

        if (is.null(node)) {
            this.throw("ENOENT", path, "unlink");
        }

        if (node instanceof Directory) {
            this.throw("EISDIR", path, "unlink");
        }
        this.assertPermissions(parent, W_OK, path, "unlink");
        // opened descriptors ????? for now they will normally live until they are closed
        parent.delete(path.filename());
    }

    utimes(path, atime, mtime) {
        const [node] = this.getNode({ path });
        if (is.null(node)) {
            this.throw("ENOENT", path, "utime");
        }
        node.updateAccessTime(atime * 1000);
        node.updateModifyTime(mtime * 1000);
        node.emit("change");
    }

    futimes(fd, atime, mtime) {
        if (!this.fdMap.has(fd)) {
            this.throw("EBADF", "futimes");
        }
        const node = this.fdMap.get(fd).file;
        node.updateAccessTime(atime * 1000);
        node.updateModifyTime(mtime * 1000);
        node.emit("change");
    }

    async rmdir(path) {
        const [node, parent, filename] = this.getNode({ path, syscall: "rmdir", handleLeafSymlink: false });
        if (is.null(node)) {
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

    async mkdir(path, mode) {
        const [node, parent] = this.getNode({ path, syscall: "mkdir", handleLeafSymlink: false });
        if (node) {
            this.throw("EEXIST", path, "mkdir");
        }
        this.assertPermissions(parent, W_OK, path, "mkdir");
        parent.addDirectory(path.filename(), { mode });
    }

    async access(path, mode) {
        const [node] = this.getNode({ path, syscall: "access" });
        if (is.null(node)) {
            this.throw("ENOENT", path, "access");
        }
        if (mode === F_OK) {
            return;
        }
        // TODO: windows...

        this.assertPermissions(node, mode, path, "access");
    }

    chmod(path, mode) {
        const [node] = this.getNode({ path, syscall: "chmod" });
        if (is.null(node)) {
            this.throw("ENOENT", path, "chmod");
        }
        node.mode = ((node.mode >>> 12) << 12) | mode;
    }

    fchmod(fd, mode) {
        if (!this.fdMap.has(fd)) {
            this.throw("EBADF", "fchmod");
        }
        const opened = this.fdMap.get(fd);
        const node = opened.file;
        node.mode = ((node.mode >>> 12) << 12) | mode;
    }

    chown(path, uid, gid) {
        const [node] = this.getNode({ path, syscall: "chown" });
        if (is.null(node)) {
            this.throw("ENOENT", path, "chown");
        }
        node.gid = gid;
        node.uid = uid;
    }

    fchown(fd, uid, gid) {
        if (!this.fdMap.has(fd)) {
            this.throw("EBADF", "syscall");
        }
        const node = this.fdMap.get(fd).file;
        node.gid = gid;
        node.uid = uid;
    }

    async rename(oldPath, newPath) {
        const [oldNode, oldParent] = this.getNode({ path: oldPath, syscall: "rename", handleLeafSymlink: false });
        if (is.null(oldNode)) {
            this.throw("ENOENT", oldPath, "rename", newPath);
        }
        const [newNode, newDirectory] = this.getNode({ path: newPath, syscall: "rename", handleLeafSymlink: false });
        if (is.null(newDirectory)) {
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

    async symlink(path, target) {
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

    async link(existingPath, newPath) {
        const [existingNode] = this.getNode({
            path: existingPath,
            syscall: "link",
            handleLeafSymlink: false
        });
        if (is.null(existingNode)) {
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

    async fstat(fd) {
        if (!this.fdMap.has(fd)) {
            this.throw("EBADF", "fstat");
        }
        const opened = this.fdMap.get(fd);
        return opened.file.stat();
    }

    async fsync(fd) {
        if (!this.fdMap.has(fd)) {
            this.throw("EBADF", "fsync");
        }
        // nothing?
    }

    async fdatasync(fd) {
        if (!this.fdMap.has(fd)) {
            this.throw("EBADF", "fdatasync");
        }
        // nothing?
    }

    async copyFile(src, dst, flags) {
        const [srcNode] = this.getNode({ path: src, syscall: "copyfile", secondPath: dst });
        if (is.null(srcNode)) {
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

    watch(path, options) {
        const [node, parent] = this.getNode({ path, syscall: "watch" });
        const filename = path.filename();
        const watcher = new FSWatcher(filename, parent, node, options);
        watcher.start();
        return watcher;
    }
}

export default class MemoryEngine extends AbstractEngine {
    constructor() {
        super();
        this.vfs = new VFS(this);
    }

    addFile(path, options) {
        this.vfs.addFile(path, options);
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
        this.vfs.addSymlink(target, linkname, options);
        return this;
    }

    addDirectory(path, options) {
        this.vfs.addDirectory(path, options);
        return this;
    }

    add(callback) {
        const TYPE = Symbol();
        const context = {
            file: (options = {}) => {
                if (is.buffer(options) || is.string(options)) {
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
        const p = new Path(sep, { root: sep });
        const visit = (path, obj, options) => {
            const directory = this.vfs.getDirectory(path, options);

            for (const [key, value] of util.entries(obj)) {
                const parts = util.braces.expand(key);
                for (const part of parts) {
                    switch (value[TYPE]) {
                        case "file": {
                            let { options } = value;
                            if (is.function(options)) {
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
                            if (is.array(value)) {
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
        this.vfs.clean();
        return this;
    }

    async _stat(path) {
        return this.vfs.stat(path);
    }

    async _lstat(path) {
        return this.vfs.lstat(path);
    }

    async _readdir(path, options) {
        return this.vfs.readdir(path, options);
    }

    async _realpath(path, options) {
        return this.vfs.realpath(path, options);
    }

    async _readlink(path, options) {
        const [node] = this.vfs.getNode({ path, syscall: "readlink", handleLeafSymlink: false });
        if (is.null(node)) {
            this.throw("ENOENT", path, "readlink");
        }
        if (!(node instanceof Symlink)) {
            this.throw("EINVAL", path, "readlink");
        }
        await node.beforeHook("readlink");
        let target = node.targetPath.fullPath;
        if (options.encoding === "buffer") {
            target = Buffer.from(target);
        }
        return (await node.afterHook("readlink", target)) || target;
    }

    async _open(path, flags, mode) {
        return this.vfs.open(path, flags, mode);
    }

    async _read(fd, buffer, offset, length, position) {
        return this.vfs.read(fd, buffer, offset, length, position);
    }

    async _write(fd, buffer, offset, length, position) {
        return this.vfs.write(fd, buffer, offset, length, position);
    }

    async _close(fd) {
        return this.vfs.close(fd);
    }

    async _truncate(path, length) {
        return this.vfs.truncate(path, length);
    }

    async _ftruncate(fd, length) {
        return this.vfs.ftruncate(fd, length);
    }

    async _unlink(path) {
        return this.vfs.unlink(path);
    }

    async _utimes(path, atime, mtime) {
        return this.vfs.utimes(path, atime, mtime);
    }

    async _futimes(fd, atime, mtime) {
        return this.vfs.futimes(fd, atime, mtime);
    }

    async _rmdir(path) {
        return this.vfs.rmdir(path);
    }

    async _mkdir(path, mode) {
        return this.vfs.mkdir(path, mode);
    }

    async _access(path, mode) {
        return this.vfs.access(path, mode);
    }

    async _chmod(path, mode) {
        return this.vfs.chmod(path, mode);
    }

    async _fchmod(fd, mode) {
        return this.vfs.fchmod(fd, mode);
    }

    async _lchmod(path, mode) {
        return this.vfs.lchmod(path, mode);
    }

    async _chown(path, uid, gid) {
        return this.vfs.chown(path, uid, gid);
    }

    async _fchown(fd, uid, gid) {
        return this.vfs.fchown(fd, uid, gid);
    }

    async _lchown(path, uid, gid) {
        return this.vfs.lchown(path, uid, gid);
    }

    async _rename(oldPath, newPath) {
        return this.vfs.rename(oldPath, newPath);
    }

    async _symlink(path, target) {
        return this.vfs.symlink(path, target);
    }

    async _link(existingPath, newPath) {
        return this.vfs.link(existingPath, newPath);
    }

    async _fstat(fd) {
        return this.vfs.fstat(fd);
    }

    async _fsync(fd) {
        return this.vfs.fsync(fd);
    }

    async _fdatasync(fd) {
        return this.vfs.fdatasync(fd);
    }

    async _copyFile(src, dst, flags) {
        return this.vfs.copyFile(src, dst, flags);
    }

    _watch(filename, options, listener, watcher) {
        const internalWatcher = this.vfs.watch(filename, options);
        watcher.setWatcher(internalWatcher);
    }
}
