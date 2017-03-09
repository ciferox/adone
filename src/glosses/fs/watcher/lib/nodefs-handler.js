import adone from "adone";

// fs.watch helpers

// object to hold per-process fs.watch instances
// (may be shared across chokidar FSWatcher instances)
const FsWatchInstances = new Map();

/**
 * Helper for passing fs.watch event data to a collection of listeners
 * 
 * @private
 * @param {string} fullPath - absolute path bound to the fs.watch instance
 * @param {string} type - listener type
 * @param {any[]} args - arguments to be passed to listeners
 * @returns
 */
const fsWatchBroadcast = (fullPath, type, ...args) => {
    if (!FsWatchInstances.has(fullPath)) {
        return;
    }
    for (const listener of FsWatchInstances.get(fullPath)[type]) {
        listener(...args);
    }
};

/**
 * Instantiates the fs.watch interface
 * 
 * @private
 * @private
 * @param {string} path - path to be watched
 * @param {Object} options - options to be passed to fs.watch
 * @param {function} listener - main event handler
 * @param {function} errHandler - handler which emits info about errors
 * @param {function} emitRaw - handler which emits raw event data
 * @returns {Object} new fsevents instance
 */
const createFsWatchInstance = (path, options, listener, errHandler, emitRaw) => {
    const handleEvent = (rawEvent, evPath) => {
        listener(path);
        emitRaw(rawEvent, evPath, { watchedPath: path });

        // emit based on events occuring for files from a directory's watcher in
        // case the file's watcher misses it (and rely on throttling to de-dupe)
        if (evPath && path !== evPath) {
            fsWatchBroadcast(adone.std.path.resolve(path, evPath), "listeners", adone.std.path.join(path, evPath));
        }
    };
    try {
        return adone.std.fs.watch(path, options, handleEvent);
    } catch (error) {
        errHandler(error);
    }
};

/**
 * Instantiates the fs.watch interface or binds listeners to an existing one covering the same file system entry
 * 
 * @private
 * @param {string} path - path to be watched
 * @param {string} fullPath - absolute path
 * @param {object} options - options to be passed to fs.watch
 * @param {object} handlers - container for event listener functions
 * @returns {function} close function
 */
const setFsWatchListener = (path, fullPath, options, handlers) => {
    const { listener, errHandler, rawEmitter } = handlers;
    let container = FsWatchInstances.get(fullPath);
    let watcher;
    if (!options.persistent) {
        watcher = createFsWatchInstance(path, options, listener, errHandler, rawEmitter);
        return () => watcher.close();
    }
    if (!container) {
        watcher = createFsWatchInstance(
            path,
            options,
            (...args) => fsWatchBroadcast(fullPath, "listeners", ...args),
            errHandler, // no need to use broadcast here
            (...args) => fsWatchBroadcast(fullPath, "rawEmitters", ...args)
        );
        if (!watcher) {
            return;
        }
        const broadcastErr = (...args) => fsWatchBroadcast(fullPath, "errHandlers", ...args);
        watcher.on("error", (error) => {
            // Workaround for https://github.com/joyent/node/issues/4337
            if (process.platform === "win32" && error.code === "EPERM") {
                adone.std.fs.open(path, "r", (err, fd) => {
                    if (fd) {
                        adone.std.fs.close(fd);
                    }
                    if (!err) {
                        broadcastErr(error);
                    }
                });
            } else {
                broadcastErr(error);
            }
        });
        container = {
            listeners: [listener],
            errHandlers: [errHandler],
            rawEmitters: [rawEmitter],
            watcher
        };
        FsWatchInstances.set(fullPath, container);
    } else {
        container.listeners.push(listener);
        container.errHandlers.push(errHandler);
        container.rawEmitters.push(rawEmitter);
    }
    // const listenerIndex = container.listeners.length - 1;

    // removes this instance's listeners and closes the underlying fs.watch
    // instance if there are no more listeners left
    return () => {
        container.listeners.splice(container.listeners.indexOf(listener), 1);
        container.errHandlers.splice(container.errHandlers.indexOf(errHandler), 1);
        container.rawEmitters.splice(container.rawEmitters.indexOf(rawEmitter), 1);
        if (!container.listeners.length) {
            container.watcher.close();
            FsWatchInstances.delete(fullPath);
        }
    };
};

// fs.watchFile helpers

// object to hold per-process fs.watchFile instances
// (may be shared across chokidar FSWatcher instances)
const FsWatchFileInstances = new Map();

/**
 * Instantiates the fs.watchFile interface or binds listeners to an existing one covering the same file system entry
 * 
 * @private
 * @param {string} path - path to be watched
 * @param {string} fullPath - absolute path
 * @param {object} options - options to be passed to fs.watchFile
 * @param {object} handlers - container for event listener functions
 * @returns {function} close function
 */
const setFsWatchFileListener = (path, fullPath, options, handlers) => {
    const { listener, rawEmitter } = handlers;
    let container = FsWatchFileInstances.get(fullPath);
    let listeners = [];
    let rawEmitters = [];
    if (container && (container.options.persistent < options.persistent || container.options.interval > options.interval)) {
        // "Upgrade" the watcher to persistence or a quicker interval.
        // This creates some unlikely edge case issues if the user mixes
        // settings in a very weird way, but solving for those cases
        // doesn't seem worthwhile for the added complexity.
        ({ listeners, rawEmitters } = container);
        adone.std.fs.unwatchFile(fullPath);
        container = false;
    }
    if (!container) {
        listeners.push(listener);
        rawEmitters.push(rawEmitter);
        container = {
            listeners,
            rawEmitters,
            options,
            watcher: adone.std.fs.watchFile(fullPath, options, (curr, prev) => {
                // console.log("EVENT", fullPath);
                container.rawEmitters.forEach((rawEmitter) => {
                    rawEmitter("change", fullPath, { curr, prev });
                });
                const currmtime = curr.mtime.getTime();
                if (curr.size !== prev.size || currmtime > prev.mtime.getTime() || currmtime === 0) {
                    container.listeners.forEach((listener) => {
                        listener(path, curr);
                    });
                }
            })
        };
        FsWatchFileInstances.set(fullPath, container);
    } else {
        container.listeners.push(listener);
        container.rawEmitters.push(rawEmitter);
    }
    // removes this instance's listeners and closes the underlying fs.watchFile
    // instance if there are no more listeners left
    return () => {
        container.listeners.splice(container.listeners.indexOf(listener), 1);
        container.rawEmitters.splice(container.rawEmitters.indexOf(rawEmitter), 1);
        if (!container.listeners.length) {
            adone.std.fs.unwatchFile(fullPath);
            FsWatchFileInstances.delete(fullPath);
        }
    };
};

export default {
    /**
     * Handle added file, directory, or glob pattern.
     * Delegates call to _handleFile / _handleDir after checks.
     * 
     * @private
     * @param {string} path - path to file or directory.
     * @param {Boolean} initialAdd - was the file added at watch instantiation?
     * @param {Object} priorWh - common helpers 
     * @param {number} depth - depth relative to user-supplied path
     * @param {string} target - child path actually targeted for watch
     * @param {function} callback - indicates whether the path was found or not
     * @returns
     */
    _addToNodeFs(path, initialAdd, priorWh, depth, target, callback = adone.noop) {
        const ready = this._emitReady;
        if (this._isIgnored(path) || this.closed) {
            ready();
            return callback(null, false);
        }

        const wh = this._getWatchHelpers(path, depth);
        if (!wh.hasGlob && priorWh) {
            wh.hasGlob = priorWh.hasGlob;
            wh.globFilter = priorWh.globFilter;
            wh.filterPath = priorWh.filterPath;
            wh.filterDir = priorWh.filterDir;
        }

        // evaluate what is at the path we're being asked to watch
        adone.std.fs[wh.statMethod](wh.watchPath, (error, stats) => {
            if (this._handleError(error)) {
                return callback(null, path);
            }
            if (this._isIgnored(wh.watchPath, stats)) {
                ready();
                return callback(null, false);
            }

            const initDir = (dir, target) => this._handleDir(dir, stats, initialAdd, depth, target, wh, ready);

            let closer;
            if (stats.isDirectory()) {
                closer = initDir(wh.watchPath, target);
            } else if (stats.isSymbolicLink()) {
                const parent = adone.std.path.dirname(wh.watchPath);
                this._getWatchedDir(parent).add(wh.watchPath);
                this._emit("add", wh.watchPath, stats);
                closer = initDir(parent, path);

                // preserve this symlink's target path
                adone.std.fs.realpath(path, (error, targetPath) => {
                    this._symlinkPaths.set(adone.std.path.resolve(path), targetPath);
                    ready();
                });
            } else {
                closer = this._handleFile(wh.watchPath, stats, initialAdd, ready);
            }

            if (closer) {
                if (!this._closers.has(path)) {
                    this._closers.set(path, []);
                }
                this._closers.get(path).push(closer);
            }
            callback(null, false);
        });
    },
    /**
     * Read directory to add / remove files from `@watched` list
     * 
     * @private
     * @param {string} dir - fs path.
     * @param {Object} stats - result of fs.stat
     * @param {Boolean} initialAdd - was the file added at watch instantiation?
     * @param {number} depth - depth relative to user-supplied path
     * @param {string} target - child path actually targeted for watch
     * @param {object} wh - common watch helpers for this path
     * @param {function} callback - called when dir scan is complete
     * @returns {function} close function for the watcher instance
     */
    _handleDir(dir, stats, initialAdd, depth, target, wh, callback) {
        const parentDir = this._getWatchedDir(adone.std.path.dirname(dir));
        const tracked = parentDir.has(adone.std.path.basename(dir));
        if (!(initialAdd && this.options.ignoreInitial) && !target && !tracked) {
            if (!wh.hasGlob || wh.globFilter(dir)) {
                this._emit("addDir", dir, stats);
            }
        }

        // ensure dir is tracked (harmless if redundant)
        parentDir.add(adone.std.path.basename(dir));
        this._getWatchedDir(dir);

        const read = (directory, initialAdd, done) => {
            // Normalize the directory name on Windows
            directory = adone.std.path.join(directory, "");

            let throttler;
            if (!wh.hasGlob) {
                throttler = this._throttle("readdir", directory, 1000);
                if (!throttler) {
                    return;
                }
            }

            const previous = this._getWatchedDir(wh.path);
            const current = [];
            adone.std.fs[wh.statMethod](directory, (err) => {
                if (err) {
                    this._remove(adone.std.path.dirname(directory), adone.std.path.basename(directory));
                    return;
                }
                adone.util.readdir(directory, {
                    entryType: "all",
                    fileFilter: wh.filterPath,
                    directoryFilter: wh.filterDir,
                    depth: 0,
                    lstat: true
                }).each((entry) => {
                    const item = entry.path;
                    let path = adone.std.path.join(directory, item);
                    current.push(item);

                    if (entry.stat.isSymbolicLink() && this._handleSymlink(entry, directory, path, item)) {
                        return;
                    }

                    // Files that present in current directory snapshot
                    // but absent in previous are added to watch list and
                    // emit `add` event.
                    if (item === target || !target && !previous.has(item)) {
                        this._readyCount++;

                        // ensure relativeness of path is preserved in case of watcher reuse
                        path = adone.std.path.join(dir, adone.std.path.relative(dir, path));

                        this._addToNodeFs(path, initialAdd, wh, depth + 1);
                    }
                }).on("error", (err) => {
                    this._handleError(err);
                }).done(() => {
                    if (throttler) {
                        throttler.clear();
                    }
                    if (done) {
                        done();
                    }

                    // Files that absent in current directory snapshot
                    // but present in previous emit `remove` event
                    // and are removed from @watched[directory].
                    previous.children().filter((item) => {
                        return item !== directory &&
                            current.indexOf(item) === -1 &&
                            // in case of intersecting globs;
                            // a path may have been filtered out of this readdir, but
                            // shouldn't be removed because it matches a different glob
                            (!wh.hasGlob || wh.filterPath({
                                fullPath: adone.std.path.resolve(directory, item)
                            }));
                    }).forEach((item) => {
                        this._remove(directory, item);
                    });
                });
            });
        };

        let closer;

        if (this.options.depth == null || depth <= this.options.depth) {
            if (!target) {
                read(dir, initialAdd, callback);
            }
            closer = this._watchWithNodeFs(dir, (dirPath, stats) => {
                // if current directory is removed, do nothing
                if (stats && stats.mtime.getTime() === 0) {
                    return;
                }

                read(dirPath, false);
            });
        } else {
            callback();
        }
        return closer;
    },
    /**
     * Handle symlinks encountered while reading a dir
     * 
     * @private
     * @param {Object} entry - entry object returned by readdirp
     * @param {string} directory - path of the directory being read
     * @param {string} path - path of this item
     * @param {string} item - basename of this item
     * @returns {Boolean} true if no more processing is needed for this entry.
     */
    _handleSymlink(entry, directory, path, item) {
        const full = entry.fullPath;
        const dir = this._getWatchedDir(directory);

        if (!this.options.followSymlinks) {
            // watch symlink directly (don't follow) and detect changes
            this._readyCount++;
            adone.std.fs.realpath(path, (error, linkPath) => {
                if (dir.has(item)) {
                    if (this._symlinkPaths.get(full) !== linkPath) {
                        this._symlinkPaths.set(full, linkPath);
                        this._emit("change", path, entry.stat);
                    }
                } else {
                    dir.add(item);
                    this._symlinkPaths.set(full, linkPath);
                    this._emit("add", path, entry.stat);
                }
                this._emitReady();
            });
            return true;
        }

        // don't follow the same symlink more than once
        if (this._symlinkPaths.has(full)) {
            return true;
        }
        this._symlinkPaths.set(full, true);
    },
    /**
     * Watch a file and emit add event if warranted
     * 
     * @private
     * @param {string} file - the file's path
     * @param {Object} stats - result of fs.stat
     * @param {Boolean} initialAdd - was the file added at watch instantiation?
     * @param {function} callback - called when done processing as a newly seen file
     * @returns {function} close function for the watcher instance
     */
    _handleFile(file, stats, initialAdd, callback) {
        const dirname = adone.std.path.dirname(file);
        const basename = adone.std.path.basename(file);
        const parent = this._getWatchedDir(dirname);

        // if the file is already being watched, do nothing
        if (parent.has(basename)) {
            return callback();
        }

        // kick off the watcher
        const closer = this._watchWithNodeFs(file, (path, newStats) => {
            if (!this._throttle("watch", file, 5)) {
                return;
            }
            if (!newStats || newStats && newStats.mtime.getTime() === 0) {
                adone.std.fs.stat(file, (error, newStats) => {
                    // Fix issues where mtime is null but file is still present
                    if (error) {
                        this._remove(dirname, basename);
                    } else {
                        this._emit("change", file, newStats);
                    }
                });
                // add is about to be emitted if file not already tracked in parent
            } else if (parent.has(basename)) {
                this._emit("change", file, newStats);
            }
        });

        // emit an add event if we're supposed to
        if (!(initialAdd && this.options.ignoreInitial)) {
            if (!this._throttle("add", file, 0)) {
                return;
            }
            this._emit("add", file, stats);
        }

        if (callback) {
            callback();
        }
        return closer;
    },
    /**
     * Watch file for changes with fs.watchFile or fs.watch.
     * 
     * @private
     * @param {string} path - path to file or directory.
     * @param {function} listener - to be executed on fs change.
     * @returns {function} close function for the watcher instance
     */
    _watchWithNodeFs(path, listener = adone.noop) {
        const directory = adone.std.path.dirname(path);
        const basename = adone.std.path.basename(path);
        const parent = this._getWatchedDir(directory);
        parent.add(basename);
        const absolutePath = adone.std.path.resolve(path);
        const options = { persistent: this.options.persistent };

        let closer;
        if (this.options.usePolling) {
            options.interval = this.enableBinaryInterval && adone.is.binaryPath(basename) ? this.options.binaryInterval : this.options.interval;
            closer = setFsWatchFileListener(path, absolutePath, options, {
                listener,
                rawEmitter: (...args) => this.emit("raw", ...args)
            });
        } else {
            closer = setFsWatchListener(path, absolutePath, options, {
                listener,
                errHandler: (er) => this._handleError(er),
                rawEmitter: (...args) => this.emit("raw", ...args)
            });
        }
        return closer;
    }
};
