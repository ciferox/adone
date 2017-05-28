// This wrapper class is used to retain backwards compatibility with
// pre-v0.4 ssh2. If it weren"t for `read()` and `write()` being used by the
// streams2/3 API, we could just pass the SFTPStream directly to the end user...

export default class SFTPWrapper extends adone.std.events.EventEmitter {
    constructor(stream) {
        super();

        this._stream = stream;

        stream.on("error", (err) => {
            this.emit("error", err);
        }).on("end", () => {
            this.emit("end");
        }).on("close", () => {
            this.emit("close");
        }).on("continue", () => {
            this.emit("continue");
        });
    }

    // stream-related methods to pass on
    end() {
        return this._stream.end();
    }
    
    // SFTPStream client methods
    createReadStream(path, options) {
        return this._stream.createReadStream(path, options);
    }
    
    createWriteStream(path, options) {
        return this._stream.createWriteStream(path, options);
    }
    
    open(path, flags, attrs, cb) {
        return this._stream.open(path, flags, attrs, cb);
    }
    
    close(handle, cb) {
        return this._stream.close(handle, cb);
    }
    
    read(handle, buf, off, len, position, cb) {
        return this._stream.readData(handle, buf, off, len, position, cb);
    }
    
    write(handle, buf, off, len, position, cb) {
        return this._stream.writeData(handle, buf, off, len, position, cb);
    }
    
    fastGet(remotePath, localPath, opts, cb) {
        return this._stream.fastGet(remotePath, localPath, opts, cb);
    }
    
    fastPut(localPath, remotePath, opts, cb) {
        return this._stream.fastPut(localPath, remotePath, opts, cb);
    }
    
    readFile(path, options, callback_) {
        return this._stream.readFile(path, options, callback_);
    }
    
    writeFile(path, data, options, callback_) {
        return this._stream.writeFile(path, data, options, callback_);
    }
    
    appendFile(path, data, options, callback_) {
        return this._stream.appendFile(path, data, options, callback_);
    }
    
    exists(path, cb) {
        return this._stream.exists(path, cb);
    }
    
    unlink(filename, cb) {
        return this._stream.unlink(filename, cb);
    }
    
    rename(oldPath, newPath, cb) {
        return this._stream.rename(oldPath, newPath, cb);
    }
    
    mkdir(path, attrs, cb) {
        return this._stream.mkdir(path, attrs, cb);
    }
    
    rmdir(path, cb) {
        return this._stream.rmdir(path, cb);
    }
    
    readdir(where, opts, cb) {
        return this._stream.readdir(where, opts, cb);
    }
    
    fstat(handle, cb) {
        return this._stream.fstat(handle, cb);
    }
    
    stat(path, cb) {
        return this._stream.stat(path, cb);
    }
    
    lstat(path, cb) {
        return this._stream.lstat(path, cb);
    }
    
    opendir(path, cb) {
        return this._stream.opendir(path, cb);
    }
    
    setstat(path, attrs, cb) {
        return this._stream.setstat(path, attrs, cb);
    }
    
    fsetstat(handle, attrs, cb) {
        return this._stream.fsetstat(handle, attrs, cb);
    }
    
    futimes(handle, atime, mtime, cb) {
        return this._stream.futimes(handle, atime, mtime, cb);
    }
    
    utimes(path, atime, mtime, cb) {
        return this._stream.utimes(path, atime, mtime, cb);
    }
    
    fchown(handle, uid, gid, cb) {
        return this._stream.fchown(handle, uid, gid, cb);
    }
    
    chown(path, uid, gid, cb) {
        return this._stream.chown(path, uid, gid, cb);
    }
    
    fchmod(handle, mode, cb) {
        return this._stream.fchmod(handle, mode, cb);
    }
    
    chmod(path, mode, cb) {
        return this._stream.chmod(path, mode, cb);
    }
    
    readlink(path, cb) {
        return this._stream.readlink(path, cb);
    }
    
    symlink(targetPath, linkPath, cb) {
        return this._stream.symlink(targetPath, linkPath, cb);
    }
    
    realpath(path, cb) {
        return this._stream.realpath(path, cb);
    }
    
    // extended requests
    extOpensshRename(oldPath, newPath, cb) {
        return this._stream.extOpensshRename(oldPath, newPath, cb);
    }
    
    extOpensshStatvfs(path, cb) {
        return this._stream.extOpensshStatvfs(path, cb);
    }
    
    extOpensshFstatvfs(handle, cb) {
        return this._stream.extOpensshFstatvfs(handle, cb);
    }
    
    extOpensshHardlink(oldPath, newPath, cb) {
        return this._stream.extOpensshHardlink(oldPath, newPath, cb);
    }

    extOpensshFsync(handle, cb) {
        return this._stream.extOpensshFsync(handle, cb);
    }
}
