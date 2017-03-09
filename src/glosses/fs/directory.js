import adone from "adone";
const { std: { fs: sfs, path: spath }, vendor: { lodash: _ }, is, fs } = adone;

export default class Directory {
    constructor(path) {
        this._path = path;
    }

    dirname() {
        return spath.dirname(this.path());
    }

    filename() {
        return spath.basename(this.path());
    }

    path() {
        return this._path;
    }

    normalizedPath() {
        return is.win32 ? adone.util.normalizePath(this.path()) : this.path();
    }

    relativePath(path) {
        if (path instanceof Directory) {
            path = path.path();
        }
        return spath.relative(path, this.path());
    }

    stat() {
        return sfs.statAsync(this.path());
    }

    lstat() {
        return sfs.lstatAsync(this.path());
    }

    exists() {
        return sfs.accessAsync(this.path(), sfs.constants.F_OK).then(() => true, () => false);
    }

    create({ mode = 0o777 } = {}) {
        return sfs.mkdirAsync(this.path(), mode);
    }

    async get(...path) {
        path = spath.resolve(this.path(), ...path);
        const stat = await sfs.lstatAsync(path);
        return stat.isDirectory() ? new Directory(path) : new fs.File(path);
    }

    getVirtualSymbolicLinkFile(...path) {
        path = spath.resolve(this.path(), ...path);
        return new fs.SymbolicLinkFile(path);
    }

    getVirtualSymbolicLinkDirectory(...path) {
        path = spath.resolve(this.path(), ...path);
        return new fs.SymbolicLinkDirectory(path);
    }

    getVirtualFile(...path) {
        path = spath.resolve(this.path(), ...path);
        return new fs.File(path);
    }

    getVirtualDirectory(...path) {
        path = spath.resolve(this.path(), ...path);
        return new Directory(path);
    }

    async addFile(...filename) {
        let opts = { content: null, mode: 0o666 };
        if (is.object(filename[filename.length - 1])) {
            opts = _.defaults(filename.pop(), opts);
        }
        let root = this;
        if (filename.length > 1) {
            root = await this._ensurePath(filename.slice(0, -1));
        }
        filename = filename.pop();
        const file = new fs.File(spath.join(root.path(), filename));
        await file.create({ mode: opts.mode });
        if (opts.content) {
            await file.write(opts.content);
        }
        return file;
    }

    async _ensurePath(path) {
        let root = this;
        for (const part of path) {
            root = root.getVirtualDirectory(part);
            if (!(await root.exists())) {
                await root.create();
            }
        }
        return root;
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
        const paths = await sfs.readdirAsync(this.path());
        const files = await Promise.all(paths.map(async (x) => {
            const path = spath.join(this.path(), x);
            const stat = await sfs.lstatAsync(path).catch((err) => {
                if (err.code === "ENOENT") {  // wow
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

    async clean() {
        const files = await this.files();
        for (const file of files) {
            await file.unlink();
        }
    }

    async unlink({ retries = 10, delay = 100 } = {}) {
        for (let i = 0; i < retries; ++i) {
            await this.clean();
            try {
                await sfs.rmdirAsync(this.path());
            } catch (err) {
                if (err.code !== "ENOENT") {
                    break;
                }
                if (!adone.is.win32) {
                    throw err;
                }
                if (err.code === "ENOTEMPTY" || err.code === "EPERM") {
                    await adone.promise.delay(delay);
                    continue;
                }
                throw err;
            }
            break;
        }
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

    async rename(name) {
        if (name instanceof Directory) {
            name = name.filename();
        }
        const newPath = spath.join(this.dirname(), name);
        await fs.rename(this.path(), newPath);
        this._path = newPath;
    }

    symbolicLink(path) {
        if (path instanceof Directory) {
            path = path.path();
        }
        return sfs.symlinkAsync(this.path(), path).then(() => new fs.SymbolicLinkDirectory(path));
    }
}
