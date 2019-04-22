import BaseFileSystem from "./base";

/**
 * This class should be derived by synchronous-only file systems to provide asynchronous methods as well.
 */
export default class AsyncFileSystem extends BaseFileSystem {
    _access(path, mode, callback) {
        try {
            callback(null, this._accessSync(path, mode));
        } catch (err) {
            callback(err);
        }
    }

    _chmod(path, mode, callback) {
        try {
            callback(null, this._chmodSync(path, mode));
        } catch (err) {
            callback(err);
        }
    }

    _chown(path, uid, gid, callback) {
        try {
            callback(null, this._chownSync(path, uid, gid));
        } catch (err) {
            callback(err);
        }
    }

    _close(fd, callback) {
        try {
            callback(null, this._closeSync(fd));
        } catch (err) {
            callback(err);
        }
    }

    _copyFile(src, dest, flags, callback) {
        try {
            callback(null, this._copyFileSync(src, dest, flags));
        } catch (err) {
            callback(err);
        }
    }

    _fchmod(fd, mode, callback) {
        try {
            callback(null, this._fchmodSync(fd, mode));
        } catch (err) {
            callback(err);
        }
    }

    _fchown(fd, uid, gid, callback) {
        try {
            callback(null, this._fchownSync(fd, uid, gid));
        } catch (err) {
            callback(err);
        }
    }

    _fdatasync(fd, callback) {
        try {
            callback(null, this._fdatasyncSync(fd));
        } catch (err) {
            callback(err);
        }
    }

    _fstat(fd, callback) {
        try {
            callback(null, this._fstatSync(fd));
        } catch (err) {
            callback(err);
        }
    }

    _fsync(fd, callback) {
        try {
            callback(null, this._fsyncSync(fd));
        } catch (err) {
            callback(err);
        }
    }

    _ftruncate(fd, length, callback) {
        try {
            callback(null, this._ftruncateSync(fd, length));
        } catch (err) {
            callback(err);
        }
    }

    _futimes(fd, atime, mtime, callback) {
        try {
            callback(null, this._futimesSync(fd, atime, mtime));
        } catch (err) {
            callback(err);
        }
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
        try {
            callback(null, this._linkSync(existingPath, newPath));
        } catch (err) {
            callback(err);
        }
    }

    _lstat(path, callback) {
        try {
            callback(null, this._lstatSync(path));
        } catch (err) {
            callback(err);
        }
    }

    _mkdir(path, mode, callback) {
        try {
            callback(null, this._mkdirSync(path, mode));
        } catch (err) {
            callback(err);
        }
    }

    _mkdtemp(prefix, options, callback) {
        try {
            callback(null, this._mkdtempSync(prefix, options));
        } catch (err) {
            callback(err);
        }
    }

    _open(path, flags, mode, callback) {
        try {
            callback(null, this._openSync(path, flags, mode));
        } catch (err) {
            callback(err);
        }
    }

    _read(fd, buffer, offset, length, position, callback) {
        try {
            callback(null, this._readSync(fd, buffer, offset, length, position));
        } catch (err) {
            callback(err);
        }
    }

    _readdir(path, options, callback) {
        try {
            callback(null, this._readdirSync(path, options));
        } catch (err) {
            callback(err);
        }
    }

    _readlink(path, options, callback) {
        try {
            callback(null, this._readlinkSync(path, options));
        } catch (err) {
            callback(err);
        }
    }

    _realpath(path, options, callback) {
        try {
            callback(null, this._realpathSync(path, options));
        } catch (err) {
            callback(err);
        }
    }

    _rename(oldPath, newPath, callback) {
        try {
            callback(null, this._renameSync(oldPath, newPath));
        } catch (err) {
            callback(err);
        }
    }

    _rmdir(path, callback) {
        try {
            callback(null, this._rmdirSync(path));
        } catch (err) {
            callback(err);
        }
    }

    _stat(path, options, callback) {
        try {
            callback(null, this._statSync(path));
        } catch (err) {
            callback(err);
        }
    }

    _symlink(path, target, type, callback) {
        try {
            callback(null, this._symlinkSync(path, target, type));
        } catch (err) {
            callback(err);
        }
    }

    _truncate(path, length, callback) {
        try {
            callback(null, this._truncateSync(path, length));
        } catch (err) {
            callback(err);
        }
    }

    _unlink(path, callback) {
        try {
            callback(null, this._unlinkSync(path));
        } catch (err) {
            callback(err);
        }
    }

    _utimes(path, atime, mtime, callback) {
        try {
            callback(null, this._utimesSync(path, atime, mtime));
        } catch (err) {
            callback(err);
        }
    }

    _write(fd, buffer, offset, length, position, callback) {
        try {
            callback(null, this._writeSync(fd, buffer, offset, length, position));
        } catch (err) {
            callback(err);
        }
    }
}
