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
            X_OK
        }
    },
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
        if (is.null(position)) {
            const bytes = Math.min(this.file.length - this.filePosition, length);
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
        if (is.null(position)) {
            this.filePosition += buffer.length;
            this.file.contents = Buffer.concat([this.file.contents, buffer]);
        } else {
            if (buffer.length + position > this.file.contents.length) {
                this.file.contents = Buffer.concat([this.file.contents.slice(0, position), buffer]);
            } else {
                buffer.copy(this.file.contents, position);
            }
        }
        return buffer.length; // ? when it can be less
    }

    write(buffer, offset, length, position) {
        if (is.string(buffer)) {
            return this.writeString(buffer, offset, length);
        }
        if (is.null(position)) {
            //
            this.filePosition += length; // buffer is not so long?
            this.file.contents = Buffer.concat([this.file.contents, buffer.slice(offset, offset + length)]);
        } else {
            if (length + position > this.file.contents.length) {
                this.file.contents = Buffer.concat([this.file.contents.slice(0, position), buffer.slice(offset, offset + length)]);
            } else {
                buffer.copy(this.file.contents, position, offset, offset + length);
            }
        }
        return length; // ??
    }

    truncate(length) {
        this.file.contents = this.file.contents.slice(0, length);
    }

    close() {
        //
    }
}

class File {
    constructor(parent, path, {
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
        this.parent = parent;
        this.path = path;
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

    clone() {
        return new File(this.parent, this.path, {
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

    lstat() {
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
        ++this.nlink;
    }

    unlink() {
        --this.nlink;
    }

    stat() {
        return this.lstat();
    }

    open(flags, mode) {
        return new OpenedFile(this, flags, mode);
    }
}

class Symlink {
    constructor(vfs, parent, path, targetPath, {
        mtime,
        atime,
        ctime,
        birthtime,
        uid = process.getuid(),
        gid = process.getgid(),
        beforeHook = noop,
        afterHook = noop
    } = {}) {
        this.vfs = vfs;
        this.parent = parent;
        this.path = path;

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
        ++this.nlink;
    }

    unlink() {
        --this.unlink;
    }

    clone() {
        return new Symlink(this.vfs, this.parent, this.path, this.targetPath, {
            mtime: this.mtime,
            atime: this.atime,
            ctime: this.ctime,
            birthtime: this.birthtime,
            uid: this.uid,
            gid: this.gid
        });
    }

    getTargetNode(syscall) {
        return this.vfs.getNode(this.targetPath, syscall, false, false, this.parent);
    }

    /**
     * @returns null or the real node
     */
    unwindTarget(syscall, level = 0) {
        const target = this.getTargetNode(syscall);
        if (is.null(target) || !(target instanceof Symlink)) {
            return target;
        }
        if (level === UNWIND_LIMIT - 1) {
            return SYMLINK_LOOP;
        }
        return target.unwindTarget(syscall, level + 1);
    }

    lstat() {
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

    stat() {
        const target = this.unwindTarget("stat");
        if (target === SYMLINK_LOOP) {
            this.vfs.throw("ELOOP", this.targetPath, "stat");
        }
        if (is.null(target)) {
            this.vfs.throw("ENOENT", this.targetPath, "stat");
        }
        return target.stat();
    }
}

class Directory {
    constructor(vfs, parent = this, path, {
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
        this.vfs = vfs;
        this.parent = parent;
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
            if (this.children[filename] instanceof Directory) {
                this.unlink(); // .. link
            }
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
        return node;
    }

    addFile(filename, options) {
        const file = new File(this, this.path.join(filename), options);
        this.children[filename] = file;
        return file;
    }

    addSymlink(filename, target, options) {
        const symlink = new Symlink(this.vfs, this, this.path.join(filename), target, options);
        this.children[filename] = symlink;
        return symlink;
    }

    addDirectory(filename, options) {
        const directory = new Directory(this.vfs, this, this.path.join(filename), options);
        this.children[filename] = directory;
        this.link(); // nested directory automatically has a ".." link to the parent
        return directory;
    }

    lstat() {
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

    stat() {
        return this.lstat();
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

    _getDirectory(path, syscall, create = true) {
        let root = this.root;
        const parts = path.relativeParts;
        for (let i = 0; i < parts.length - 1; ++i) {
            const part = parts[i];
            if (part === "." || part === "") {
                continue;
            }
            if (part === "..") {
                root = root.parent;
                continue;
            }
            if (!root.exists(part)) {
                if (!create) {
                    return null;
                }
                root.addDirectory(part);
            }
            root = root.get(part);
            if (root instanceof Symlink) {
                root = root.unwindTarget(syscall); // unwind symlink references, find the real node
                if (root === SYMLINK_LOOP) {
                    this.throw("ELOOP", path, syscall);
                }
            }
            if (!(root instanceof Directory)) {
                this.throw("ENOTDIR", path);
            }
        }
        return root;
    }

    addFile(path, options) {
        path = Path.wrap(path);
        const directory = this._getDirectory(path);
        if (!is.object(options)) {
            options = { contents: options };
        }
        directory.addFile(path.filename(), options);
    }

    addSymlink(target, linkname, options) {
        target = Path.wrap(target);
        linkname = Path.wrap(linkname);
        const linknameDirectory = this._getDirectory(linkname);
        linknameDirectory.addSymlink(linkname.filename(), target, options);
    }

    addDirectory(path, options) {
        path = Path.wrap(path);
        const dir = this._getDirectory(path);
        dir.addDirectory(path.filename(), options);
    }

    getNode(path, syscall, handleLeafSymlink = true, returnNewPath = false, root = this.root) {
        let unwinds = 0;
        let newPath = root.path;
        const parts = path.relativeParts;
        for (let i = 0; i < parts.length; ++i) {
            const part = parts[i];
            if (part === "." || part === "") {
                if (root instanceof Directory) {
                    continue;
                }
                this.throw("ENOTDIR", path, syscall);
                // throw new ENOTDIR(`not a directory, ${path.nonRelativeJoin(newPath)}`);
            }
            if (part === "..") {
                if (root instanceof Directory) {
                    root = root.parent;
                    continue;
                }
                this.throw("ENOTDIR", path, syscall);
                // throw new ENOTDIR(`not a directory, ${path.nonRelativeJoin(newPath)}`);
            }
            if (!(root instanceof Directory) || !root.exists(part)) {
                return null;
            }
            root = root.get(part);
            if (root instanceof Symlink && (handleLeafSymlink || i !== parts.length - 1)) {
                if (unwinds > UNWIND_LIMIT) {
                    this.throw("ELOOP", path, syscall);
                    // throw new ELOOP(path.nonRelativeJoin(newPath), syscall);
                }
                root = root.unwindTarget(syscall, unwinds); // here we will not count inner unwinds, ok?
                if (root === SYMLINK_LOOP) {
                    this.throw("ELOOP", path, syscall);
                    // throw new ELOOP(path.nonRelativeJoin(newPath), syscall);
                }
                ++unwinds;
                if (!root) {
                    return null;
                }
            }
            newPath = newPath.join(root.path.filename());
        }
        if (returnNewPath) {
            root = root.clone();
            root.path = newPath;
        }
        return root;
    }

    getDirectory(path, options, syscall) {
        const parent = this._getDirectory(path, syscall, true);
        if (path.parts.length === 0) { // this is root;
            return parent;
        }
        const filename = path.filename();
        if (parent.exists(filename)) {
            const node = parent.get(filename);
            if (!(node instanceof Directory)) {
                this.throw("ENOTDIR", path, syscall);
            }
            return node;
        }
        return parent.addDirectory(filename, options);
    }

    getFile(path, syscall) {
        const node = this.getNode(path, syscall);
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

    async open(path, flags, mode) {
        /**
         *   case "r": return O_RDONLY;
         *   case "rs": // Fall through.
         *   case "sr": return O_RDONLY | O_SYNC;
         *   case "r+": return O_RDWR;
         *   case "rs+": // Fall through.
         *   case "sr+": return O_RDWR | O_SYNC;
         *   case "w": return O_TRUNC | O_CREAT | O_WRONLY;
         *   case "wx": // Fall through.
         *   case "xw": return O_TRUNC | O_CREAT | O_WRONLY | O_EXCL;
         *   case "w+": return O_TRUNC | O_CREAT | O_RDWR;
         *   case "wx+": // Fall through.
         *   case "xw+": return O_TRUNC | O_CREAT | O_RDWR | O_EXCL;
         *   case "a": return O_APPEND | O_CREAT | O_WRONLY;
         *   case "ax": // Fall through.
         *   case "xa": return O_APPEND | O_CREAT | O_WRONLY | O_EXCL;
         *   case "a+": return O_APPEND | O_CREAT | O_RDWR;
         *   case "ax+": // Fall through.
         *   case "xa+": return O_APPEND | O_CREAT | O_RDWR | O_EXCL;
         */
        flags = stringToFlags(flags);

        let node;

        const directory = this._getDirectory(path, "open", false);

        if (is.null(directory)) {
            this.throw("ENOENT", path, "open");
        }

        const filename = path.filename();

        if (directory.exists(filename)) {
            if ((flags & O_EXCL) && (flags & O_CREAT)) {
                this.throw("EEXIST", path, "open");
            }
            node = directory.get(filename);
            if (node instanceof Symlink) {
                node = node.unwindTarget();
                if (is.null(node)) {
                    this.throw("ENOENT", path, "open");
                }
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
        const directory = this._getDirectory(path);
        if (is.null(directory)) {
            this.throw("ENOENT", path, "unlink");
        }
        const filename = path.filename();
        if (!directory.exists(filename)) {
            this.throw("ENOENT", path, "unlink");
        }
        const node = directory.get(filename);
        if (node instanceof Directory) {
            this.throw("EISDIR", path, "unlink");
        }
        // opened descriptors ????? for now they will normally live until they are closed
        node.unlink();
        directory.delete(filename);
    }

    async utimes(path, atime, mtime) {
        const node = this.getNode(path);
        if (is.null(node)) {
            this.throw("ENOENT", path, "utime");
        }
        node.atime = new Date(atime * 1000);
        node.mtime = new Date(mtime * 1000);
    }

    async rmdir(path) {
        const node = this.getNode(path, "rmdir", false); // do not resolve the last symlink
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
        const directory = this._getDirectory(path, "mkdir");
        if (is.null(directory)) {
            this.throw("ENOENT", path, "mkdir");
        }
        const filename = path.filename();
        if (directory.exists(filename)) {
            this.throw("EEXIST", path, "mkdir");
        }
        directory.addDirectory(filename, { mode });
    }

    async access(path, mode) {
        const node = this.getNode(path);
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

    async chmod(path, mode) {
        const node = this.getNode(path);
        if (is.null(node)) {
            this.throw("ENOENT", path, "chmod");
        }
        node.mode = ((node.mode >>> 12) << 12) | mode;
    }

    async chown(path, uid, gid) {
        const node = this.getNode(path);
        if (is.null(node)) {
            this.throw("ENOENT", path, "chown");
        }
        node.gid = gid;
        node.uid = uid;
    }

    async rename(oldPath, newPath) {
        const oldNode = this.getNode(oldPath);
        if (is.null(oldNode)) {
            this.throw("ENOENT", oldPath, "rename");
        }
        const newDirectory = this._getDirectory(newPath, "rename", false);
        if (is.null(newDirectory)) {
            this.throw("ENOENT", newPath, "rename");
        }
        oldNode.parent.delete(oldPath.filename());
        newDirectory.addNode(newPath.filename(), oldNode);
    }

    async symlink(path, target) {
        const linknameDirectory = this._getDirectory(path);
        if (is.null(linknameDirectory)) {
            this.throw("ENOENT", path, "symlink"); // TODO: symlink has a special error message
        }
        if (linknameDirectory.exists(path.filename())) {
            this.throw("EEXIST", path, "symlink");
        }
        linknameDirectory.addSymlink(path.filename(), target);
    }

    async link(existingPath, newPath) {
        const node = this.getNode(existingPath, "link", false); // do not handle the last symlink
        if (is.null(node)) {
            this.throw("ENOENT", existingPath, "link"); // TODO: has a special error message
        }
        if (node instanceof Directory) {
            this.throw("EPERM", existingPath, "link"); // not allowed for directories
        }
        const directory = this._getDirectory(newPath, "link", false);
        if (is.null(directory)) {
            this.throw("ENOENT", newPath, "link");
        }
        if (directory.exists(newPath.filename())) {
            this.throw("EEXIST", newPath, "link");
        }
        node.link();
        directory.addNode(newPath.filename(), node);
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
        const visit = (path, obj) => {
            for (const [key, value] of util.entries(obj)) {
                const parts = util.braces.expand(key);
                for (const part of parts) {
                    const q = path.join(part);
                    switch (value[TYPE]) {
                        case "file": {
                            let { options } = value;
                            if (is.function(options)) {
                                options = options(part, q);
                            }
                            this.addFile(q, options);
                            break;
                        }
                        case "symlink": {
                            this.addSymlink(value.path, q, value.options);
                            break;
                        }
                        default: {
                            if (is.array(value)) {
                                this.addDirectory(q, value[1]);
                                visit(q, value[0]);
                            } else {
                                visit(q, value);
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
        const node = this.vfs.getNode(path, "stat");
        if (is.null(node)) {
            this.throw("ENOENT", path, "stat");
            // throw new ENOENT(`no such file or directory ${path.fullPath}`);
        }
        if (path.trailingSlash && !(node instanceof Directory)) {
            this.throw("ENOENT", path, "stat");
            // throw new ENOTDIR(`not a directory ${path.fullPath}`);
        }
        await node.beforeHook("stat");
        const stat = node.stat();
        return (await node.afterHook("stat", stat)) || stat;
    }

    async _lstat(path) {
        const node = this.vfs.getNode(path, "lstat", false);
        if (is.null(node)) {
            this.throw("ENOENT", path, "lstat");
            // throw new ENOENT(`no such file or directory ${path.fullPath}`);
        }
        if (path.trailingSlash) {
            if (node instanceof Symlink) {
                const target = node.unwindTarget("lstat");
                if (!(target instanceof Directory)) {
                    this.throw("ENOTDIR", path, "lstat");
                }
            } else if (!(node instanceof Directory)) {
                this.throw("ENOTDIR", path, "lstat");
            }
        }
        await node.beforeHook("lstat");
        const stat = node.lstat();
        return (await node.afterHook("lstat", stat)) || stat;
    }

    async _readdir(path, options) {
        const node = this.vfs.getNode(path, "scandir");
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
        const node = this.vfs.getNode(path);
        if (is.null(node)) {
            this.throw("ENOENT", path);
        }

        await node.beforeHook("realpath");

        let realpath = path.nonRelativeJoin(node.path);

        if (options.encoding === "buffer") {
            realpath = Buffer.from(realpath);
        }

        return (await node.afterHook("realpath", realpath)) || realpath;
    }

    async _readlink(path, options) {
        const node = this.vfs.getNode(path, "readlink", false);
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

    async _chown(path, uid, gid) {
        return this.vfs.chown(path, uid, gid);
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
}
