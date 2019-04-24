import BaseFileSystem from "./base_fs";

const callbackUp = (err) => {
    if (err) {
        throw err;
    }
};

/**
 * This class should be derived by synchronous-only file systems to provide asynchronous methods as well.
 */
export default class AsyncFileSystem extends BaseFileSystem {
    _callAsync(method, args, successCb = callbackUp, failCb = callbackUp) {
        process.nextTick(() => {
            try {
                const result = this[method](...args);
                successCb(null, result);
            } catch (err) {
                failCb(err);
            }
        });
    }
    
    _access(path, mode, callback) {
        this._callAsync("_accessSync", [path, mode], callback, callback);
    }

    _appendFile(file, data, options, callback) {
        this._callAsync("_appendFileSync", [file, data, options], callback, callback);
    }

    _chmod(path, mode, callback) {
        this._callAsync("_chmodSync", [path, mode], callback, callback);
    }

    _chown(path, uid, gid, callback) {
        this._callAsync("_chownSync", [path, uid, gid], callback, callback);
    }

    _chownr(path, uid, gid, callback) {
        this._callAsync("_chownrSync", [path, uid, gid], callback, callback);
    }

    _close(fdIndex, callback) {
        this._callAsync("_closeSync", [fdIndex], callback, callback);
    }

    _copyFile(srcPath, dest, flags, callback) {
        this._callAsync("_copyFileSync", [srcPath, dest, flags], callback, callback);
    }

    _exists(path, callback) {
        this._callAsync("_existsSync", [path], callback, callback);
    }

    _fallocate(fd, offset, len, callback = callbackUp) {
        this._callAsync("_fallocateSync", [fd, offset, len], callback, callback);
    }

    _fchmod(fd, mode, callback) {
        this._callAsync("_fchmodSync", [fd, mode], callback, callback);
    }

    _fchown(fd, uid, gid, callback) {
        this._callAsync("_fchownSync", [fd, uid, gid], callback, callback);
    }

    _fdatasync(fd, callback) {
        this._callAsync("_fdatasyncSync", [fd], callback, callback);
    }

    _fstat(fd, callback) {
        this._callAsync("_fstatSync", [fd], callback, callback);
    }

    _fsync(fd, callback) {
        this._callAsync("_fsyncSync", [fd], callback, callback);
    }

    _ftruncate(fd, length, callback) {
        this._callAsync("_ftruncateSync", [fd, length], callback, callback);
    }

    _futimes(fd, atime, mtime, callback) {
        this._callAsync("_futimesSync", [fd, atime, mtime], callback, callback);
    }

    _lchmod(path, mode, callback) {
        try {
            callback(null, this._lchmodSync(path, mode));
        } catch (err) {
            callack(err);
        }
    }

    _lchown(path, uid, gid, callback) {
        try {
            callback(null, this._lchownSync(path, uid, gid));
        } catch (err) {
            callback(err);
        }
    }

    _link(existingPath, newPath, callback) {
        this._callAsync("_linkSync", [existingPath, newPath], callback, callback);
    }

    _lseek(fd, position, seekFlags, callback) {
        this._callAsync("_lseekSync", [fd, position, seekFlags], callback, callback);
    }
    
    _lstat(path, callback) {
        this._callAsync("_lstatSync", [path], callback, callback);
    }

    _mkdir(path, options, callback) {
        this._callAsync("_mkdirSync", [path, options], callback, callback);
    }

    _mkdtemp(prefix, options, callback) {
        try {
            callback(null, this._mkdtempSync(prefix, options));
        } catch (err) {
            callback(err);
        }
    }

    _mmap(fd, length, flags, offset, callback) {
        this._callAsync("_mmapSync", [fd, length, flags, offset], callback, callback);
    }

    _open(path, flags, mode, callback) {
        this._callAsync("_openSync", [path, flags, mode], callback, callback);
    }   
    
    _read(fd, buffer, offset, length, position, callback) {
        this._callAsync("_readSync", [fd, buffer, offset, length, position], (err, bytesRead) => callback(err, bytesRead, buffer), callback);
    }

    _readdir(path, options, callback) {
        this._callAsync("_readdirSync", [path, options], callback, callback);
    }

    _readFile(path, options, callback) {
        this._callAsync("_readFileSync", [path, options], callback, callback);
    }

    _readlink(path, options, callback) {
        this._callAsync("_readlinkSync", [path, options], callback, callback);
    }

    _realpath(path, options, callback) {
        try {
            callback(null, this._realpathSync(path, options));
        } catch (err) {
            callback(err);
        }
    }

    _rename(oldPath, newPath, callback) {
        this._callAsync("_renameSync", [oldPath, newPath], callback, callback);
    }

    _rmdir(path, callback) {
        this._callAsync("_rmdirSync", [path], callback, callback);
    }

    _stat(path, options, callback) {
        this._callAsync("_statSync", [path, options], callback, callback);
    }


    _symlink(path, target, type, callback) {
        this._callAsync("_symlinkSync", [path, target, type], callback, callback);
    }

    _truncate(path, length, callback) {
        this._callAsync("_truncateSync", [path, length], callback, callback);
    }

    _unlink(path, callback) {
        this._callAsync("_unlinkSync", [path], callback, callback);
    }

    _utimes(path, atime, mtime, callback) {
        this._callAsync("_utimesSync", [path, atime, mtime], callback, callback);
    }

    _write(fd, buffer, offset, length, position, callback) {
        this._callAsync("_writeSync", [fd, buffer, offset, length, position], (err, bytesWritten) => callback(err, bytesWritten, buffer), callback);
    }

    _writeFile(path, data, options, callback) {
        this._callAsync("_writeFileSync", [path, data, options], callback, callback);
    }

}
