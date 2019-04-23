export default (fs) => {
    const {
        is,
        path
    } = adone;
    
    /**
     * Function that returns two types of paths, one relative to symlink, and one
     * relative to the current working directory. Checks if path is absolute or
     * relative. If the path is relative, this function checks if the path is
     * relative to symlink or relative to current working directory. This is an
     * initiative to find a smarter `srcpath` to supply when building symlinks.
     * This allows you to determine which path to use out of one of three possible
     * types of source paths. The first is an absolute path. This is detected by
     * `path.isAbsolute()`. When an absolute path is provided, it is checked to
     * see if it exists. If it does it's used, if not an error is returned
     * (callback)/ thrown (sync). The other two options for `srcpath` are a
     * relative url. By default Node's `fs.symlink` works by creating a symlink
     * using `dstpath` and expects the `srcpath` to be relative to the newly
     * created symlink. If you provide a `srcpath` that does not exist on the file
     * system it results in a broken symlink. To minimize this, the function
     * checks to see if the 'relative to symlink' source file exists, and if it
     * does it will use it. If it does not, it checks if there's a file that
     * exists that is relative to the current working directory, if does its used.
     * This preserves the expectations of the original fs.symlink spec and adds
     * the ability to pass in `relative to current working direcotry` paths.
     */
    const symlinkPaths = (srcpath, dstpath, callback) => {
        if (path.isAbsolute(srcpath)) {
            return fs.lstat(srcpath, (err) => {
                if (err) {
                    err.message = err.message.replace("lstat", "ensureSymlink");
                    return callback(err);
                }
                return callback(null, {
                    toCwd: srcpath,
                    toDst: srcpath
                });
            });
        }
        const dstdir = path.dirname(dstpath);
        const relativeToDst = path.join(dstdir, srcpath);
        return fs.pathExists(relativeToDst, (err, exists) => {
            if (err) {
                return callback(err);
            }
            if (exists) {
                return callback(null, {
                    toCwd: relativeToDst,
                    toDst: srcpath
                });
            }
            return fs.lstat(srcpath, (err) => {
                if (err) {
                    err.message = err.message.replace("lstat", "ensureSymlink");
                    return callback(err);
                }
                return callback(null, {
                    toCwd: srcpath,
                    toDst: path.relative(dstdir, srcpath)
                });
            });
    
        });
    };
    
    const symlinkType = (srcpath, type, callback) => {
        callback = (is.function(type)) ? type : callback;
        type = (is.function(type)) ? false : type;
        if (type) {
            return callback(null, type);
        }
        fs.lstat(srcpath, (err, stats) => {
            if (err) {
                return callback(null, "file");
            }
            type = (stats && stats.isDirectory()) ? "dir" : "file";
            callback(null, type);
        });
    };
    
    const createSymlink = (srcpath, dstpath, type, callback) => {
        callback = (is.function(type)) ? type : callback;
        type = (is.function(type)) ? false : type;
    
        fs.pathExists(dstpath, (err, destinationExists) => {
            if (err) {
                return callback(err);
            }
            if (destinationExists) {
                return callback(null);
            }
            symlinkPaths(srcpath, dstpath, (err, relative) => {
                if (err) {
                    return callback(err);
                }
                srcpath = relative.toDst;
                symlinkType(relative.toCwd, type, (err, type) => {
                    if (err) {
                        return callback(err);
                    }
                    const dir = path.dirname(dstpath);
                    fs.pathExists(dir, (err, dirExists) => {
                        if (err) {
                            return callback(err);
                        }
                        if (dirExists) {
                            return fs.symlink(srcpath, dstpath, type, callback);
                        }
                        fs.mkdirp(dir, (err) => {
                            if (err) {
                                return callback(err);
                            }
                            fs.symlink(srcpath, dstpath, type, callback);
                        });
                    });
                });
            });
        });
    };
    createSymlink.symlinkPaths = symlinkPaths;
    createSymlink.symlinkType = symlinkType;
    return createSymlink;    
};
