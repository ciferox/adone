export default (fs) => {
    const {
        assert,
        is,
        path
    } = adone;
    
    const rmkids = (p, options, cb) => {
        assert(p);
        assert(options);
        assert(is.function(cb));
    
        fs.readdir(p, (er, files) => {
            if (er) {
                return cb(er);
            }
    
            let n = files.length;
            let errState;
    
            if (n === 0) {
                return fs.rmdir(p, cb);
            }
    
            files.forEach((f) => {
                remove(path.join(p, f), options, (er) => {
                    if (errState) {
                        return;
                    }
                    if (er) {
                        return cb(errState = er);
                    }
                    if (--n === 0) {
                        fs.rmdir(p, cb);
                    }
                });
            });
        });
    };
    
    const rmdir = (p, options, originalEr, cb) => {
        assert(p);
        assert(options);
        if (originalEr) {
            assert(originalEr instanceof Error);
        }
        assert(is.function(cb));
    
        // try to rmdir first, and only readdir on ENOTEMPTY or EEXIST (SunOS)
        // if we guessed wrong, and it's not a directory, then
        // raise the original error.
        fs.rmdir(p, (er) => {
            if (er && (er.code === "ENOTEMPTY" || er.code === "EEXIST" || er.code === "EPERM")) {
                rmkids(p, options, cb);
            } else if (er && er.code === "ENOTDIR") {
                cb(originalEr);
            } else {
                cb(er);
            }
        });
    };
    
    
    const fixWinEPERM = (p, options, er, cb) => {
        assert(p);
        assert(options);
        assert(is.function(cb));
        if (er) {
            assert(er instanceof Error);
        }
    
        fs.chmod(p, 0o666, (er2) => {
            if (er2) {
                cb(er2.code === "ENOENT" ? null : er);
            } else {
                fs.stat(p, (er3, stats) => {
                    if (er3) {
                        cb(er3.code === "ENOENT" ? null : er);
                    } else if (stats.isDirectory()) {
                        rmdir(p, options, er, cb);
                    } else {
                        fs.unlink(p, cb);
                    }
                });
            }
        });
    };
    
    // Two possible strategies.
    // 1. Assume it's a file.  unlink it, then do the dir stuff on EPERM or EISDIR
    // 2. Assume it's a directory.  readdir, then do the file stuff on ENOTDIR
    //
    // Both result in an extra syscall when you guess wrong.  However, there
    // are likely far more normal files in the world than directories.  This
    // is based on the assumption that a the average number of files per
    // directory is >= 1.
    //
    // If anyone ever complains about this, then I guess the strategy could
    // be made configurable somehow.  But until then, YAGNI.
    const rimraf_ = (p, options, cb) => {
        assert(p);
        assert(options);
        assert(is.function(cb));
    
        // sunos lets the root user unlink directories, which is... weird.
        // so we have to lstat here and make sure it's not a dir.
        fs.lstat(p, (er, st) => {
            if (er && er.code === "ENOENT") {
                return cb(null);
            }
    
            // Windows can EPERM on stat.  Life is suffering.
            if (er && er.code === "EPERM" && is.windows) {
                return fixWinEPERM(p, options, er, cb);
            }
    
            if (st && st.isDirectory()) {
                return rmdir(p, options, er, cb);
            }
    
            fs.unlink(p, (er) => {
                if (er) {
                    if (er.code === "ENOENT") {
                        return cb(null);
                    }
                    if (er.code === "EPERM") {
                        return (is.windows)
                            ? fixWinEPERM(p, options, er, cb)
                            : rmdir(p, options, er, cb);
                    }
                    if (er.code === "EISDIR") {
                        return rmdir(p, options, er, cb);
                    }
                }
                return cb(er);
            });
        });
    };
    
    const remove = (p, options, cb) => {
        let busyTries = 0;
    
        if (is.function(options)) {
            cb = options;
            options = {};
        }
    
        assert(p, "fs.remove: missing path");
        assert.strictEqual(typeof p, "string", "fs.remove: path should be a string");
        assert.strictEqual(typeof cb, "function", "fs.remove: callback function required");
        assert(options, "fs.remove: invalid options argument provided");
        assert.strictEqual(typeof options, "object", "fs.remove: options should be object");
    
        options.maxBusyTries = options.maxBusyTries || 3;
    
        rimraf_(p, options, function CB(er) {
            if (er) {
                if ((er.code === "EBUSY" || er.code === "ENOTEMPTY" || er.code === "EPERM") &&
                    busyTries < options.maxBusyTries) {
                    busyTries++;
                    const time = busyTries * 100;
                    // try again, with the same exact callback as this one.
                    return setTimeout(() => rimraf_(p, options, CB), time);
                }
    
                // already gone
                if (er.code === "ENOENT") {
                    er = null;
                }
            }
    
            cb(er);
        });
    };
    
    return remove;    
};
