const { std: { fs: sfs, path: spath }, is, fs } = adone;

export default class File {
    constructor(...path) {
        this._path = spath.resolve(...path);
    }

    stat() {
        return sfs.statAsync(this._path);
    }

    statSync() {
        return sfs.statSync(this._path);
    }

    lstat() {
        return sfs.lstatAsync(this._path);
    }

    lstatSync() {
        return sfs.lstatSync(this._path);
    }

    mode() {
        return this.stat().then((stat) => new adone.util.Mode(stat));
    }

    path() {
        return this._path;
    }

    normalizedPath() {
        return is.win32 ? adone.util.normalizePath(this._path) : this._path;
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

    relativePath(path) {
        if (path instanceof adone.fs.Directory) {
            path = path.path();
        }
        return spath.relative(path, this._path);
    }

    exists() {
        return sfs.accessAsync(this._path, sfs.constants.F_OK).then(() => true, () => false);
    }

    create({ mode = 0o755 } = {}) {
        return this.write("", { mode });
    }

    write(buffer, { encoding = "utf8", mode = 0o755, flag = "w" } = {}) {
        return sfs.writeFileAsync(this._path, buffer, { encoding, mode, flag });
    }

    append(buffer, { encoding = "utf8", mode = 0o755, flag = "w" } = {}) {
        return sfs.appendFileAsync(this._path, buffer, { encoding, mode, flag });
    }

    unlink() {
        return sfs.unlinkAsync(this._path).catch((err) => {
            if (err.code === "ENOENT") {
                return;
            }
            return Promise.reject(err);
        });
    }

    content(encoding = "utf8") {
        return sfs.readFileAsync(this._path, encoding);
    }

    contentSync(encoding = "utf8") {
        return sfs.readFileSync(this._path, encoding);
    }

    contentStream(encoding = "utf8") {
        return sfs.createReadStream(this._path, { encoding });
    }

    chmod(mode) {
        return sfs.chmodAsync(this._path, mode);
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
        return sfs.symlinkAsync(this._path, path).then(() => new adone.fs.SymbolicLinkFile(path));
    }
}
