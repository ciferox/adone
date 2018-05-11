const {
    std: { fs: stdFs, path: stdPath },
    is,
    fs
} = adone;

export default class File {
    constructor(...path) {
        this._path = stdPath.resolve(...path);
        this._encoding = "utf8";
    }

    _handleEncoding(encoding) {
        if (encoding === "buffer") {
            return null;
        }
        return encoding;
    }

    _getEncoding() {
        if (is.null(this._encoding)) {
            return "buffer";
        }
        return this._encoding;
    }

    encoding(name = adone.null) {
        if (name === adone.null) {
            return this._getEncoding();
        }
        this._encoding = this._handleEncoding(name);
        return this;
    }

    stat() {
        return fs.stat(this._path);
    }

    statSync() {
        return stdFs.statSync(this._path);
    }

    lstat() {
        return fs.lstat(this._path);
    }

    lstatSync() {
        return stdFs.lstatSync(this._path);
    }

    async utimes(atime, mtime) {
        await fs.utimes(this._path, atime, mtime);
    }

    utimesSync(atime, mtime) {
        fs.utimesSync(this._path, atime, mtime);
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
        return stdPath.dirname(this._path);
    }

    filename() {
        return stdPath.basename(this._path);
    }

    extname() {
        return stdPath.extname(this._path);
    }

    stem() {
        return stdPath.basename(this._path, this.extname());
    }

    relativePath(path) {
        if (path instanceof adone.fs.Directory) {
            path = path.path();
        }
        return stdPath.relative(path, this._path);
    }

    exists() {
        return fs.exists(this._path);
    }

    existsSync() {
        return fs.existsSync(this._path);
    }

    async create({ mode = 0o755, contents, atime = null, mtime = null } = {}) {
        await this.write(contents, { mode });
        if (!is.null(atime) || !is.null(mtime)) {
            // TODO: -1 will be converted to now, ok?
            await this.utimes(is.null(atime) ? -1 : atime, is.null(mtime) ? -1 : mtime);
        }
    }

    write(buffer, { encoding = this._encoding, mode = 0o755, flag = "w" } = {}) {
        encoding = this._handleEncoding(encoding);
        return fs.writeFile(this._path, buffer, { encoding, mode, flag });
    }

    append(buffer, { encoding = this._encoding, mode = 0o755, flag = "w" } = {}) {
        encoding = this._handleEncoding(encoding);
        return fs.appendFile(this._path, buffer, { encoding, mode, flag });
    }

    unlink() {
        return fs.unlink(this._path).catch((err) => {
            if (err.code === "ENOENT") {
                return;
            }
            throw err;
        });
    }

    unlinkSync() {
        try {
            fs.unlinkSync(this._path);
        } catch (err) {
            if (err.code === "ENOENT") {
                return;
            }
            throw err;
        }
    }

    contents(encoding = this._encoding) {
        encoding = this._handleEncoding(encoding);
        return fs.readFile(this._path, { encoding });
    }

    contentsSync(encoding = this._encoding) {
        encoding = this._handleEncoding(encoding);
        return stdFs.readFileSync(this._path, encoding);
    }

    contentsStream(encoding = this._encoding) {
        encoding = this._handleEncoding(encoding);
        return stdFs.createReadStream(this._path, { encoding });
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
        const newPath = stdPath.join(this.dirname(), name);
        await fs.rename(this._path, newPath);
        this._path = newPath;
    }

    readlink(options) {
        return fs.readlink(this._path, options);
    }

    readlinkSync(options) {
        return fs.readlinkSync(this._path, options);
    }

    // TODO: not usable? review
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

    toString() {
        return this._path;
    }
}
