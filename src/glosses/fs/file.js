const { std: { fs: sfs, path: spath }, is, fs } = adone;

export default class File {
    constructor(...path) {
        this._path = spath.resolve(...path);
        this._encoding = "utf8";
    }

    encoding(name = adone.null) {
        if (name === adone.null) {
            if (is.null(this._encoding)) {
                return "buffer";
            }
            return this._encoding;
        }
        if (name === "buffer") {
            name = null;
        }
        this._encoding = name;
        return this;
    }

    stat() {
        return fs.stat(this._path);
    }

    statSync() {
        return sfs.statSync(this._path);
    }

    lstat() {
        return fs.lstat(this._path);
    }

    lstatSync() {
        return sfs.lstatSync(this._path);
    }

    mode() {
        return this.stat().then((stat) => new adone.fs.Mode(stat));
    }

    path() {
        return this._path;
    }

    normalizedPath() {
        return is.windows ? adone.util.normalizePath(this._path) : this._path;
    }

    dirname() {
        return spath.dirname(this._path);
    }

    filename() {
        return spath.basename(this._path);
    }

    extname() {
        return spath.extname(this._path);
    }

    stem() {
        return spath.basename(this._path, this.extname());
    }

    relativePath(path) {
        if (path instanceof adone.fs.Directory) {
            path = path.path();
        }
        return spath.relative(path, this._path);
    }

    exists() {
        return fs.access(this._path, sfs.constants.F_OK).then(() => true, () => false);
    }

    create({ mode = 0o755 } = {}) {
        return this.write("", { mode });
    }

    write(buffer, { encoding = this._encoding, mode = 0o755, flag = "w" } = {}) {
        return fs.writeFile(this._path, buffer, { encoding, mode, flag });
    }

    append(buffer, { encoding = this._encoding, mode = 0o755, flag = "w" } = {}) {
        return fs.appendFile(this._path, buffer, { encoding, mode, flag });
    }

    unlink() {
        return fs.unlink(this._path).catch((err) => {
            if (err.code === "ENOENT") {
                return;
            }
            return Promise.reject(err);
        });
    }

    contents(encoding = this._encoding) {
        return fs.readFile(this._path, { encoding });
    }

    contentsSync(encoding = this._encoding) {
        return sfs.readFileSync(this._path, encoding);
    }

    contentsStream(encoding = this._encoding) {
        return sfs.createReadStream(this._path, { encoding });
    }

    chmod(mode) {
        if (mode instanceof adone.fs.Mode) {
            mode = mode.valueOf();
        }
        return fs.chmod(this._path, mode);
    }

    async rename(name) {
        if (name instanceof File) {
            name = name.filename();
        }
        const newPath = spath.join(this.dirname(), name);
        await fs.rename(this._path, newPath);
        this._path = newPath;
    }

    symbolicLink(path) {
        if (path instanceof File) {
            path = path.path();
        }
        return fs.symlink(this._path, path).then(() => new adone.fs.SymbolicLinkFile(path));
    }

    async size() {
        const stat = await this.stat();
        return stat.size;
    }
}
