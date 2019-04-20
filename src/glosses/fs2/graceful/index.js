/**
 * eslint-disable func-style
 */
const {
    is,
    std: { fs }
} = adone;

const polyfills = require("./polyfills.js");
const legacy = require("./legacy-streams.js");
const clone = require("./clone.js");

const queue = [];

module.exports = patch(clone(fs));
if (process.env.TEST_GRACEFUL_FS_GLOBAL_PATCH && !fs.__patched) {
    module.exports = patch(fs);
    fs.__patched = true;
}

// Always patch fs.close/closeSync, because we want to
// retry() whenever a close happens *anywhere* in the program.
// This is essential when multiple graceful-fs instances are
// in play at the same time.
module.exports.close = (function (fs$close) {
    return function (fd, cb) {
        return fs$close.call(fs, fd, function (err) {
            if (!err) {
                retry();
            }

            if (is.function(cb)) {
                cb.apply(this, arguments);
            }
        });
    };
})(fs.close);

module.exports.closeSync = (function (fs$closeSync) {
    return function (fd) {
        // Note that graceful-fs also retries when fs.closeSync() fails.
        // Looks like a bug to me, although it's probably a harmless one.
        const rval = fs$closeSync.apply(fs, arguments);
        retry();
        return rval;
    };
})(fs.closeSync);

// Only patch fs once, otherwise we'll run into a memory leak if
// graceful-fs is loaded multiple times, such as in test environments that
// reset the loaded modules between tests.
// We look for the string `graceful-fs` from the comment above. This
// way we are not adding any extra properties and it will detect if older
// versions of graceful-fs are installed.
if (!/\bgraceful-fs\b/.test(fs.closeSync.toString())) {
    fs.closeSync = module.exports.closeSync;
    fs.close = module.exports.close;
}

function patch(fs) {
    // Everything that references the open() function needs to be in here
    polyfills(fs);
    fs.gracefulify = patch;
    fs.FileReadStream = ReadStream; // Legacy name.
    fs.FileWriteStream = WriteStream; // Legacy name.
    fs.createReadStream = createReadStream;
    fs.createWriteStream = createWriteStream;
    const fs$readFile = fs.readFile;
    fs.readFile = readFile;
    function readFile(path, options, cb) {
        if (is.function(options)) {
            cb = options, options = null;
        }

        return go$readFile(path, options, cb);

        function go$readFile(path, options, cb) {
            return fs$readFile(path, options, function (err) {
                if (err && (err.code === "EMFILE" || err.code === "ENFILE")) {
                    enqueue([go$readFile, [path, options, cb]]);
                } else {
                    if (is.function(cb)) {
                        cb.apply(this, arguments);
                    }
                    retry();
                }
            });
        }
    }

    const fs$writeFile = fs.writeFile;
    fs.writeFile = writeFile;
    function writeFile(path, data, options, cb) {
        if (is.function(options)) {
            cb = options, options = null;
        }

        return go$writeFile(path, data, options, cb);

        function go$writeFile(path, data, options, cb) {
            return fs$writeFile(path, data, options, function (err) {
                if (err && (err.code === "EMFILE" || err.code === "ENFILE")) {
                    enqueue([go$writeFile, [path, data, options, cb]]);
                } else {
                    if (is.function(cb)) {
                        cb.apply(this, arguments);
                    }
                    retry();
                }
            });
        }
    }

    const fs$appendFile = fs.appendFile;
    if (fs$appendFile) {
        fs.appendFile = appendFile;
    }
    function appendFile(path, data, options, cb) {
        if (is.function(options)) {
            cb = options, options = null;
        }

        return go$appendFile(path, data, options, cb);

        function go$appendFile(path, data, options, cb) {
            return fs$appendFile(path, data, options, function (err) {
                if (err && (err.code === "EMFILE" || err.code === "ENFILE")) {
                    enqueue([go$appendFile, [path, data, options, cb]]);
                } else {
                    if (is.function(cb)) {
                        cb.apply(this, arguments);
                    }
                    retry();
                }
            });
        }
    }

    const fs$readdir = fs.readdir;
    fs.readdir = readdir;
    function readdir(path, options, cb) {
        const args = [path];
        if (!is.function(options)) {
            args.push(options);
        } else {
            cb = options;
        }
        args.push(go$readdir$cb);

        return go$readdir(args);

        function go$readdir$cb(err, files) {
            if (files && files.sort) {
                files.sort();
            }

            if (err && (err.code === "EMFILE" || err.code === "ENFILE")) {
                enqueue([go$readdir, [args]]);
            } else {
                if (is.function(cb)) {
                    cb.apply(this, arguments);
                }
                retry();
            }
        }
    }

    function go$readdir(args) {
        return fs$readdir.apply(fs, args);
    }

    if (process.version.substr(0, 4) === "v0.8") {
        const legStreams = legacy(fs);
        ReadStream = legStreams.ReadStream;
        WriteStream = legStreams.WriteStream;
    }

    const fs$ReadStream = fs.ReadStream;
    if (fs$ReadStream) {
        ReadStream.prototype = Object.create(fs$ReadStream.prototype);
        ReadStream.prototype.open = ReadStream$open;
    }

    const fs$WriteStream = fs.WriteStream;
    if (fs$WriteStream) {
        WriteStream.prototype = Object.create(fs$WriteStream.prototype);
        WriteStream.prototype.open = WriteStream$open;
    }

    fs.ReadStream = ReadStream;
    fs.WriteStream = WriteStream;

    function ReadStream(path, options) {
        if (this instanceof ReadStream) {
            return fs$ReadStream.apply(this, arguments), this;
        }
        return ReadStream.apply(Object.create(ReadStream.prototype), arguments);
    }

    function ReadStream$open() {
        const that = this;
        open(that.path, that.flags, that.mode, (err, fd) => {
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
    }

    function WriteStream(path, options) {
        if (this instanceof WriteStream) {
            return fs$WriteStream.apply(this, arguments), this;
        }
        return WriteStream.apply(Object.create(WriteStream.prototype), arguments);
    }

    function WriteStream$open() {
        const that = this;
        open(that.path, that.flags, that.mode, (err, fd) => {
            if (err) {
                that.destroy();
                that.emit("error", err);
            } else {
                that.fd = fd;
                that.emit("open", fd);
            }
        });
    }

    function createReadStream(path, options) {
        return new ReadStream(path, options);
    }

    function createWriteStream(path, options) {
        return new WriteStream(path, options);
    }

    const fs$open = fs.open;
    fs.open = open;
    function open(path, flags, mode, cb) {
        if (is.function(mode)) {
            cb = mode, mode = null;
        }

        return go$open(path, flags, mode, cb);

        function go$open(path, flags, mode, cb) {
            return fs$open(path, flags, mode, function (err, fd) {
                if (err && (err.code === "EMFILE" || err.code === "ENFILE")) {
                    enqueue([go$open, [path, flags, mode, cb]]);
                } else {
                    if (is.function(cb)) {
                        cb.apply(this, arguments);
                    }
                    retry();
                }
            });
        }
    }

    return fs;
}

function enqueue(elem) {
    queue.push(elem);
}

function retry() {
    const elem = queue.shift();
    if (elem) {
        elem[0].apply(null, elem[1]);
    }
}
