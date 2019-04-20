const {
    is
} = adone;

const constants = require("constants");

const origCwd = process.cwd;
let cwd = null;

const platform = process.env.GRACEFUL_FS_PLATFORM || process.platform;

process.cwd = function () {
    if (!cwd) {
        cwd = origCwd.call(process); 
    }
    return cwd;
};
try {
    process.cwd();
} catch (er) {}

const chdir = process.chdir;
process.chdir = function (d) {
    cwd = null;
    chdir.call(process, d);
};

module.exports = patch;

function patch(fs) {
    // (re-)implement some things that are known busted or missing.

    // lchmod, broken prior to 0.6.2
    // back-port the fix here.
    if (constants.hasOwnProperty("O_SYMLINK") &&
      process.version.match(/^v0\.6\.[0-2]|^v0\.5\./)) {
        patchLchmod(fs);
    }

    // lutimes implementation, or no-op
    if (!fs.lutimes) {
        patchLutimes(fs);
    }

    // https://github.com/isaacs/node-graceful-fs/issues/4
    // Chown should not fail on einval or eperm if non-root.
    // It should not fail on enosys ever, as this just indicates
    // that a fs doesn't support the intended operation.

    fs.chown = chownFix(fs.chown);
    fs.fchown = chownFix(fs.fchown);
    fs.lchown = chownFix(fs.lchown);

    fs.chmod = chmodFix(fs.chmod);
    fs.fchmod = chmodFix(fs.fchmod);
    fs.lchmod = chmodFix(fs.lchmod);

    fs.chownSync = chownFixSync(fs.chownSync);
    fs.fchownSync = chownFixSync(fs.fchownSync);
    fs.lchownSync = chownFixSync(fs.lchownSync);

    fs.chmodSync = chmodFixSync(fs.chmodSync);
    fs.fchmodSync = chmodFixSync(fs.fchmodSync);
    fs.lchmodSync = chmodFixSync(fs.lchmodSync);

    fs.stat = statFix(fs.stat);
    fs.fstat = statFix(fs.fstat);
    fs.lstat = statFix(fs.lstat);

    fs.statSync = statFixSync(fs.statSync);
    fs.fstatSync = statFixSync(fs.fstatSync);
    fs.lstatSync = statFixSync(fs.lstatSync);

    // if lchmod/lchown do not exist, then make them no-ops
    if (!fs.lchmod) {
        fs.lchmod = function (path, mode, cb) {
            if (cb) {
                process.nextTick(cb); 
            }
        };
        fs.lchmodSync = function () {};
    }
    if (!fs.lchown) {
        fs.lchown = function (path, uid, gid, cb) {
            if (cb) {
                process.nextTick(cb); 
            }
        };
        fs.lchownSync = function () {};
    }

    // on Windows, A/V software can lock the directory, causing this
    // to fail with an EACCES or EPERM if the directory contains newly
    // created files.  Try again on failure, for up to 60 seconds.

    // Set the timeout this long because some Windows Anti-Virus, such as Parity
    // bit9, may lock files for up to a minute, causing npm package install
    // failures. Also, take care to yield the scheduler. Windows scheduling gives
    // CPU to a busy looping process, which can cause the program causing the lock
    // contention to be starved of CPU by node, so the contention doesn't resolve.
    if (platform === "win32") {
        fs.rename = (function (fs$rename) {
            return function (from, to, cb) {
                const start = Date.now();
                let backoff = 0;
                fs$rename(from, to, function CB(er) {
                    if (er
            && (er.code === "EACCES" || er.code === "EPERM")
            && Date.now() - start < 60000) {
                        setTimeout(() => {
                            fs.stat(to, (stater, st) => {
                                if (stater && stater.code === "ENOENT") {
                                    fs$rename(from, to, CB); 
                                } else {
                                    cb(er); 
                                }
                            });
                        }, backoff);
                        if (backoff < 100) {
                            backoff += 10; 
                        }
                        return;
                    }
                    if (cb) {
                        cb(er); 
                    }
                });
            }; 
        })(fs.rename);
    }

    // if read() returns EAGAIN, then just try it again.
    fs.read = (function (fs$read) {
        return function (fd, buffer, offset, length, position, callback_) {
            let callback;
            if (callback_ && is.function(callback_)) {
                let eagCounter = 0;
                callback = function (er, _, __) {
                    if (er && er.code === "EAGAIN" && eagCounter < 10) {
                        eagCounter ++;
                        return fs$read.call(fs, fd, buffer, offset, length, position, callback);
                    }
                    callback_.apply(this, arguments);
                };
            }
            return fs$read.call(fs, fd, buffer, offset, length, position, callback);
        }; 
    })(fs.read);

    fs.readSync = (function (fs$readSync) {
        return function (fd, buffer, offset, length, position) {
            let eagCounter = 0;
            while (true) {
                try {
                    return fs$readSync.call(fs, fd, buffer, offset, length, position);
                } catch (er) {
                    if (er.code === "EAGAIN" && eagCounter < 10) {
                        eagCounter ++;
                        continue;
                    }
                    throw er;
                }
            }
        }; 
    })(fs.readSync);

    function patchLchmod(fs) {
        fs.lchmod = function (path, mode, callback) {
            fs.open( path
                , constants.O_WRONLY | constants.O_SYMLINK
                , mode
                , (err, fd) => {
                    if (err) {
                        if (callback) {
                            callback(err); 
                        }
                        return;
                    }
                    // prefer to return the chmod error, if one occurs,
                    // but still try to close, and report closing errors if they occur.
                    fs.fchmod(fd, mode, (err) => {
                        fs.close(fd, (err2) => {
                            if (callback) {
                                callback(err || err2); 
                            }
                        });
                    });
                });
        };

        fs.lchmodSync = function (path, mode) {
            const fd = fs.openSync(path, constants.O_WRONLY | constants.O_SYMLINK, mode);

            // prefer to return the chmod error, if one occurs,
            // but still try to close, and report closing errors if they occur.
            let threw = true;
            let ret;
            try {
                ret = fs.fchmodSync(fd, mode);
                threw = false;
            } finally {
                if (threw) {
                    try {
                        fs.closeSync(fd);
                    } catch (er) {}
                } else {
                    fs.closeSync(fd);
                }
            }
            return ret;
        };
    }

    function patchLutimes(fs) {
        if (constants.hasOwnProperty("O_SYMLINK")) {
            fs.lutimes = function (path, at, mt, cb) {
                fs.open(path, constants.O_SYMLINK, (er, fd) => {
                    if (er) {
                        if (cb) {
                            cb(er); 
                        }
                        return;
                    }
                    fs.futimes(fd, at, mt, (er) => {
                        fs.close(fd, (er2) => {
                            if (cb) {
                                cb(er || er2); 
                            }
                        });
                    });
                });
            };

            fs.lutimesSync = function (path, at, mt) {
                const fd = fs.openSync(path, constants.O_SYMLINK);
                let ret;
                let threw = true;
                try {
                    ret = fs.futimesSync(fd, at, mt);
                    threw = false;
                } finally {
                    if (threw) {
                        try {
                            fs.closeSync(fd);
                        } catch (er) {}
                    } else {
                        fs.closeSync(fd);
                    }
                }
                return ret;
            };

        } else {
            fs.lutimes = function (_a, _b, _c, cb) {
                if (cb) {
                    process.nextTick(cb); 
                } 
            };
            fs.lutimesSync = function () {};
        }
    }

    function chmodFix(orig) {
        if (!orig) {
            return orig; 
        }
        return function (target, mode, cb) {
            return orig.call(fs, target, mode, function (er) {
                if (chownErOk(er)) {
                    er = null; 
                }
                if (cb) {
                    cb.apply(this, arguments); 
                }
            });
        };
    }

    function chmodFixSync(orig) {
        if (!orig) {
            return orig; 
        }
        return function (target, mode) {
            try {
                return orig.call(fs, target, mode);
            } catch (er) {
                if (!chownErOk(er)) {
                    throw er; 
                }
            }
        };
    }


    function chownFix(orig) {
        if (!orig) {
            return orig; 
        }
        return function (target, uid, gid, cb) {
            return orig.call(fs, target, uid, gid, function (er) {
                if (chownErOk(er)) {
                    er = null; 
                }
                if (cb) {
                    cb.apply(this, arguments); 
                }
            });
        };
    }

    function chownFixSync(orig) {
        if (!orig) {
            return orig; 
        }
        return function (target, uid, gid) {
            try {
                return orig.call(fs, target, uid, gid);
            } catch (er) {
                if (!chownErOk(er)) {
                    throw er; 
                }
            }
        };
    }


    function statFix(orig) {
        if (!orig) {
            return orig; 
        }
        // Older versions of Node erroneously returned signed integers for
        // uid + gid.
        return function (target, cb) {
            return orig.call(fs, target, function (er, stats) {
                if (!stats) {
                    return cb.apply(this, arguments); 
                }
                if (stats.uid < 0) {
                    stats.uid += 0x100000000; 
                }
                if (stats.gid < 0) {
                    stats.gid += 0x100000000; 
                }
                if (cb) {
                    cb.apply(this, arguments); 
                }
            });
        };
    }

    function statFixSync(orig) {
        if (!orig) {
            return orig; 
        }
        // Older versions of Node erroneously returned signed integers for
        // uid + gid.
        return function (target) {
            const stats = orig.call(fs, target);
            if (stats.uid < 0) {
                stats.uid += 0x100000000; 
            }
            if (stats.gid < 0) {
                stats.gid += 0x100000000; 
            }
            return stats;
        };
    }

    // ENOSYS means that the fs doesn't support the op. Just ignore
    // that, because it doesn't matter.
    //
    // if there's no getuid, or if getuid() is something other
    // than 0, and the error is EINVAL or EPERM, then just ignore
    // it.
    //
    // This specific case is a silent failure in cp, install, tar,
    // and most other unix tools that manage permissions.
    //
    // When running as root, or if other types of errors are
    // encountered, then it's strict.
    function chownErOk(er) {
        if (!er) {
            return true; 
        }

        if (er.code === "ENOSYS") {
            return true; 
        }

        const nonroot = !process.getuid || process.getuid() !== 0;
        if (nonroot) {
            if (er.code === "EINVAL" || er.code === "EPERM") {
                return true; 
            }
        }

        return false;
    }
}
