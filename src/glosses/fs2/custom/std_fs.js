import BaseFileSystem from "./base_fs";
const path = require("../../path");
const {
    access,
    accessSync,
    appendFile,
    appendFileSync,
    chmod,
    chmodSync,
    chown,
    chownSync,
    close,
    closeSync,
    copyFile,
    copyFileSync,
    createReadStream,
    createWriteStream,
    exists, // deprecated
    existsSync,
    fchmod,
    fchmodSync,
    fchown,
    fchownSync,
    fdatasync,
    fdatasyncSync,
    fstat,
    fstatSync,
    fsync,
    fsyncSync,
    ftruncate,
    ftruncateSync,
    futimes,
    futimesSync,
    lchmod,
    lchmodSync,
    lchown,
    lchownSync,
    link,
    linkSync,
    lstat,
    lstatSync,
    mkdir,
    mkdirSync,
    mkdtemp,
    mkdtempSync,
    open,
    openSync,
    read,
    readSync,
    readdir,
    readdirSync,
    readFile,
    readFileSync,
    readlink,
    readlinkSync,
    realpath,
    realpathSync,
    rename,
    renameSync,
    rmdir,
    rmdirSync,
    stat,
    statSync,
    symlink,
    symlinkSync,
    truncate,
    truncateSync,
    unlink,
    unlinkSync,
    utimes,
    utimesSync,
    write,
    writeSync,
    writeFile,
    writeFileSync,

    watch,
    watchFile,
    unwatchFile,

    constants,
    ReadStream,
    WriteStream
} = require("../base");

const DEFAULT_ROOT = path.resolve("/");

export default class StdFileSystem extends BaseFileSystem {
    constructor({ root = DEFAULT_ROOT } = {}) {
        super({ root });

        this.constants = constants;
        this.ReadStream = ReadStream;
        this.WriteStream = WriteStream;
    }

    cwd() {
        return process.cwd();
    }

    // fs common methods

    _access(path, mode, callback) {
        access(path, mode, callback);
    }

    _accessSync(path, mode) {
        return accessSync(path, mode);
    }

    _appendFile(path, data, options, callback) {
        appendFile(path, data, options, callback);
    }

    _appendFileSync(path, data, options) {
        return appendFileSync(path, data, options);
    }

    _chmod(path, mode, callback) {
        chmod(path, mode, callback);
    }

    _chmodSync(path, mode) {
        return chmodSync(path, mode);
    }

    _chown(path, uid, gid, callback) {
        chown(path, uid, gid, callback);
    }

    _chownSync(path, uid, gid) {
        return chownSync(path, uid, gid);
    }

    _close(fd, callback) {
        close(fd, callback);
    }

    _closeSync(fd) {
        return closeSync(fd);
    }

    _copyFile(src, dest, flags, callback) {
        copyFile(src, dest, flags, callback);
    }

    _copyFileSync(src, dest, flags) {
        return copyFileSync(src, dest, flags);
    }

    _createReadStream(path, options) {
        return createReadStream(path, options);
    }

    _createWriteStream(path, options) {
        return createWriteStream(path, options);
    }

    _exists(path, callback) {
        return exists(path, callback);
    }

    _existsSync(path) {
        return existsSync(path);
    }

    _fchmod(fd, mode, callback) {
        fchmod(fd, mode, callback);
    }

    _fchmodSync(fd, mode) {
        return fchmodSync(fd, mode);
    }

    _fchown(fd, uid, gid, callback) {
        fchown(fd, uid, gid, callback);
    }

    _fchownSync(fd, uid, gid) {
        return fchownSync(fd, uid, gid);
    }

    _fdatasync(fd, callback) {
        fdatasync(fd, callback);
    }

    _fdatasyncSync(fd) {
        return fdatasyncSync(fd);
    }

    _fstat(fd, callback) {
        fstat(fd, callback);
    }

    _fstatSync(fd) {
        return fstatSync(fd);
    }

    _fsync(fd, callback) {
        fsync(fd, callback);
    }

    _fsyncSync(fd) {
        return fsyncSync(fd);
    }

    _ftruncate(fd, length, callback) {
        ftruncate(fd, length, callback);
    }

    _ftruncateSync(fd, length) {
        return ftruncateSync(fd, length);
    }

    _futimes(fd, atime, mtime, callback) {
        futimes(fd, atime, mtime, callback);
    }

    _futimesSync(fd, atime, mtime) {
        return futimesSync(fd, atime, mtime);
    }

    _lchmod(path, mode, callback) {
        lchmod(path, mode, callback);
    }

    _lchmodSync(path, mode) {
        return lchmodSync(path, mode);
    }

    _lchown(path, uid, gid, callback) {
        lchown(path, uid, gid, callback);
    }

    _lchownSync(path, uid, gid) {
        return lchownSync(path, uid, gid);
    }

    _link(existingPath, newPath, callback) {
        link(existingPath, newPath, callback);
    }

    _linkSync(existingPath, newPath) {
        return linkSync(existingPath, newPath);
    }

    _lstat(path, callback) {
        lstat(path, callback);
    }

    _lstatSync(path) {
        return lstatSync(path);
    }

    _mkdir(path, mode, callback) {
        mkdir(path, mode, callback);
    }

    _mkdirSync(path, mode) {
        return mkdirSync(path, mode);
    }

    _mkdtemp(prefix, options, callback) {
        mkdtemp(prefix, options, callback);
    }

    _mkdtempSync(prefix, options) {
        return mkdtempSync(prefix, options);
    }

    _open(path, flags, mode, callback) {
        open(path, flags, mode, callback);
    }

    _openSync(path, flags, mode) {
        return openSync(path, flags, mode);
    }

    _read(fd, buffer, offset, length, position, callback) {
        read(fd, buffer, offset, length, position, callback);
    }

    _readSync(fd, buffer, offset, length, position) {
        return readSync(fd, buffer, offset, length, position);
    }

    _readdir(path, options, callback) {
        readdir(path, options, callback);
    }

    _readdirSync(path, options) {
        return readdirSync(path, options);
    }

    _readFile(path, options, callback) {
        readFile(path, options, callback);
    }

    _readFileSync(path, options) {
        return readFileSync(path, options);
    }

    _readlink(path, options, callback) {
        readlink(path, options, callback);
    }

    _readlinkSync(path, options) {
        return readlinkSync(path, options);
    }

    _realpath(path, options, callback) {
        realpath(path, options, callback);
    }

    _realpathSync(path, options) {
        return realpathSync(path, options);
    }

    _rename(oldPath, newPath, callback) {
        rename(oldPath, newPath, callback);
    }

    _renameSync(oldPath, newPath) {
        return renameSync(oldPath, newPath);
    }

    _rmdir(path, callback) {
        rmdir(path, callback);
    }

    _rmdirSync(path) {
        return rmdirSync(path);
    }

    _stat(path, callback) {
        stat(path, callback);
    }

    _statSync(path) {
        return statSync(path);
    }

    _symlink(path, target, type, callback) {
        symlink(target, path, type, callback);
    }

    _symlinkSync(path, target, type) {
        return symlinkSync(target, path, type);
    }

    _truncate(path, length, callback) {
        truncate(path, length, callback);
    }

    _truncateSync(path, length) {
        return truncateSync(path, length);
    }

    _unlink(path, callback) {
        unlink(path, callback);
    }

    _unlinkSync(path) {
        return unlinkSync(path);
    }

    _utimes(path, atime, mtime, callback) {
        utimes(path, atime, mtime, callback);
    }

    _utimesSync(path, atime, mtime) {
        return utimesSync(path, atime, mtime);
    }

    _watch(filename, options, listener) {
        return watch(filename, options, listener);
    }

    _watchFile(filename, options, listener) {
        return watchFile(filename, options, listener);
    }

    _unwatchFile(filename, listener) {
        return unwatchFile(filename, listener);
    }

    _write(fd, buffer, offset, length, position, callback) {
        write(fd, buffer, offset, length, position, callback);
    }

    _writeSync(fd, buffer, offset, length, position) {
        return writeSync(fd, buffer, offset, length, position);
    }

    _writeFile(path, data, options, callback) {
        writeFile(path, data, options, callback);
    }

    _writeFileSync(path, data, options) {
        return writeFileSync(path, data, options);
    }
}
StdFileSystem.prototype.path = path;
