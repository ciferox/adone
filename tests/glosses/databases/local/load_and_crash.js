/**
 * Load and modify part of fs to ensure writeFile will crash after writing 5000 bytes
 */
const fs = adone.std.fs;


function rethrow() {
    return function (err) {
        if (err) {
            throw err;  // Forgot a callback but don't know where? Use NODE_DEBUG=fs
        }
    };
}

function maybeCallback(cb) {
    return typeof cb === "function" ? cb : rethrow();
}

function isFd(path) {
    return (path >>> 0) === path;
}

function assertEncoding(encoding) {
    if (encoding && !Buffer.isEncoding(encoding)) {
        throw new Error(`Unknown encoding: ${encoding}`);
    }
}

let onePassDone = false;
function writeAll(fd, isUserFd, buffer, offset, length, position) {
    const callback = maybeCallback(arguments[arguments.length - 1]);

    if (onePassDone) {
        process.exit(1);
    }   // Crash on purpose before rewrite done
    const l = Math.min(5000, length);   // Force write by chunks of 5000 bytes to ensure data will be incomplete on crash

    // write(fd, buffer, offset, length, position, callback)
    fs.write(fd, buffer, offset, l, position, (writeErr, written) => {
        if (writeErr) {
            if (isUserFd) {
                if (callback) {
                    callback(writeErr); 
                }
            } else {
                fs.close(fd, () => {
                    if (callback) {
                        callback(writeErr); 
                    }
                });
            }
        } else {
            onePassDone = true;
            if (written === length) {
                if (isUserFd) {
                    if (callback) {
                        callback(null); 
                    }
                } else {
                    fs.close(fd, callback);
                }
            } else {
                offset += written;
                length -= written;
                if (position !== null) {
                    position += written;
                }
                writeAll(fd, isUserFd, buffer, offset, length, position, callback);
            }
        }
    });
}

fs.writeFile = function (path, data, options) {
    const callback = maybeCallback(arguments[arguments.length - 1]);

    if (!options || typeof options === "function") {
        options = { encoding: "utf8", mode: 438, flag: "w" }; // Mode 438 == 0o666 (compatibility with older Node releases)
    } else if (typeof options === "string") {
        options = { encoding: options, mode: 438, flag: "w" }; // Mode 438 == 0o666 (compatibility with older Node releases)
    } else if (typeof options !== "object") {
        throw new Error("unvalid input");
    }

    assertEncoding(options.encoding);

    const flag = options.flag || "w";

    if (isFd(path)) {
        writeFd(path, true);
        return;
    }

    fs.open(path, flag, options.mode, (openErr, fd) => {
        if (openErr) {
            if (callback) {
                callback(openErr); 
            }
        } else {
            writeFd(fd, false);
        }
    });

    function writeFd(fd, isUserFd) {
        const buffer = (data instanceof Buffer) ? data : Buffer.from(`${data}`,
            options.encoding || "utf8");
        const position = /a/.test(flag) ? null : 0;

        writeAll(fd, isUserFd, buffer, 0, buffer.length, position, callback);
    }
};


// End of fs modification

const db = new adone.database.local.Datastore({ filename: process.argv[2] });

db.load();
