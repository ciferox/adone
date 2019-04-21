import AbstractFileSystem from "./abstract";
import path from "../../path";
import {
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
    // "exists" // deprecated
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
    readdir,
    readdirSync,
    readFile,
    readFileSync,
    readlink,
    readlinkSync,
    readSync,
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
    unwatchFile,
    utimes,
    utimesSync,
    watch,
    watchFile,
    write,
    writeFile,
    writeFileSync,
    writeSync
} from "fs";

const DEFAULT_ROOT = path.resolve("/");

export default class StandardFileSystem extends AbstractFileSystem {
    constructor({ root = DEFAULT_ROOT } = {}) {
        super({ root, sep: path.sep });
    }

    _access(path, mode, callback) {
        access(path.fullPath, mode, callback);
    }

    _accessSync(path, mode) {
        return accessSync(path.fullPath, mode);
    }

    _chmod(path, mode, callback) {
        chmod(path.fullPath, mode, callback);
    }

    _chmodSync(path, mode) {
        return chmodSync(path.fullPath, mode);
    }

    _chown(path, uid, gid, callback) {
        chown(path.fullPath, uid, gid, callback);
    }

    _chownSync(path, uid, gid) {
        return chownSync(path.fullPath, uid, gid);
    }

    _close(fd, callback) {
        close(fd, callback);
    }

    _closeSync(fd) {
        return closeSync(fd);
    }

    _copyFile(src, dest, flags, callback) {
        copyFile(src.fullPath, dest.fullPath, flags, callback);
    }

    _copyFileSync(src, dest, flags) {
        return copyFileSync(src.fullPath, dest.fullPath, flags);
    }

    _existsSync(path) {
        return existsSync(path.fullPath);
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
        lchmod(path.fullPath, mode, callback);
    }

    _lchmodSync(path, mode) {
        return lchmodSync(path.fullPath, mode);
    }

    _lchown(path, uid, gid, callback) {
        lchown(path.fullPath, uid, gid, callback);
    }

    _lchownSync(path, uid, gid) {
        return lchownSync(path.fullPath, uid, gid);
    }

    _link(existingPath, newPath, callback) {
        link(existingPath.fullPath, newPath.fullPath, callback);
    }

    _linkSync(existingPath, newPath) {
        return linkSync(existingPath.fullPath, newPath.fullPath);
    }

    _lstat(path, callback) {
        lstat(path.fullPath, callback);
    }

    _lstatSync(path) {
        return lstatSync(path.fullPath);
    }

    _mkdir(path, mode, callback) {
        mkdir(path.fullPath, mode, callback);
    }

    _mkdirSync(path, mode) {
        return mkdirSync(path.fullPath, mode);
    }

    _mkdtemp(prefix, options, callback) {
        mkdtemp(prefix, options, callback);
    }

    _mkdtempSync(prefix, options) {
        return mkdtempSync(prefix, options);
    }

    _open(path, flags, mode, callback) {
        open(path.fullPath, flags, mode, callback);
    }

    _openSync(path, flags, mode) {
        return openSync(path.fullPath, flags, mode);
    }

    _read(fd, buffer, offset, length, position, callback) {
        read(fd, buffer, offset, length, position, callback);
    }

    _readdir(path, options, callback) {
        readdir(path.fullPath, options, callback);
    }

    _readdirSync(path, options) {
        return readdirSync(path.fullPath, options);
    }

    _readlink(path, options, callback) {
        readlink(path.fullPath, options, callback);
    }

    _readlinkSync(path, options) {
        return readlinkSync(path.fullPath, options);
    }

    _readSync(fd, buffer, offset, length, position) {
        return readSync(fd, buffer, offset, length, position);
    }

    _realpath(path, options, callback) {
        realpath(path.fullPath, options, callback);
    }

    _realpathSync(path, options) {
        return realpathSync(path.fullPath, options);
    }

    _rename(oldPath, newPath, callback) {
        rename(oldPath.fullPath, newPath.fullPath, callback);
    }

    _renameSync(oldPath, newPath) {
        return renameSync(oldPath.fullPath, newPath.fullPath);
    }

    _rmdir(path, callback) {
        rmdir(path.fullPath, callback);
    }

    _rmdirSync(path) {
        return rmdirSync(path.fullPath);
    }

    _stat(path, callback) {
        stat(path.fullPath, callback);
    }

    _statSync(path) {
        return statSync(path.fullPath);
    }

    _symlink(path, target, type, callback) {
        symlink(target.fullPath, path.fullPath, type, callback);
    }

    _symlinkSync(path, target, type) {
        return symlinkSync(target.fullPath, path.fullPath, type);
    }

    _truncate(path, length, callback) {
        truncate(path.fullPath, length, callback);
    }

    _truncateSync(path, length) {
        return truncateSync(path.fullPath, length);
    }

    _unlink(path, callback) {
        unlink(path.fullPath, callback);
    }

    _unlinkSync(path) {
        return unlinkSync(path.fullPath);
    }

    _utimes(path, atime, mtime, callback) {
        utimes(path.fullPath, atime, mtime, callback);
    }

    _utimesSync(path, atime, mtime) {
        return utimesSync(path.fullPath, atime, mtime);
    }

    _watch(filename, options, listener, watcher) {
        const internalWatcher = watch(filename.fullPath, options);
        watcher.setWatcher(internalWatcher);
    }

    _watchFile(filename, options, listener, watcher) {
        watchFile(filename.fullPath, options, (prev, curr) => {
            watcher.emit("change", prev, curr);
        });
    }

    _write(fd, buffer, offset, length, position, callback) {
        write(fd, buffer, offset, length, position, callback);
    }

    _writeSync(fd, buffer, offset, length, position) {
        return writeSync(fd, buffer, offset, length, position);
    }
}
