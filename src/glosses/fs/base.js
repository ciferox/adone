/* eslint-disable func-style */
import fs from "fs";
import clone from "./clone";
import { isFunction } from "../../common";
import * as aPath from "../path";

const constants = require("constants");
const platform = process.env.GRACEFUL_FS_PLATFORM || process.platform;

const queue = [];
const enqueue = (elem) => {
    queue.push(elem);
};

const retry = () => {
    const elem = queue.shift();
    if (elem) {
        elem[0].apply(null, elem[1]);
    }
};

const patch = (fs) => {
    // Everything that references the open() function needs to be in here

    // (re-)implement some things that are known busted or missing.

    // lutimes implementation, or no-op
    if (!fs.lutimes) {
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
                        } catch (er) { }
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
            fs.lutimesSync = function () { };
        }
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
    const chownErOk = (er) => {
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
    };

    // https://github.com/isaacs/node-graceful-fs/issues/4
    // Chown should not fail on einval or eperm if non-root.
    // It should not fail on enosys ever, as this just indicates
    // that a fs doesn't support the intended operation.

    const chownFix = function (orig) {
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
    };
    fs.chown = chownFix(fs.chown);
    fs.fchown = chownFix(fs.fchown);
    fs.lchown = chownFix(fs.lchown);

    const chmodFix = (orig) => {
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
    };
    fs.chmod = chmodFix(fs.chmod);
    fs.fchmod = chmodFix(fs.fchmod);
    fs.lchmod = chmodFix(fs.lchmod);

    const chownFixSync = (orig) => {
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
    };
    fs.chownSync = chownFixSync(fs.chownSync);
    fs.fchownSync = chownFixSync(fs.fchownSync);
    fs.lchownSync = chownFixSync(fs.lchownSync);

    const chmodFixSync = (orig) => {
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
    };
    fs.chmodSync = chmodFixSync(fs.chmodSync);
    fs.fchmodSync = chmodFixSync(fs.fchmodSync);
    fs.lchmodSync = chmodFixSync(fs.lchmodSync);

    const statFix = (orig) => {
        if (!orig) {
            return orig;
        }
        // Older versions of Node erroneously returned signed integers for
        // uid + gid.
        return function (target, options, cb) {
            if (isFunction(options)) {
                cb = options;
                options = {};
            }
            return orig.call(fs, target, options, function (er, stats) {
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
    };
    fs.stat = statFix(fs.stat);
    fs.fstat = statFix(fs.fstat);
    fs.lstat = statFix(fs.lstat);

    const statFixSync = (orig) => {
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
    };
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
        fs.lchmodSync = function () { };
    }
    if (!fs.lchown) {
        fs.lchown = function (path, uid, gid, cb) {
            if (cb) {
                process.nextTick(cb);
            }
        };
        fs.lchownSync = function () { };
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
                                }
                                else {
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
            if (callback_ && isFunction(callback_)) {
                let eagCounter = 0;
                callback = function (er, _, __) {
                    if (er && er.code === "EAGAIN" && eagCounter < 10) {
                        eagCounter++;
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
                        eagCounter++;
                        continue;
                    }
                    throw er;
                }
            }
        };
    })(fs.readSync);

    const fs$readFile = fs.readFile;
    fs.readFile = function readFile(path, options, cb) {
        if (isFunction(options)) {
            cb = options, options = null;
        }

        const go$readFile = function (path, options, cb) {
            return fs$readFile(path, options, function (err) {
                if (err && (err.code === "EMFILE" || err.code === "ENFILE")) {
                    enqueue([go$readFile, [path, options, cb]]);
                } else {
                    if (isFunction(cb)) {
                        cb.apply(this, arguments);
                    }
                    retry();
                }
            });
        };

        return go$readFile(path, options, cb);
    };

    const fs$writeFile = fs.writeFile;
    fs.writeFile = function writeFile(path, data, options, cb) {
        if (isFunction(options)) {
            cb = options, options = null;
        }

        const go$writeFile = function (path, data, options, cb) {
            return fs$writeFile(path, data, options, function (err) {
                if (err && (err.code === "EMFILE" || err.code === "ENFILE")) {
                    enqueue([go$writeFile, [path, data, options, cb]]);
                } else {
                    if (isFunction(cb)) {
                        cb.apply(this, arguments);
                    }
                    retry();
                }
            });
        };

        return go$writeFile(path, data, options, cb);
    };

    const fs$appendFile = fs.appendFile;
    fs.appendFile = function appendFile(path, data, options, cb) {
        if (isFunction(options)) {
            cb = options, options = null;
        }

        const go$appendFile = function (path, data, options, cb) {
            return fs$appendFile(path, data, options, function (err) {
                if (err && (err.code === "EMFILE" || err.code === "ENFILE")) {
                    enqueue([go$appendFile, [path, data, options, cb]]);
                } else {
                    if (isFunction(cb)) {
                        cb.apply(this, arguments);
                    }
                    retry();
                }
            });
        };

        return go$appendFile(path, data, options, cb);
    };

    const fs$readdir = fs.readdir;
    const go$readdir = (args) => fs$readdir.apply(fs, args);

    fs.readdir = function readdir(path, options, cb) {
        const args = [path];
        if (!isFunction(options)) {
            args.push(options);
        } else {
            cb = options;
        }

        const go$readdir$cb = function (err, files) {
            if (files && files.sort) {
                files.sort();
            }

            if (err && (err.code === "EMFILE" || err.code === "ENFILE")) {
                enqueue([go$readdir, [args]]);
            } else {
                if (isFunction(cb)) {
                    cb.apply(this, arguments);
                }
                retry();
            }
        };
        args.push(go$readdir$cb);

        return go$readdir(args);
    };

    const fs$open = fs.open;
    fs.open = function open(path, flags, mode, cb) {
        if (isFunction(mode)) {
            cb = mode, mode = null;
        }

        const go$open = function (path, flags, mode, cb) {
            fs$open(path, flags, mode, function (err, fd) {
                if (err && (err.code === "EMFILE" || err.code === "ENFILE")) {
                    enqueue([go$open, [path, flags, mode, cb]]);
                } else {
                    if (isFunction(cb)) {
                        cb.apply(this, arguments);
                    }
                    retry();
                }
            });
        };

        go$open(path, flags, mode, cb);
    };

    const fs$ReadStream = fs.ReadStream;
    if (fs$ReadStream) {
        ReadStream.prototype = Object.create(fs$ReadStream.prototype);
        ReadStream.prototype.open = function () {
            const that = this;
            fs.open(that.path, that.flags, that.mode, (err, fd) => {
                if (err) {
                    if (that.autoClose) {
                        that.destroy();
                    }

                    that.emit("error", err);
                } else {
                    that.fd = fd;
                    that.emit("open", fd);
                    that.read();
                }
            });
        };
    }

    const fs$WriteStream = fs.WriteStream;
    if (fs$WriteStream) {
        WriteStream.prototype = Object.create(fs$WriteStream.prototype);
        WriteStream.prototype.open = function () {
            const that = this;
            fs.open(that.path, that.flags, that.mode, (err, fd) => {
                if (err) {
                    that.destroy();
                    that.emit("error", err);
                } else {
                    that.fd = fd;
                    that.emit("open", fd);
                }
            });
        };
    }

    function ReadStream(path, options) {
        if (this instanceof ReadStream) {
            return fs$ReadStream.apply(this, arguments), this;
        }
        return ReadStream.apply(Object.create(ReadStream.prototype), arguments);
    }

    function WriteStream(path, options) {
        if (this instanceof WriteStream) {
            return fs$WriteStream.apply(this, arguments), this;
        }
        return WriteStream.apply(Object.create(WriteStream.prototype), arguments);
    }

    fs.ReadStream = ReadStream;
    fs.WriteStream = WriteStream;
    fs.createReadStream = function createReadStream(path, options) {
        return new ReadStream(path, options);
    };

    fs.createWriteStream = function createWriteStream(path, options) {
        return new WriteStream(path, options);
    };

    return fs;
};

const base = patch(clone(fs));

// Always patch fs.close/closeSync, because we want to
// retry() whenever a close happens *anywhere* in the program.
// This is essential when multiple graceful-fs instances are
// in play at the same time.
base.close = (function (fs$close) {
    return function (fd, cb) {
        return fs$close.call(fs, fd, function (err) {
            if (!err) {
                retry();
            }

            if (isFunction(cb)) {
                cb.apply(this, arguments);
            }
        });
    };
})(fs.close);

base.closeSync = (function (fs$closeSync) {
    return function (fd) {
        // Note that graceful-fs also retries when fs.closeSync() fails.
        // Looks like a bug to me, although it's probably a harmless one.
        const rval = fs$closeSync.apply(fs, arguments);
        retry();
        return rval;
    };
})(fs.closeSync);

fs.closeSync = base.closeSync;
fs.close = base.close;

base.path = aPath;
base.cwd = process.cwd;

export default base;
