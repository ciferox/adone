import adone from "adone";
const { std: { fs: sfs, path: spath, os }, vendor: { lodash: _ }, is, fs } = adone;

export class File {
    constructor(path) {
        this._path = path;
    }

    stat() {
        return sfs.statAsync(this.path());
    }

    statSync() {
        return sfs.statSync(this.path());
    }

    lstat() {
        return sfs.lstatAsync(this.path());
    }

    lstatSync() {
        return sfs.lstatSync(this.path());
    }

    mode() {
        return this.stat().then((stat) => new adone.util.Mode(stat));
    }

    path() {
        return this._path;
    }

    normalizedPath() {
        return is.win32 ? adone.util.normalizePath(this.path()) : this.path();
    }

    dirname() {
        return spath.dirname(this.path());
    }

    filename() {
        return spath.basename(this.path());
    }

    relativePath(path) {
        if (path instanceof Directory) {
            path = path.path();
        }
        return spath.relative(path, this.path());
    }

    exists() {
        return sfs.accessAsync(this.path(), sfs.constants.F_OK).then(() => true, () => false);
    }

    create({ mode = 0o755 } = {}) {
        return this.write("", { mode });
    }

    write(buffer, { encoding = "utf8", mode = 0o755, flag = "w" } = {}) {
        return sfs.writeFileAsync(this.path(), buffer, { encoding, mode, flag });
    }

    append(buffer, { encoding = "utf8", mode = 0o755, flag = "w" } = {}) {
        return sfs.appendFileAsync(this.path(), buffer, { encoding, mode, flag });
    }

    unlink() {
        return sfs.unlinkAsync(this.path()).catch((err) => {
            if (err.code === "ENOENT") {
                return;
            }
            return Promise.reject(err);
        });
    }

    content(encoding = "utf8") {
        return sfs.readFileAsync(this.path(), encoding);
    }

    contentSync(encoding = "utf8") {
        return sfs.readFileSync(this.path(), encoding);
    }

    contentStream(encoding = "utf8") {
        return sfs.createReadStream(this.path(), { encoding });
    }

    chmod(mode) {
        return sfs.chmodAsync(this.path(), mode);
    }

    async rename(name) {
        if (name instanceof File) {
            name = name.filename();
        }
        const newPath = spath.join(this.dirname(), name);
        await fs.rename(this.path(), newPath);
        this._path = newPath;
    }

    symbolicLink(path) {
        if (path instanceof File) {
            path = path.path();
        }
        return sfs.symlinkAsync(this.path(), path).then(() => new SymbolicLinkFile(path));
    }
}

class SymbolicLinkFile extends File {
    realpath() {
        return sfs.realpathAsync(this.path());
    }

    async content(encoding = "utf8") {
        return sfs.readFileAsync(await this.realpath(), encoding);
    }

    async contentSync(encoding = "utf8") {
        return sfs.readFileSync(await this.realpath(), encoding);
    }

    async contentStream(encoding = "utf8") {
        return sfs.createReadStream(await this.realpath(), { encoding });
    }
}

export class Directory {
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
        return stat.isDirectory() ? new Directory(path) : new File(path);
    }

    getVirtualSymbolicLinkFile(...path) {
        path = spath.resolve(this.path(), ...path);
        return new SymbolicLinkFile(path);
    }

    getVirtualSymbolicLinkDirectory(...path) {
        path = spath.resolve(this.path(), ...path);
        return new SymbolicLinkDirectory(path);
    }

    getVirtualFile(...path) {
        path = spath.resolve(this.path(), ...path);
        return new File(path);
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
        const file = new File(spath.join(root.path(), filename));
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
                return stat.isDirectory() ? new SymbolicLinkDirectory(path) : new SymbolicLinkFile(path);
            }
            return stat.isDirectory() ? new Directory(path) : new File(path);
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
            if (file instanceof File) {
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
        return sfs.symlinkAsync(this.path(), path).then(() => new SymbolicLinkDirectory(path));
    }
}

class SymbolicLinkDirectory extends Directory {
    unlink() {
        return File.prototype.unlink.call(this);
    }
}

export async function createTempDirectory(prefix = spath.join(os.tmpdir(), spath.sep)) {
    const path = await sfs.mkdtempAsync(prefix);
    return new Directory(path);
}

export async function createTempFile(prefix = spath.join(os.tmpdir(), spath.sep)) {
    for (; ;) {
        const file = new File(`${prefix}${adone.util.uuid.v4()}`);
        if (!(await file.exists())) {
            await file.create();
            return file;
        }
    }
}

export async function createStructure(root, structure) {
    for (const item of structure) {
        if (is.array(item)) {
            if (!item.length) {
                continue;
            }
            if (item.length === 2 && !is.array(item[1])) {
                await root.addFile(item[0], { content: item[1] });
                continue;
            }
            const dir = await root.addDirectory(item[0]);
            if (item.length === 2) {
                await createStructure(dir, item[1]);
            }
        } else {
            await root.addFile(item);
        }
    }
}
