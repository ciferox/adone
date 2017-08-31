const { std: { path: spath }, is, fs } = adone;

export default class Directory {
    constructor(...path) {
        this._path = spath.resolve(...path);
    }

    dirname() {
        return spath.dirname(this._path);
    }

    filename() {
        return spath.basename(this._path);
    }

    path() {
        return this._path;
    }

    normalizedPath() {
        return is.windows ? adone.util.normalizePath(this._path) : this._path;
    }

    relativePath(path) {
        if (path instanceof Directory) {
            path = path.path();
        }
        return spath.relative(path, this._path);
    }

    stat() {
        return fs.stat(this._path);
    }

    lstat() {
        return fs.lstat(this._path);
    }

    exists() {
        return fs.exists(this._path);
    }

    async create({ mode = 0o777 } = {}) {
        if (!(await this.exists())) {
            return fs.mkdir(this._path, mode);
        }
    }

    resolve(...paths) {
        return spath.resolve(this._path, ...paths);
    }

    getFile(...paths) {
        return new fs.File(this.resolve(...paths));
    }

    getDirectory(...paths) {
        return new Directory(this.resolve(...paths));
    }

    getSymbolicLinkFile(...paths) {
        return new fs.SymbolicLinkFile(this.resolve(...paths));
    }

    getSymbolicLinkDirectory(...paths) {
        return new fs.SymbolicLinkDirectory(this.resolve(...paths));
    }

    async get(...path) {
        path = this.resolve(...path);
        const stat = await fs.lstat(path);
        return stat.isDirectory() ? new Directory(path) : new fs.File(path);
    }

    async _ensurePath(path) {
        let root = this;
        for (const part of path) {
            root = root.getDirectory(part);
            // eslint-disable-next-line no-await-in-loop
            if (!(await root.exists())) {
                // eslint-disable-next-line no-await-in-loop
                await root.create();
            }
        }
        return root;
    }

    async addFile(...filename) {
        const opts = { contents: null, mode: 0o666 };
        if (is.object(filename[filename.length - 1])) {
            Object.assign(opts, filename.pop());
        }
        let root = this;
        if (filename.length > 1) {
            root = await this._ensurePath(filename.slice(0, -1));
        }
        filename = filename.pop();
        const file = new fs.File(spath.join(root.path(), filename));
        await file.create({ mode: opts.mode });
        if (opts.contents) {
            await file.write(opts.contents);
        }
        return file;
    }

    async addDirectory(...filename) {
        let root = this;
        if (filename.length > 1) {
            root = await this._ensurePath(filename.slice(0, -1));
        }
        filename = filename.pop();
        const dir = new Directory(spath.join(root.path(), filename));
        await dir.create();
        return dir;
    }

    async files() {
        const paths = await fs.readdir(this._path);
        const files = await Promise.all(paths.map(async (x) => {
            const path = spath.join(this._path, x);
            const stat = await fs.lstat(path).catch((err) => {
                if (err.code === "ENOENT") { // wow
                    return null;
                }
                return Promise.reject(err);
            });
            if (!stat) {
                return;
            }
            if (stat.isSymbolicLink()) {
                return stat.isDirectory() ? new fs.SymbolicLinkDirectory(path) : new fs.SymbolicLinkFile(path);
            }
            return stat.isDirectory() ? new Directory(path) : new fs.File(path);
        }));

        return files.filter((x) => x);
    }

    filesSync() {
        const paths = fs.readdirSync(this._path);
        return paths.map((x) => {
            const path = spath.join(this._path, x);
            let stat;
            try {
                stat = fs.statSync(path);
            } catch (err) {
                if (err.code === "ENOENT") { // wow
                    stat = null;
                }
                throw err;
            }
            if (!stat) {
                return null;
            }
            if (stat.isSymbolicLink()) {
                return stat.isDirectory() ? new fs.SymbolicLinkDirectory(path) : new fs.SymbolicLinkFile(path);
            }
            return stat.isDirectory() ? new Directory(path) : new fs.File(path);
        }).filter((x) => x);
    }

    async clean() {
        const files = await this.files();
        for (const file of files) {
            await file.unlink();
        }
    }

    unlink({ retries = 10, delay = 100 } = {}) {
        return fs.rm(this._path, { maxBusyTries: retries, emfileWait: delay });
    }

    async find({ files = true, dirs = false } = {}) {
        const nested = [];
        for (const file of await this.files()) {
            if (file instanceof fs.File) {
                if (files) {
                    nested.push(file);
                }
            } else {
                if (dirs) {
                    nested.push(file);
                }
                nested.push(...(await file.find({ files, dirs })));
            }
        }
        return nested;
    }

    findSync({ files = true, dirs = false } = {}) {
        const nested = [];
        for (const file of this.filesSync()) {
            if (file instanceof fs.File) {
                if (files) {
                    nested.push(file);
                }
            } else {
                if (dirs) {
                    nested.push(file);
                }
                nested.push(...file.findSync({ files, dirs }));
            }
        }
        return nested;
    }

    async rename(name) {
        if (name instanceof Directory) {
            name = name.filename();
        }
        const newPath = spath.join(this.dirname(), name);
        await fs.rename(this._path, newPath);
        this._path = newPath;
    }

    symbolicLink(path) {
        if (path instanceof Directory) {
            path = path.path();
        }
        return fs.symlink(this._path, path).then(() => new fs.SymbolicLinkDirectory(path));
    }

    copyTo(destPath, options) {
        return fs.copy(this._path, destPath, options);
    }

    copyFrom(srcPath, options) {
        return fs.copy(srcPath, this._path, options);
    }

    static async create(...path) {
        const dir = new Directory(...path);
        await dir.create();
        return dir;
    }

    static async createTmp(options) {
        return Directory.create(await fs.tmpName(options));
    }
}
