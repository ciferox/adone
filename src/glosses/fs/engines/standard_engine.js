const {
    fs: {
        engine: {
            AbstractEngine
        }
    },
    std: {
        // here we must have the original methods to work properly when std.fs is mocked
        fs: {
            stat,
            statSync,
            lstat,
            lstatSync,
            readdir,
            readdirSync,
            readlink,
            readlinkSync,
            open,
            openSync,
            close,
            closeSync,
            read,
            readSync,
            write,
            writeSync,
            truncate,
            truncateSync,
            ftruncate,
            ftruncateSync,
            unlink,
            unlinkSync,
            utimes,
            utimesSync,
            rmdir,
            rmdirSync,
            mkdir,
            mkdirSync,
            access,
            accessSync,
            chmod,
            chmodSync,
            chown,
            chownSync,
            rename,
            renameSync,
            symlink,
            symlinkSync,
            link,
            linkSync,
            fstat,
            fstatSync,
            fsync,
            fsyncSync,
            fdatasync,
            fdatasyncSync,
            copyFile,
            copyFileSync,
            realpath,
            realpathSync,
            watchFile,
            watch,
            lchmod, // ?
            lchown, // ?
            fchown,
            fchownSync,
            fchmod,
            fchmodSync,
            mkdtemp,
            mkdtempSync
        }
    },
    promise
} = adone;

const promisify = (target, key, descriptor) => {
    descriptor.value = promise.promisify(descriptor.value);
};

export default class StandardEngine extends AbstractEngine {
    @promisify
    _stat(path, callback) {
        stat(path.relativePath, callback);
    }

    _statSync(path) {
        return statSync(path.relativePath);
    }

    @promisify
    _lstat(path, callback) {
        lstat(path.relativePath, callback);
    }

    _lstatSync(path) {
        return lstatSync(path.relativePath);
    }

    @promisify
    _readdir(path, options, callback) {
        readdir(path.relativePath, options, callback);
    }

    _readdirSync(path, options) {
        return readdirSync(path.relativePath, options);
    }

    @promisify
    _readlink(path, options, callback) {
        readlink(path.relativePath, options, callback);
    }

    _readlinkSync(path, options) {
        return readlinkSync(path.relativePath, options);
    }

    @promisify
    _open(path, flags, mode, callback) {
        open(path.relativePath, flags, mode, callback);
    }

    _openSync(path, flags, mode) {
        return openSync(path.relativePath, flags, mode);
    }

    @promisify
    _close(fd, callback) {
        close(fd, callback);
    }

    _closeSync(fd) {
        return closeSync(fd);
    }

    @promisify
    _read(fd, buffer, offset, length, position, callback) {
        read(fd, buffer, offset, length, position, callback);
    }

    _readSync(fd, buffer, offset, length, position) {
        return readSync(fd, buffer, offset, length, position);
    }

    @promisify
    _write(fd, buffer, offset, length, position, callback) {
        write(fd, buffer, offset, length, position, callback);
    }

    _writeSync(fd, buffer, offset, length, position) {
        return writeSync(fd, buffer, offset, length, position);
    }

    @promisify
    _truncate(path, length, callback) {
        truncate(path.relativePath, length, callback);
    }

    _truncateSync(path, length) {
        return truncateSync(path.relativePath, length);
    }

    @promisify
    _ftruncate(fd, length, callback) {
        ftruncate(fd, length, callback);
    }

    _ftruncateSync(fd, length) {
        return ftruncateSync(fd, length);
    }

    @promisify
    _unlink(path, callback) {
        unlink(path.relativePath, callback);
    }

    _unlinkSync(path) {
        return unlinkSync(path.relativePath);
    }

    @promisify
    _utimes(path, atime, mtime, callback) {
        utimes(path.relativePath, atime, mtime, callback);
    }

    _utimesSync(path, atime, mtime) {
        return utimesSync(path.relativePath, atime, mtime);
    }

    @promisify
    _rmdir(path, callback) {
        rmdir(path.relativePath, callback);
    }

    _rmdirSync(path) {
        return rmdirSync(path.relativePath);
    }

    @promisify
    _mkdir(path, mode, callback) {
        mkdir(path.relativePath, mode, callback);
    }

    _mkdirSync(path, mode) {
        return mkdirSync(path.relativePath, mode);
    }

    @promisify
    _access(path, mode, callback) {
        access(path.relativePath, mode, callback);
    }

    _accessSync(path, mode) {
        return accessSync(path.relativePath, mode);
    }

    @promisify
    _chmod(path, mode, callback) {
        chmod(path.relativePath, mode, callback);
    }

    _chmodSync(path, mode) {
        return chmodSync(path.relativePath, mode);
    }

    @promisify
    _chown(path, uid, gid, callback) {
        chown(path.relativePath, uid, gid, callback);
    }

    _chownSync(path, uid, gid) {
        return chownSync(path, uid, gid);
    }

    @promisify
    _fchown(fd, uid, gid, callback) {
        fchown(fd, uid, gid, callback);
    }

    _fchownSync(fd, uid, gid) {
        return fchownSync(fd, uid, gid);
    }

    @promisify
    _fchmod(fd, mode, callback) {
        fchmod(fd, mode, callback);
    }

    _fchmodSync(fd, mode) {
        return fchmodSync(fd, mode);
    }

    @promisify
    _rename(oldPath, newPath, callback) {
        rename(oldPath.relativePath, newPath.relativePath, callback);
    }

    _renameSync(oldPath, newPath) {
        return renameSync(oldPath.relativePath, newPath.relativePath);
    }

    @promisify
    _symlink(path, target, type, callback) {
        symlink(target.fullPath, path.relativePath, type, callback);
    }

    _symlinkSync(path, target, type) {
        return symlinkSync(target.fullPath, path.relativePath, type);
    }

    @promisify
    _link(existingPath, newPath, callback) {
        link(existingPath.relativePath, newPath.relativePath, callback);
    }

    _linkSync(existingPath, newPath) {
        return linkSync(existingPath.fullPath, newPath.fullPath);
    }

    @promisify
    _fstat(fd, callback) {
        fstat(fd, callback);
    }

    _fstatSync(fd) {
        return fstatSync(fd);
    }

    @promisify
    _fsync(fd, callback) {
        fsync(fd, callback);
    }

    _fsyncSync(fd) {
        return fsyncSync(fd);
    }

    @promisify
    _fdatasync(fd, callback) {
        fdatasync(fd, callback);
    }

    _fdatasyncSync(fd) {
        return fdatasyncSync(fd);
    }

    @promisify
    _copyFile(src, dest, flags, callback) {
        copyFile(src.relativePath, dest.relativePath, flags, callback);
    }

    _copyFileSync(src, dest, flags) {
        return copyFileSync(src.relativePath, dest.relativePath, flags);
    }

    @promisify
    _realpath(path, options, callback) {
        realpath(path.relativePath, options, callback);
    }

    _realpathSync(path, options) {
        return realpathSync(path.relativePath, options);
    }

    _watchFile(filename, options, listener, watcher) {
        watchFile(filename.relativePath, options, (prev, curr) => {
            watcher.emit("change", prev, curr);
        });
    }

    _watch(filename, options, listener, watcher) {
        const internalWatcher = watch(filename.relativePath, options);
        watcher.setWatcher(internalWatcher);
    }

    @promisify
    _mkdtemp(prefix, options, callback) {
        mkdtemp(prefix, options, callback);
    }

    _mkdtempSync(prefix, options) {
        return mkdtempSync(prefix, options);
    }
}
