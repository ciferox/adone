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
            lstat,
            readdir,
            readlink,
            open,
            close,
            read,
            write,
            truncate,
            ftruncate,
            unlink,
            utimes,
            rmdir,
            mkdir,
            access,
            chmod,
            chown,
            rename,
            symlink,
            link,
            fstat,
            fsync,
            fdatasync,
            copyFile,
            realpath,
            watchFile,
            watch,
            lchmod,
            lchown,
            fchown,
            mkdtemp
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

    @promisify
    _lstat(path, callback) {
        lstat(path.relativePath, callback);
    }

    @promisify
    _readdir(path, options, callback) {
        readdir(path.relativePath, options, callback);
    }

    @promisify
    _readlink(path, options, callback) {
        readlink(path.relativePath, options, callback);
    }

    @promisify
    _open(path, flags, mode, callback) {
        open(path.relativePath, flags, mode, callback);
    }

    @promisify
    _close(fd, callback) {
        close(fd, callback);
    }

    @promisify
    _read(fd, buffer, offset, length, position, callback) {
        read(fd, buffer, offset, length, position, callback);
    }

    @promisify
    _write(fd, buffer, offset, length, position, callback) {
        write(fd, buffer, offset, length, position, callback);
    }

    @promisify
    _truncate(path, length, callback) {
        truncate(path.relativePath, length, callback);
    }

    @promisify
    _ftruncate(fd, length, callback) {
        ftruncate(fd, length, callback);
    }

    @promisify
    _unlink(path, callback) {
        unlink(path.relativePath, callback);
    }

    @promisify
    _utimes(path, atime, mtime, callback) {
        utimes(path.relativePath, atime, mtime, callback);
    }

    @promisify
    _rmdir(path, callback) {
        rmdir(path.relativePath, callback);
    }

    @promisify
    _mkdir(path, mode, callback) {
        mkdir(path.relativePath, mode, callback);
    }

    @promisify
    _access(path, mode, callback) {
        access(path.relativePath, mode, callback);
    }

    @promisify
    _chmod(path, mode, callback) {
        chmod(path.relativePath, mode, callback);
    }

    @promisify
    _lchmod(path, mode, callback) {
        lchmod(path.relativePath, mode, callback);
    }

    @promisify
    _chown(path, uid, gid, callback) {
        chown(path.relativePath, uid, gid, callback);
    }

    @promisify
    _lchown(path, uid, gid, callback) {
        lchown(path.relativePath, uid, gid, callback);
    }

    @promisify
    _fchown(fd, uid, gid, callback) {
        fchown(fd, uid, gid, callback);
    }

    @promisify
    _rename(oldPath, newPath, callback) {
        rename(oldPath.relativePath, newPath.relativePath, callback);
    }

    @promisify
    _symlink(path, target, type, callback) {
        symlink(target.fullPath, path.relativePath, type, callback);
    }

    @promisify
    _link(existingPath, newPath, callback) {
        // no cross engine links
        link(existingPath.fullPath, newPath.fullPath, callback);
    }

    @promisify
    _fstat(fd, callback) {
        fstat(fd, callback);
    }

    @promisify
    _fsync(fd, callback) {
        fsync(fd, callback);
    }

    @promisify
    _fdatasync(fd, callback) {
        fdatasync(fd, callback);
    }

    @promisify
    _copyFile(src, dest, flags, callback) {
        copyFile(src.relativePath, dest.relativePath, flags, callback);
    }

    @promisify
    _realpath(path, options, callback) {
        realpath(path.relativePath, options, callback);
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
}
