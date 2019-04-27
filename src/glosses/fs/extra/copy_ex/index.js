const {
    error: { errno, CopyException },
    event: { Emitter },
    is,
    glob,
    fs: { junk, createReadStream, createWriteStream, stat, lstat, readlink, readdir, symlink, mkdirp, remove, utimes },
    path,
    util
} = adone;

const emitterMixin = (obj) => {
    for (const k of Object.getOwnPropertyNames(Emitter.prototype)) {
        obj[k] = Emitter.prototype[k];
    }

    Object.defineProperty(obj, "_events", {
        get() {
            return this.__events || (this.__events = {});
        },
        set(val) {
            this.__events = val;
        }
    });

    obj.off = function (event, fn) {
        switch (arguments.length) {
            case 2:
                this.removeListener(event, fn);
                return this;
            case 1:
                this.removeAllListeners(event);
                return this;
            case 0:
                this.removeAllListeners();
                return this;
        }
    };

    return obj;
};

const fsError = (code, path) => {
    const errorType = errno.code[code];
    const message = `${errorType.code}, ${errorType.description} ${path}`;
    const error = new Error(message);
    error.errno = errorType.errno;
    error.code = errorType.code;
    error.path = path;
    return error;
};

// TODO: expose somewhere in adone
const slash = (input) => {
    const isExtendedLengthPath = /^\\\\\?\\/.test(input);
    const hasNonAscii = /[^\u0000-\u0080]+/.test(input); // eslint-disable-line no-control-regex

    return (isExtendedLengthPath || hasNonAscii)
        ? input
        : input.replace(/\\/g, "/");
};


const batch = (inputs, iteratee, options) => {
    const results = options.results ? [] : undefined;
    if (inputs.length === 0) {
        return Promise.resolve(results);
    }
    return new Promise(((resolve, reject) => {
        let currentIndex = -1;
        let activeWorkers = 0;
        const startWorker = function (input) {
            ++activeWorkers;
            iteratee(input).then((result) => {
                --activeWorkers;
                if (results) {
                    results.push(result);
                }
                if (currentIndex < inputs.length - 1) {
                    startWorker(inputs[++currentIndex]);
                } else if (activeWorkers === 0) {
                    resolve(results);
                }
            }).catch(reject);
        };

        while (currentIndex < Math.min(inputs.length, options.concurrency) - 1) {
            startWorker(inputs[++currentIndex]);
        }
    }));
};


export default (fs) => {

    const getFileListing = (srcPath, shouldExpandSymlinks) => {
        return readdir(srcPath)
            .then((filenames) => {
                return Promise.all(
                    filenames.map((filename) => {
                        const filePath = path.join(srcPath, filename);
                        return (shouldExpandSymlinks ? stat : lstat)(filePath)
                            .then((stats) => {
                                if (stats.isDirectory()) {
                                    return getFileListing(filePath, shouldExpandSymlinks)
                                        .then((childPaths) => {
                                            return [filePath].concat(childPaths);
                                        });
                                }
                                return [filePath];

                            });
                    })
                )
                    .then(function mergeArrays(arrays) {
                        return Array.prototype.concat.apply([], arrays);
                    });
            });
    };

    const getFilePaths = (src, shouldExpandSymlinks) => {
        return (shouldExpandSymlinks ? stat : lstat)(src)
            .then((stats) => {
                if (stats.isDirectory()) {
                    return getFileListing(src, shouldExpandSymlinks)
                        .then((filenames) => {
                            return [src].concat(filenames);
                        });
                }
                return [src];

            });
    };


    const dotFilter = (relativePath) => {
        const filename = path.basename(relativePath);
        return filename.charAt(0) !== ".";
    };

    const junkFilter = (relativePath) => {
        const filename = path.basename(relativePath);
        return !junk.is(filename);
    };

    const matcher = (path, filter, options) => {
        const typeOf = adone.typeOf(filter);
        switch (typeOf) {
            case "Array": {
                if (filter.length === 0) {
                    return true;
                }
                const fns = [];
                const patterns = [];
                for (const f of filter) {
                    if (is.function(f)) {
                        fns.push(f);
                    } else {
                        patterns.push(f);
                    }
                }
                return fns.some((f) => f(path)) || glob.match(path, patterns, options).length > 0;
            }
            case "function":
                return filter(path);
            case "string":
            case "RegExp": {
                return glob.match(path, filter, options).length > 0;
            }
        }
    };

    const getFilteredPaths = (paths, src, base, filter, options) => {
        const useDotFilter = !options.dot;
        const useJunkFilter = !options.junk;

        if (!filter && !useDotFilter && !useJunkFilter) {
            return paths.map((filePath) => path.relative(src, filePath));
        }
        return paths.filter((p) => {
            const pp = path.relative(base, p);
            return (!useDotFilter || dotFilter(pp)) && (!useJunkFilter || junkFilter(pp)) && (!filter || matcher(slash(pp), filter, options));
        }).map((p) => path.relative(src, p));
    };

    const ensureDirectoryExists = (path) => mkdirp(path);

    const ensureDestinationIsWritable = (destPath, srcStats, shouldOverwriteExistingFiles) => {
        return lstat(destPath)
            .catch((error) => {
                const shouldIgnoreError = error.code === "ENOENT";
                if (shouldIgnoreError) {
                    return null;
                }
                throw error;
            })
            .then((destStats) => {
                const destExists = Boolean(destStats);
                if (!destExists) {
                    return true;
                }

                const isMergePossible = srcStats.isDirectory() && destStats.isDirectory();
                if (isMergePossible) {
                    return true;
                }

                if (shouldOverwriteExistingFiles) {
                    return remove(destPath).then(() => true);
                }
                throw fsError("EEXIST", destPath);

            });
    };

    const prepareForCopy = (srcPath, destPath, options) => {
        const shouldExpandSymlinks = Boolean(options.expand);
        const shouldOverwriteExistingFiles = Boolean(options.overwrite);
        return (shouldExpandSymlinks ? stat : lstat)(srcPath)
            .then((stats) => {
                return ensureDestinationIsWritable(destPath, stats, shouldOverwriteExistingFiles)
                    .then(() => {
                        return stats;
                    });
            });
    };


    const createCopyFunction = (fn, stats, hasFinished, emitEvent, events) => {
        const startEvent = events.startEvent;
        const completeEvent = events.completeEvent;
        const errorEvent = events.errorEvent;
        return function (srcPath, destPath, stats, options) {
            // Multiple chains of promises are fired in parallel,
            // so when one fails we need to prevent any future
            // copy operations
            if (hasFinished()) {
                return Promise.reject();
            }
            const metadata = {
                src: srcPath,
                dest: destPath,
                stats
            };
            emitEvent(startEvent, metadata);
            const parentDirectory = path.dirname(destPath);
            return ensureDirectoryExists(parentDirectory)
                .then(() => {
                    return fn(srcPath, destPath, stats, options);
                })
                .then(() => {
                    if (!hasFinished()) {
                        emitEvent(completeEvent, metadata);
                    }
                    return metadata;
                })
                .catch((error) => {
                    if (!hasFinished()) {
                        emitEvent(errorEvent, error, metadata);
                    }
                    throw error;
                });
        };
    };

    const copyFile = (srcPath, destPath, stats, options) => {
        return new Promise(((resolve, reject) => {
            let hasFinished = false;
            const read = createReadStream(srcPath);
            const write = createWriteStream(destPath, {
                flags: "w",
                mode: stats.mode
            });
            const handleCopyFailed = (error) => {
                if (hasFinished) {
                    return;
                }
                hasFinished = true;
                if (is.function(read.close)) {
                    read.close();
                }
                if (is.function(write.close)) {
                    write.close();
                }
                return reject(error);
            };
            read.on("error", handleCopyFailed);

            write.on("error", handleCopyFailed);
            write.on("finish", () => {
                utimes(destPath, stats.atime, stats.mtime, () => {
                    hasFinished = true;
                    resolve();
                });
            });

            let transformStream = null;
            if (options.transform) {
                transformStream = options.transform(srcPath, destPath, stats);
                if (transformStream) {
                    transformStream.on("error", handleCopyFailed);
                    read.pipe(transformStream).pipe(write);
                } else {
                    read.pipe(write);
                }
            } else {
                read.pipe(write);
            }
        }));
    };

    const copySymlink = (srcPath, destPath, stats, options) => {
        return readlink(srcPath)
            .then((link) => {
                return symlink(link, destPath);
            });
    };

    const copyDirectory = (srcPath, destPath, stats, options) => {
        return mkdirp(destPath)
            .catch((error) => {
                const shouldIgnoreError = error.code === "EEXIST";
                if (shouldIgnoreError) {
                    return;
                }
                throw error;
            });
    };

    const getCopyFunction = (stats, hasFinished, emitEvent) => {
        if (stats.isDirectory()) {
            return createCopyFunction(copyDirectory, stats, hasFinished, emitEvent, {
                startEvent: "createDirectoryStart",
                completeEvent: "createDirectoryComplete",
                errorEvent: "createDirectoryError"
            });
        } else if (stats.isSymbolicLink()) {
            return createCopyFunction(copySymlink, stats, hasFinished, emitEvent, {
                startEvent: "createSymlinkStart",
                completeEvent: "createSymlinkComplete",
                errorEvent: "createSymlinkError"
            });
        }
        return createCopyFunction(copyFile, stats, hasFinished, emitEvent, {
            startEvent: "copyFileStart",
            completeEvent: "copyFileComplete",
            errorEvent: "copyFileError"
        });
    };

    const _copy = (srcPath, destPath, hasFinished, emitEvent, options) => {
        return prepareForCopy(srcPath, destPath, options)
            .then((stats) => {
                const copyFunction = getCopyFunction(stats, hasFinished, emitEvent);
                return copyFunction(srcPath, destPath, stats, options);
            })
            .catch((error) => {
                if (error instanceof CopyException) {
                    throw error;
                }
                const copyError = new CopyException(error.message);
                copyError.error = error;
                copyError.data = {
                    src: srcPath,
                    dest: destPath
                };
                throw copyError;
            })
            .then((result) => {
                return result;
            });
    };

    return (src, dest, options = {}) => {
        const parentDirectory = path.dirname(dest);
        const shouldExpandSymlinks = Boolean(options.expand);

        let emitter;
        let hasFinished = false;
        const base = options.base || src;
        const promise = ensureDirectoryExists(parentDirectory)
            .then(() => {
                return getFilePaths(src, shouldExpandSymlinks);
            })
            .then((filePaths) => {
                const filteredPaths = getFilteredPaths(filePaths, src, base, options.filter, {
                    dot: options.dot,
                    junk: options.junk
                });
                return filteredPaths.map((relativePath) => {
                    const inputPath = relativePath;
                    const outputPath = options.rename ? options.rename(inputPath) : inputPath;
                    return {
                        src: path.join(src, inputPath),
                        dest: path.join(dest, outputPath)
                    };
                });
            })
            .then((operations) => {
                const hasFinishedGetter = function () {
                    return hasFinished;
                };
                const emitEvent = function () {
                    emitter.emit.apply(emitter, arguments);
                };
                return batch(operations, (operation) => {
                    return _copy(operation.src, operation.dest, hasFinishedGetter, emitEvent, options);
                }, {
                        results: options.results !== false,
                        concurrency: options.concurrency || 255
                    });
            })
            .catch((error) => {
                if (error instanceof CopyException) {
                    emitter.emit("error", error.error, error.data);
                    throw error.error;
                } else {
                    throw error;
                }
            })
            .then((results) => {
                emitter.emit("complete", results);
                return results;
            })
            .then((results) => {
                hasFinished = true;
                return results;
            })
            .catch((error) => {
                hasFinished = true;
                throw error;
            });

        emitter = emitterMixin(promise);
        return emitter;
    };
};
