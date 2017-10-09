const {
    fs: {
        engine: {
            Path: Path0,
            AbstractEngine
        }
    },
    is,
    x,
    std,
    util,
    noop,
    identity
} = adone;

const lazy = adone.lazify({
    uid: () => is.windows ? -1 : adone.util.userid.uid().uid,
    gid: () => is.windows ? -1 : adone.util.userid.uid().gid
});

const Path = Path0.configure({ root: [""] }); // use custom root as /

class ENOENT extends x.Exception { }
ENOENT.prototype.code = "ENOENT";
ENOENT.prototype.name = "ENOENT";

class EISDIR extends x.Exception { }
EISDIR.prototype.code = "EISDIR";
EISDIR.prototype.name = "EISDIR";

class ENOTDIR extends x.Exception { }
ENOTDIR.prototype.code = "ENOTDIR";
ENOTDIR.prototype.name = "ENOTDIR";

class ELOOP extends x.Exception { }
ELOOP.prototype.code = "ELOOP";
ELOOP.prototype.name = "ELOOP";

class File {
    constructor(parent, path, {
        contents = adone.emptyBuffer,
        mtime,
        atime,
        ctime,
        birthtime,
        uid = lazy.uid,
        gid = lazy.gid,
        mode = 0o644,
        beforeHook = noop,
        afterHook = noop
    } = {}) {
        this.parent = parent;
        this.path = path;
        this.contents = contents;
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
        stat.nlink = 0; // ?
        stat.uid = this.uid;
        stat.gid = this.gid;
        stat.rdev = 0; // ?
        stat.size = this.contents.length;
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

    stat() {
        return this.lstat();
    }
}

class Symlink {
    constructor(vfs, parent, path, targetPath, {
        mtime,
        atime,
        ctime,
        birthtime,
        uid = lazy.uid,
        gid = lazy.gid,
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

    getTargetNode() {
        return this.vfs.getNode(this.targetPath, true, false, this.parent);
    }

    /**
     * @returns null or the real node
     */
    unwindTarget() {
        const target = this.getTargetNode();
        if (is.null(target) || !(target instanceof Symlink)) {
            return target;
        }
        return target.unwindTarget();
    }

    lstat() {
        const stat = new std.fs.Stats();
        stat.dev = 0; // ?
        stat.inode = 0; // ?
        stat.nlink = 0; // ?
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
        const target = this.unwindTarget();
        if (is.null(target)) {
            throw new ENOENT(`no such file or direcory ${this.targetPath.fullPath()}`);
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
        uid = lazy.uid,
        gid = lazy.gid,
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

    exists(filename) {
        return Boolean(this.children[filename]);
    }

    get(filename) {
        return this.children[filename];
    }

    getChildren() {
        return Object.keys(this.children).sort();
    }

    addFile(filename, options) {
        this.children[filename] = new File(this, this.path.join(filename), options);
    }

    addSymlink(filename, target, options) {
        this.children[filename] = new Symlink(this.vfs, this, this.path.join(filename), target, options);
    }

    addDirectory(filename, options) {
        this.children[filename] = new Directory(this.vfs, this, this.path.join(filename), options);
    }

    lstat() {
        const stat = new std.fs.Stats();
        stat.dev = 0; // ?
        stat.inode = 0; // ?
        stat.nlink = 0; // ?
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
    constructor() {
        this.root = new Directory(this, undefined, new Path("/"));
    }

    _getDirectory(path, create = true) {
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
                root = root.unwindTarget(); // unwind symlink references, find the real node
            }
            if (!(root instanceof Directory)) {
                throw new x.IllegalState(`${part} of ${path} is not a directory`);
            }
        }
        return root;
    }

    addFile(path, options) {
        path = new Path(path);
        const directory = this._getDirectory(path);
        if (!is.object(options)) {
            options = { contents: options };
        }
        directory.addFile(path.filename(), options);
    }

    addSymlink(target, linkname, options) {
        target = new Path(target);
        linkname = new Path(linkname);
        const linknameDirectory = this._getDirectory(linkname);
        // if (is.null(linknameDirectory)) {
        //     throw new ENOENT(`no such file or directory ${linkname.fullPath()}`);
        // }
        linknameDirectory.addSymlink(linkname.filename(), target, options);
    }

    addDirectory(path, options) {
        path = new Path(path);
        const dir = this._getDirectory(path);
        dir.addDirectory(path.filename(), options);
    }

    getNode(path, handleLeafSymlink = true, returnNewPath = false, root = this.root) {
        let unwinds = 0;
        let newPath = root.path;
        const parts = path.relativeParts;
        for (let i = 0; i < parts.length; ++i) {
            const part = parts[i];
            if (part === "." || part === "") {
                if (root instanceof Directory) {
                    continue;
                }
                throw new ENOTDIR(`not a directory, ${path.nonRelativeJoin(newPath)}`);
            }
            if (part === "..") {
                if (root instanceof Directory) {
                    root = root.parent;
                    continue;
                }
                throw new ENOTDIR(`not a directory, ${path.nonRelativeJoin(newPath)}`);
            }
            if (!(root instanceof Directory) || !root.exists(part)) {
                return null;
            }
            root = root.get(part);
            if (root instanceof Symlink && (handleLeafSymlink || i !== parts.length - 1)) {
                if (unwinds > 100) {
                    throw new ELOOP(`too many symbolic links encountered, '${path.nonRelativeJoin(newPath)}'`);
                }
                root = root.unwindTarget();
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

    getDirectory(path) {
        const node = this.getNode(path);
        if (is.null(node)) {
            throw new ENOENT(`no such file ${path.fullPath()}`);
        }
        if (!(node instanceof Directory)) {
            throw new ENOTDIR(`not a direcory ${path.fullPath()}`);
        }
        return node;
    }

    getFile(path) {
        const node = this.getNode(path);
        if (is.null(node)) {
            throw new ENOENT(`no such file ${path.fullPath()}`);
        }
        if (node instanceof Directory) {
            throw new EISDIR(`is a directory ${path.fullPath()}`);
        }
        return node;
    }

    clean() {
        this.root = new Directory(this, undefined, new Path("/"));
    }
}

const callbackify = (target, key, descriptor) => {
    const fn = descriptor.value;
    descriptor.value = function (...args) {
        const cb = args.pop();
        adone.promise.nodeify(fn.apply(this, args), cb);
    };
};

export default class MemoryEngine extends AbstractEngine {
    constructor() {
        super();
        this.vfs = new VFS();
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
        const p = new Path("/");
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
                            this.addFile(q.fullPath(), options);
                            break;
                        }
                        case "symlink": {
                            this.addSymlink(value.path, q.fullPath(), value.options);
                            break;
                        }
                        default: {
                            if (is.array(value)) {
                                this.addDirectory(q.fullPath(), value[1]);
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

    @callbackify
    async _readFile(path, options) {
        const node = this.vfs.getFile(path);
        const { encoding } = options;
        await node.beforeHook("readFile");
        const result = encoding ? node.contents.toString(encoding) : node.contents;
        return (await node.afterHook("readFile", result)) || result;
    }

    @callbackify
    async _stat(path) {
        const node = this.vfs.getNode(path);
        if (is.null(node)) {
            throw new ENOENT(`no such file or directory ${path.fullPath()}`);
        }
        if (path.trailingSlash && !(node instanceof Directory)) {
            throw new ENOTDIR(`not a directory ${path.fullPath()}`);
        }
        await node.beforeHook("stat");
        const stat = node.stat();
        return (await node.afterHook("stat", stat)) || stat;
    }

    @callbackify
    async _lstat(path) {
        const node = this.vfs.getNode(path, false);
        if (is.null(node)) {
            throw new ENOENT(`no such file or directory ${path.fullPath()}`);
        }
        if (path.trailingSlash) {
            if (node instanceof Symlink) {
                const target = node.unwindTarget();
                if (!(target instanceof Directory)) {
                    throw new ENOTDIR(`not a directory ${path.fullPath()}`);
                }
            } else if (!(node instanceof Directory)) {
                throw new ENOTDIR(`not a directory ${path.fullPath()}`);
            }
        }
        await node.beforeHook("lstat");
        const stat = node.lstat();
        return (await node.afterHook("lstat", stat)) || stat;
    }

    @callbackify
    async _readdir(path, options) {
        const node = this.vfs.getDirectory(path);
        await node.beforeHook("readdir");
        let children = node.getChildren();
        if (options.encoding === "buffer") {
            children = children.map(Buffer.from);
        }
        return (await node.afterHook("readdir", children)) || children;
    }

    @callbackify
    async _realpath(path, options) {
        const node = this.vfs.getNode(path);
        if (is.null(node)) {
            throw new ENOENT(`no such file or directory, '${path.fullPath()}'`);
        }

        await node.beforeHook("realpath");

        let realpath = path.nonRelativeJoin(node.path);

        if (options.encoding === "buffer") {
            realpath = Buffer.from(realpath);
        }

        return (await node.afterHook("realpath", realpath)) || realpath;
    }
}
