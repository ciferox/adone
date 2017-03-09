import adone from "adone";
const { std: { fs: sfs, path: spath }, is, fs } = adone;

export default class File {
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
        if (path instanceof adone.fs.Directory) {
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
        return sfs.symlinkAsync(this.path(), path).then(() => new adone.fs.SymbolicLinkFile(path));
    }
}
