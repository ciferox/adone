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
            // R_OK,
            // W_OK,
            // X_OK,
            COPYFILE_EXECL
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
            contents.copy(buffer, offset, this.filePosition, bytes);
            this.filePosition += bytes;
            return bytes;
        }
        const bytes = Math.min(position + length, contents.length) - position;
        contents.copy(buffer, offset, position, position + bytes);
        return bytes;
    }

    writeString(string, position, encoding) {
        const buffer = Buffer.from(string, encoding);
        if (is.nil(position)) {
            if (this.filePosition === this.file.contents.length) {
                this.file.contents = Buffer.concat([this.file.contents, buffer]);
            } else {
                this.file.contents = Buffer.concat([
                    this.file.contents.slice(0, this.filePosition),
                    buffer,
                    this.file.contents.slice(this.filePosition + buffer.length)
                ]);
            }
            this.filePosition += buffer.length;
        } else {
            if (buffer.length + position > this.file.contents.length) {
                this.file.contents = Buffer.concat([this.file.contents.slice(0, position), buffer]);
            } else {
                buffer.copy(this.file.contents, position);
            }
        }
        this.file.emit("change");
        return buffer.length; // ? when it can be less
    }

    write(buffer, offset, length, position) {
        if (this.flags & O_APPEND) {
            this.filePosition = this.file.contents.length;
        }
        if (is.string(buffer)) {
            return this.writeString(buffer, offset, length);
        }
        if (is.nil(position)) {
            if (this.filePosition === this.file.contents.length) {
                this.file.contents = Buffer.concat([this.file.contents, buffer.slice(offset, offset + length)]);
            } else {
                this.file.contents = Buffer.concat([
                    this.file.contents.slice(0, this.filePosition),
                    buffer.slice(offset, offset + length), // buffer is not so long?
                    this.file.contents.slice(this.filePosition + length)
                ]);
            }
            this.filePosition += length;
        } else {
            if (length + position > this.file.contents.length) {
                this.file.contents = Buffer.concat([this.file.contents.slice(0, position), buffer.slice(offset, offset + length)]);
            } else {
                buffer.copy(this.file.contents, position, offset, offset + length);
            }
        }
        this.file.emit("change");
        return length; // ??
    }

    truncate(length) {
        this.file.contents = this.file.contents.slice(0, length);
        this.file.emit("change");
    }

    close() {
        //
    }
}

class File extends event.EventEmitter {
    constructor({
        size,
        contents = adone.emptyBuffer,
        mtime,
        atime,
        ctime,
        birthtime,
        uid = process.getuid(),
        gid = process.getgid(),
        mode = 0o644,
        beforeHook = noop,
        afterHook = noop
    } = {}) {
        super();
        this.contents = is.buffer(contents) ? contents : Buffer.from(contents);
        const now = new Date();
        this.mtime = mtime || now;
        this.atime = atime || now;
        this.ctime = ctime || now;
        this.birthtime = birthtime || now;
        this.mode = mode;
        this.uid = uid;
        this.gid = gid;
        this.beforeHook = beforeHook;
        this.afterHook = afterHook;
        this.nlink = 1;
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
        stat.inode = 0; // ?
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

    link() {
        this.emit("change");
        ++this.nlink;
    }

    unlink() {
        this.emit("change");
        --this.nlink;
    }

    open(flags, mode) {
        return new OpenedFile(this, flags, mode);
    }
}

class Symlink extends event.EventEmitter {
    constructor(vfs, targetPath, {
        mtime,
        atime,
        ctime,
        birthtime,
        uid = process.getuid(),
        gid = process.getgid(),
        beforeHook = noop,
        afterHook = noop
    } = {}) {
        super();
        this.vfs = vfs;

        /**
         * Generally the target can be a reference to any file,
         * not only files that the memory engine handles.
         * For now we support only local(this instance memory engine) targets.
         */
        this.targetPath = targetPath;

        const now = new Date();
        this.mtime = mtime || now;
        this.atime = atime || now;
        this.ctime = ctime || now;
        this.birthtime = birthtime || now;
        this.mode = 0o777;
        this.uid = uid;
        this.gid = gid;
        this.beforeHook = beforeHook;
        this.afterHook = afterHook;
        this.nlink = 1;
    }

    link() {
        this.emit("change");
        ++this.nlink;
    }

    unlink() {
        this.emit("change");
        --this.nlink;
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
        stat.inode = 0; // ?
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

class Directory extends event.EventEmitter {
    constructor(vfs, parent = undefined, path, {
        mtime,
        atime,
        ctime,
        birthtime,
        uid = process.getuid(),
        gid = process.getgid(),
        mode = 0o775,
        beforeHook = noop,
        afterHook = noop
    } = {}) {
        super();
        this.vfs = vfs;
        this.parent = parent || this;
        this.path = path;
        this.children = {};
        const now = new Date();
        this.mtime = mtime || now;
        this.atime = atime || now;
        this.ctime = ctime || now;
        this.birthtime = birthtime || now;
        this.mode = mode;
        this.uid = uid;
        this.gid = gid;
        this.beforeHook = beforeHook;
        this.afterHook = afterHook;
        this.nlink = 2; // file itself + ?
    }

    link() {
        ++this.nlink;
    }

    unlink() {
        --this.nlink;
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
                this.unlink(); // .. link
            }
            this.emit("delete", filename, node);
            delete this.children[filename];
        }
    }

    getChildren() {
        return Object.keys(this.children).sort();
    }

    addNode(filename, node) {
        this.children[filename] = node;
        if (node instanceof Directory) {
            this.link(); // .. link
        }
        this.emit("add", filename, node);
        return node;
    }

    addFile(filename, options) {
        const file = new File(options);
        this.children[filename] = file;
        this.emit("add", filename);
        return file;
    }

    addSymlink(filename, target, options) {
        const symlink = new Symlink(this.vfs, target, options);
        this.children[filename] = symlink;
        this.emit("add", filename, symlink);
        return symlink;
    }

    addDirectory(filename, options) {
        const directory = new Directory(this.vfs, this, this.path.join(filename), options);
        this.children[filename] = directory;
        this.link();
        this.emit("add", filename, directory);
        return directory;
    }

    stat() {
        const stat = new std.fs.Stats();
        stat.dev = 0; // ?
        stat.inode = 0; // ?
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
        this.__onParentRename = (changedFilename, changedNode) => {
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
            parentNode.on("rename", this.__onParentRename);

            for (const [name, child] of Object.entries(node.children)) {
                const onChange = () => this.emit("change", "change", this.encode(name));
                child.on("change", onChange);
                callbacks.set(child, onChange);
            }
        } else {
            node.on("change", this.__onChange);
        }
    }

    close() {
        const { parentNode, node } = this;
        if (node instanceof Directory) {
            node.removeListener("add", this.__onAdd).removeListener("delete", this.__onDelete);
            parentNode.removeListener("rename", this.__onParentRename);
            for (const [child, callback] of this.callbacks.entries()) {
                child.removeListener("change", callback);
            }
        } else {
            node.removeListener("change", this.__onChange);
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

    throw(code, path, syscall) {
        this.engine.throw(code, path, syscall);
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
        mode = 0o775
    }) {
        let parent = root;
        const parts = path.relativeParts;
        let filename = "";
        for (let i = 0; i < parts.length; ++i) {
            const part = parts[i];
            filename = part;
            if (part === "." || part === "") {
                if (root instanceof Directory) {
                    continue;
                }
                this.throw("ENOTDIR", path, syscall);
            }
            if (part === "..") {
                if (root instanceof Directory) {
                    root = root.parent;
                    continue;
                }
                this.throw("ENOTDIR", path, syscall);
            }
            if (!(root instanceof Directory)) {
                return [null, parent, null, unwinds];
            }
            parent = root;
            if (!root.exists(part)) {
                if (!ensureParent || i === parts.length - 1) {
                    return [null, parent, unwinds];
                }
                root = root.addDirectory(part, { mode });
                continue;
            } else {
                root = root.get(part);
            }
            if (root instanceof Symlink && (handleLeafSymlink || i !== parts.length - 1)) {
                if (unwinds > UNWIND_LIMIT) {
                    if (throwOnEloop) {
                        this.throw("ELOOP", path, syscall);
                    }
                    return [SYMLINK_LOOP, parent, null, unwinds];
                }

                [root, parent, filename, unwinds] = this.getNode({
                    path: root.targetPath,
                    syscall,
                    handleLeafSymlink: true,
                    root: parent,
                    unwinds: unwinds + 1,
                    throwOnEloop: false
                });
                if (root === SYMLINK_LOOP) {
                    if (throwOnEloop) {
                        this.throw("ELOOP", path, syscall);
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

    async open(path, flags, mode) {
        flags = stringToFlags(flags);

        let [node, directory] = this.getNode({ path, syscall: "open" }); // eslint-disable-line prefer-const

        const filename = path.filename();

        if (node) {
            if ((flags & O_EXCL) && (flags & O_CREAT)) {
                this.throw("EEXIST", path, "open");
            }
            if (node instanceof Directory && ((flags & O_RDWR) || (flags & O_WRONLY))) {
                this.throw("EISDIR", path, "open");
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
            node = directory.addFile(filename, { mode });
        }

        const opened = await node.open(flags, mode);
        const fd = this.fd++;
        this.fdMap.set(fd, opened);
        return fd;
    }

    async close(fd) {
        if (!this.fdMap.has(fd)) {
            this.throw("EBADF", undefined, "close");
        }
        const opened = this.fdMap.get(fd);
        await opened.close();
        this.fdMap.delete(fd);
    }

    async read(fd, buffer, offset, length, position) {
        if (!this.fdMap.has(fd)) {
            return; // throw ?
        }
        const opened = this.fdMap.get(fd);
        if (!opened.isOpenedForReading()) {
            this.throw("EBADF", undefined, "read");
        }
        return opened.read(buffer, offset, length, position);
    }

    async write(fd, buffer, offset, length, postition) {
        if (!this.fdMap.has(fd)) {
            this.throw("EBADF", undefined, "write");
        }
        const opened = this.fdMap.get(fd);
        if (!opened.isOpenedForWriting()) {
            this.throw("EBADF", undefined, "write");
        }
        return opened.write(buffer, offset, length, postition);
    }

    async ftruncate(fd, length) {
        if (!this.fdMap.has(fd)) {
            this.throw("EBADF", undefined, "ftruncate");
        }
        const opened = this.fdMap.get(fd);
        if (!opened.isOpenedForWriting()) {
            this.throw("EBADF", undefined, "ftruncate");
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
        // opened descriptors ????? for now they will normally live until they are closed
        console.log(node instanceof Symlink, node.unlink);
        node.unlink();
        parent.delete(path.filename());
    }

    utimes(path, atime, mtime) {
        const [node] = this.getNode({ path });
        if (is.null(node)) {
            this.throw("ENOENT", path, "utime");
        }
        node.atime = new Date(atime * 1000);
        node.mtime = new Date(mtime * 1000);
    }

    futimes(fd, atime, mtime) {
        if (!this.fdMap.has(fd)) {
            this.throw("EBADF", undefined, "futimes");
        }
        const node = this.fdMap.get(fd).file;
        node.atime = new Date(atime * 1000);
        node.mtime = new Date(mtime * 1000);
    }

    async rmdir(path) {
        const [node] = this.getNode({ path, syscall: "rmdir", handleLeafSymlink: false });
        if (is.null(node)) {
            this.throw("ENOENT", path, "rmdir");
        }
        if (!(node instanceof Directory)) {
            this.throw("ENOTDIR", path, "rmdir");
        }
        if (!node.isEmpty()) {
            this.throw("ENOTEMPTY", path, "rmdir");
        }
        // root rmdir ?
        const parent = node.parent;
        parent.delete(path.filename());
    }

    async mkdir(path, mode) {
        const [node, parent] = this.getNode({ path, syscall: "mkdir" });

        if (node) {
            this.throw("EEXIST", path, "mkdir");
        }
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
        let nmode = node.mode;
        // all
        if (nmode & mode) {
            return;
        }
        // group
        nmode >>= 3;
        if ((nmode & mode) && (process.getgroups().includes(node.gid))) {
            return;
        }
        // user
        nmode >>= 3;
        if ((nmode & mode) && (process.getuid() === node.uid)) {
            return;
        }
        this.throw("EACCESS", path, "access");
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
            this.throw("EBADF", undefined, "fchmod");
        }
        const opened = this.fdMap.get(fd);
        const node = opened.file;
        node.mode = ((node.mode >>> 12) << 12) | mode;
    }

    lchmod(path, mode) {
        const [node] = this.getNode({ path, syscall: "lchmod", handleLeafSymlink: false });
        if (is.null(node)) {
            this.throw("ENOENT", path, "lchmod");
        }
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
            this.throw("EBADF", undefined, "syscall");
        }
        const node = this.fdMap.get(fd).file;
        node.gid = gid;
        node.uid = uid;
    }

    lchown(path, uid, gid) {
        const [node] = this.getNode({ path, syscall: "chown", handleLeafSymlink: false });
        if (is.null(node)) {
            this.throw("ENOENT", path, "chown");
        }
        node.gid = gid;
        node.uid = uid;
    }

    async rename(oldPath, newPath) {
        const [oldNode] = this.getNode({ path: oldPath, syscall: "rename" });
        if (is.null(oldNode)) {
            this.throw("ENOENT", oldPath, "rename");
        }
        const [, newDirectory] = this.getNode({ path: newPath, syscall: "rename" });
        if (is.null(newDirectory)) {
            this.throw("ENOENT", newPath, "rename");
        }
        oldNode.parent.delete(oldPath.filename());
        newDirectory.addNode(newPath.filename(), oldNode);
    }

    async symlink(path, target) {
        const [node, parent] = this.getNode({ path }); // TODO: symlink has a special error message
        if (node) {
            this.throw("EEXIST", path, "symlink");
        }
        parent.addSymlink(path.filename(), target);
    }

    async link(existingPath, newPath) {
        const [existingNode] = this.getNode({ path: existingPath, syscall: "link", handleLeafSymlink: false }); // do not handle the last symlink
        if (is.null(existingNode)) {
            this.throw("ENOENT", existingPath, "link"); // TODO: has a special error message
        }
        if (existingNode instanceof Directory) {
            this.throw("EPERM", existingPath, "link"); // not allowed for directories
        }

        const [node, parent] = this.getNode({ path: newPath, syscall: "link" });

        if (node) {
            this.throw("EEXIST", newPath, "link");
        }
        existingNode.link();
        parent.addNode(newPath.filename(), existingNode);
    }

    async fstat(fd) {
        if (!this.fdMap.has(fd)) {
            this.throw("EBADF", undefined, "fstat");
        }
        const opened = this.fdMap.get(fd);
        return opened.file.stat();
    }

    async fsync(fd) {
        if (!this.fdMap.has(fd)) {
            this.throw("EBADF", undefined, "fsync");
        }
        // nothing?
    }

    async fdatasync(fd) {
        if (!this.fdMap.has(fd)) {
            this.throw("EBADF", undefined, "fdatasync");
        }
        // nothing?
    }

    async copyFile(src, dst, flags) {
        const [srcNode] = this.getNode({ path: src, syscall: "copyfile" }); // TODO: a special error message
        if (is.null(srcNode)) {
            this.throw("ENOENT", src, "copyfile");
        }
        if (srcNode instanceof Directory) {
            this.throw("EISDIR", src, "copyfile");
        }
        // must be a file
        const [destNode, destNodeDirectory] = this.getNode({ path: dst, syscall: "copyfile" });

        if (flags === COPYFILE_EXECL) {
            if (destNode) {
                this.throw("EEXIST", dst, "copyfile"); // TODO: a special error message
            }
        }
        destNodeDirectory.addNode(dst.filename(), srcNode.copy());
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
        const [node] = this.vfs.getNode({ path, syscall: "scandir" });
        if (is.null(node)) {
            this.throw("ENOENT", path, "scandir");
        }
        if (!(node instanceof Directory)) {
            this.throw("ENOTDIR", path, "scandir");
        }
        await node.beforeHook("readdir");
        let children = node.getChildren();
        if (options.encoding === "buffer") {
            children = children.map(Buffer.from);
        }
        return (await node.afterHook("readdir", children)) || children;
    }

    async _realpath(path, options) {
        const [node, parent, filename] = this.vfs.getNode({ path });
        if (is.null(node)) {
            this.throw("ENOENT", path);
        }

        let realpath = `${parent.path.fullPath}/${filename}`;

        if (options.encoding === "buffer") {
            realpath = Buffer.from(realpath);
        }

        return (await node.afterHook("realpath", realpath)) || realpath;
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
