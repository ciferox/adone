const {
    error,
    is,
    fs,
    std
} = adone;

export default async (source, dest, options = {}) => {
    const basePath = process.cwd();
    const currentPath = std.path.resolve(basePath, source);
    const targetPath = std.path.resolve(basePath, dest);
    if (currentPath === targetPath) {
        throw new error.NotAllowedException("Source and destination must not be the same.");
    }

    const stats = await fs.lstat(source);
    let dir = null;
    if (stats.isDirectory()) {
        const parts = dest.split(std.path.sep);
        parts.pop();
        dir = parts.join(std.path.sep);
    } else {
        dir = std.path.dirname(dest);
    }

    await fs.mkdirp(dir);

    return new Promise((resolve, reject) => {
        const filter = options.filter;
        const transform = options.transform;
        let overwrite = options.overwrite;
        // If overwrite is undefined, use clobber, otherwise default to true:
        if (is.undefined(overwrite)) {
            overwrite = options.clobber;
        }
        if (is.undefined(overwrite)) {
            overwrite = true;
        }
        const errorOnExist = options.errorOnExist;
        const dereference = options.dereference;
        const preserveTimestamps = options.preserveTimestamps === true;

        let started = 0;
        let finished = 0;
        let running = 0;

        let errored = false;

        const doneOne = (skipped) => {
            if (!skipped) {
                running--;
            }
            finished++;
            if ((started === finished) && (running === 0)) {
                return resolve();
            }
        };

        const onError = (err) => {
            // ensure callback is defined & called only once:
            if (!errored) {
                errored = true;
                return reject(err);
            }
        };

        const copyFile = (file, target) => {
            const readStream = fs.createReadStream(file.name);
            const writeStream = fs.createWriteStream(target, { mode: file.mode });

            readStream.on("error", onError);
            writeStream.on("error", onError);

            if (transform) {
                transform(readStream, writeStream, file);
            } else {
                writeStream.on("open", () => {
                    readStream.pipe(writeStream);
                });
            }

            writeStream.once("close", () => {
                std.fs.chmod(target, file.mode, (err) => {
                    if (err) {
                        return onError(err);
                    }
                    if (preserveTimestamps) {
                        fs.utimesMillis(target, file.atime, file.mtime, (err) => {
                            if (err) {
                                return onError(err);
                            }
                            return doneOne();
                        });
                    } else {
                        doneOne();
                    }
                });
            });
        };

        const rmFile = (file, done) => {
            std.fs.unlink(file, (err) => {
                if (err) {
                    return onError(err);
                }
                return done();
            });
        };

        const copyDir = (dir) => {
            fs.readdir(dir, (err, items) => {
                if (err) {
                    return onError(err);
                }
                items.forEach((item) => {
                    startCopy(std.path.join(dir, item));
                });
                return doneOne();
            });
        };

        const mkDir = (dir, target) => {
            std.fs.mkdir(target, dir.mode, (err) => {
                if (err) {
                    return onError(err);
                }
                // despite setting mode in fs.mkdir, doesn't seem to work
                // so we set it here.
                std.fs.chmod(target, dir.mode, (err) => {
                    if (err) {
                        return onError(err);
                    }
                    copyDir(dir.name);
                });
            });
        };

        const isWritable = (path, done) => {
            std.fs.lstat(path, (err) => {
                if (err) {
                    if (err.code === "ENOENT") {
                        return done(true);
                    }
                    return done(false);
                }
                return done(false);
            });
        };

        const onDir = (dir) => {
            const target = dir.name.replace(currentPath, targetPath.replace("$", "$$$$")); // escapes '$' with '$$'
            isWritable(target, (writable) => {
                if (writable) {
                    return mkDir(dir, target);
                }
                copyDir(dir.name);
            });
        };

        const onFile = (file) => {
            const target = file.name.replace(currentPath, targetPath.replace("$", "$$$$")); // escapes '$' with '$$'
            isWritable(target, (writable) => {
                if (writable) {
                    copyFile(file, target);
                } else {
                    if (overwrite) {
                        rmFile(target, () => {
                            copyFile(file, target);
                        });
                    } else if (errorOnExist) {
                        onError(new Error(`${target} already exists`));
                    } else {
                        doneOne();
                    }
                }
            });
        };

        const makeLink = (linkPath, target) => {
            std.fs.symlink(linkPath, target, (err) => {
                if (err) {
                    return onError(err);
                }
                return doneOne();
            });
        };

        const checkLink = (resolvedPath, target) => {
            if (dereference) {
                resolvedPath = std.path.resolve(basePath, resolvedPath);
            }
            isWritable(target, (writable) => {
                if (writable) {
                    return makeLink(resolvedPath, target);
                }
                std.fs.readlink(target, (err, targetDest) => {
                    if (err) {
                        return onError(err);
                    }

                    if (dereference) {
                        targetDest = std.path.resolve(basePath, targetDest);
                    }
                    if (targetDest === resolvedPath) {
                        return doneOne();
                    }
                    return rmFile(target, () => {
                        makeLink(resolvedPath, target);
                    });
                });
            });
        };

        const onLink = (link) => {
            const target = link.replace(currentPath, targetPath);
            std.fs.readlink(link, (err, resolvedPath) => {
                if (err) {
                    return onError(err);
                }
                checkLink(resolvedPath, target);
            });
        };

        const getStats = (source) => {
            const stat = dereference ? std.fs.stat : std.fs.lstat;
            running++;
            stat(source, (err, stats) => {
                if (err) {
                    return onError(err);
                }

                // We need to get the mode from the stats object and preserve it.
                const item = {
                    name: source,
                    mode: stats.mode,
                    mtime: stats.mtime, // modified time
                    atime: stats.atime, // access time
                    stats // temporary
                };

                if (stats.isDirectory()) {
                    return onDir(item);
                } else if (stats.isFile() || stats.isCharacterDevice() || stats.isBlockDevice()) {
                    return onFile(item);
                } else if (stats.isSymbolicLink()) {
                    // Symlinks don't really need to know about the mode.
                    return onLink(source);
                }
            });
        };

        const startCopy = (source) => {
            started++;
            if (filter) {
                if (filter instanceof RegExp) {
                    adone.logWarn("Warning: fs-extra: Passing a RegExp filter is deprecated, use a function");
                    if (!filter.test(source)) {
                        return doneOne(true);
                    }
                } else if (is.function(filter)) {
                    if (!filter(source, dest)) {
                        return doneOne(true);
                    }
                }
            }
            return getStats(source);
        };

        startCopy(currentPath);
    });
};
