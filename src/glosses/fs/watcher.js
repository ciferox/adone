const { is } = adone;

// fsevents

let FSEvents;
try {
    FSEvents = adone.fsevents;
} catch (error) {
    //
}

// object to hold per-process fsevents instances (may be shared across Watcher instances)
const FSEventsWatchers = new Map();

// Threshold of duplicate path prefixes at which to start consolidating going forward
const consolidateThreshhold = 10;

/**
 * Decide whether or not we should start a new higher-level parent watcher
 *
 * @param {string} path
 * @returns {Boolean}
 */
const couldConsolidate = (path) => {
    let count = 0;

    for (const watchPath of FSEventsWatchers.keys()) {
        if (!watchPath.indexOf(path)) {
            ++count;
            if (count >= consolidateThreshhold) {
                return true;
            }
        }
    }
    return false;
};

/**
 * Instantiates the fsevents interface
 *
 * @private
 * @param {string} path - path to be watched
 * @param {function} callback - called when fsevents is bound and ready
 * @returns {object} new fsevents instance
 */
const createFSEventsInstance = (path, callback) => new FSEvents(path).on("fsevent", callback).start();

/**
 * Instantiates the fsevents interface or binds listeners to an existing one covering the same file tree
 *
 * @private
 * @param {string} path - path to be watched
 * @param {string} realPath - real path (in case of symlinks)
 * @param {function} listener - called when fsevents emits events
 * @param {function} rawEmitter - passes data to listeners of the "raw" event
 * @returns {function} close function
 */
const setFSEventsListener = (path, realPath, listener, rawEmitter) => {
    let watchPath = adone.std.path.extname(path) ? adone.std.path.dirname(path) : path;
    let watchContainer;
    const parentPath = adone.std.path.dirname(watchPath);

    // If we've accumulated a substantial number of paths that
    // could have been consolidated by watching one directory
    // above the current one, create a watcher on the parent
    // path instead, so that we do consolidate going forward.
    if (couldConsolidate(parentPath)) {
        watchPath = parentPath;
    }

    const resolvedPath = adone.std.path.resolve(path);
    const hasSymlink = resolvedPath !== realPath;
    const filteredListener = (fullPath, flags, info) => {
        if (hasSymlink) {
            fullPath = fullPath.replace(realPath, resolvedPath);
        }
        if (fullPath === resolvedPath || !fullPath.indexOf(resolvedPath + adone.std.path.sep)) {
            listener(fullPath, flags, info);
        }
    };

    // check if there is already a watcher on a parent path
    // modifies `watchPath` to the parent path when it finds a match
    const watchedParent = () => [...FSEventsWatchers.keys()].some((watchedPath) => {
        // condition is met when indexOf returns 0
        if (!realPath.indexOf(adone.std.path.resolve(watchedPath) + adone.std.path.sep)) {
            watchPath = watchedPath;
            return true;
        }
        return false;
    });

    if (FSEventsWatchers.has(watchPath) || watchedParent()) {
        watchContainer = FSEventsWatchers.get(watchPath);
        watchContainer.listeners.push(filteredListener);
    } else {
        watchContainer = {
            listeners: [filteredListener],
            rawEmitters: [rawEmitter],
            watcher: createFSEventsInstance(watchPath, (fullPath, flags) => {
                const info = FSEvents.getInfo(fullPath, flags);
                watchContainer.listeners.forEach((listener) => listener(fullPath, flags, info));
                watchContainer.rawEmitters.forEach((emitter) => emitter(info.event, fullPath, info));
            })
        };
        FSEventsWatchers.set(watchPath, watchContainer);
    }
    const listenerIndex = watchContainer.listeners.length - 1;

    // removes this instance's listeners and closes the underlying fsevents
    // instance if there are no more listeners left
    return () => {
        delete watchContainer.listeners[listenerIndex];
        delete watchContainer.rawEmitters[listenerIndex];
        if (!watchContainer.listeners.length) {
            watchContainer.watcher.stop();
            FSEventsWatchers.delete(watchPath);
        }
    };
};

/**
 * determines subdirectory traversal levels from root to path
 *
 * @param {string} path
 * @param {string} root
 * @returns {number}
 */
const depth = (path, root) => {
    let i = 0;
    while (!path.indexOf(root) && (path = adone.std.path.dirname(path)) !== root) {
        i++;
    }
    return i;
};

/**
 * indicating whether fsevents can be used
 *
 * @returns {Boolean}
 */
const canUseFSEvents = () => FSEvents && [...FSEventsWatchers.keys()].length < 128;

const FSEventsHandler = {
    /**
     * Handle symlinks encountered during directory scan
     *
     * @private
     * @param {string} watchPath - file/dir path to be watched with fsevents
     * @param {string} realPath - real path (in case of symlinks)
     * @param {function} transform - path transformer
     * @param {function} globFilter - path filter in case a glob pattern was provided
     * @returns {function} close function for the watcher instance
     */
    _watchWithFsEvents(watchPath, realPath, transform, globFilter) {
        if (this._isIgnored(watchPath)) {
            return;
        }
        const watchCallback = (fullPath, flags, info) => {
            if (!is.undefined(this.options.depth) && depth(fullPath, realPath) > this.options.depth) {
                return;
            }
            const path = transform(adone.std.path.join(watchPath, adone.std.path.relative(watchPath, fullPath)));
            if (globFilter && !globFilter(path)) {
                return;
            }
            // ensure directories are tracked
            const parent = adone.std.path.dirname(path);
            const item = adone.std.path.basename(path);
            const watchedDir = this._getWatchedDir(info.type === "directory" ? path : parent);
            const checkIgnored = (stats) => {
                if (this._isIgnored(path, stats)) {
                    this._ignoredPaths.add(path);
                    if (stats && stats.isDirectory()) {
                        this._ignoredPaths.add(`${path}/**/*`);
                    }
                    return true;
                }
                this._ignoredPaths.delete(path);
                this._ignoredPaths.delete(`${path}/**/*`);

            };

            const handleEvent = (event) => {
                if (checkIgnored()) {
                    return;
                }

                if (event === "unlink") {
                    // suppress unlink events on never before seen files
                    if (info.type === "directory" || watchedDir.has(item)) {
                        this._remove(parent, item);
                    }
                } else {
                    if (event === "add") {
                        // track new directories
                        if (info.type === "directory") {
                            this._getWatchedDir(path);
                        }

                        if (info.type === "symlink" && this.options.followSymlinks) {
                            // push symlinks back to the top of the stack to get handled
                            const curDepth = is.undefined(this.options.depth) ? undefined : depth(fullPath, realPath) + 1;
                            return this._addToFsEvents(path, false, true, curDepth);
                        }
                        // track new paths
                        // (other than symlinks being followed, which will be tracked soon)
                        this._getWatchedDir(parent).add(item);

                    }
                    const eventName = info.type === "directory" ? `${event}Dir` : event;
                    this._emit(eventName, path);
                    if (eventName === "addDir") {
                        this._addToFsEvents(path, false, true);
                    }
                }
            };

            const addOrChange = () => handleEvent(watchedDir.has(item) ? "change" : "add");
            const checkFd = () => {
                adone.std.fs.open(path, "r", (error, fd) => {
                    if (fd) {
                        adone.std.fs.close(fd, adone.noop);
                    }
                    error && error.code !== "EACCES" ? handleEvent("unlink") : addOrChange();
                });
            };
            // correct for wrong events emitted
            const wrongEventFlags = [69888, 70400, 71424, 72704, 73472, 131328, 131840, 262912];
            if (wrongEventFlags.indexOf(flags) !== -1 || info.event === "unknown") {
                if (adone.is.function(this.options.ignored)) {
                    adone.std.fs.stat(path, (error, stats) => {
                        if (checkIgnored(stats)) {
                            return;
                        }
                        stats ? addOrChange() : handleEvent("unlink");
                    });
                } else {
                    checkFd();
                }
            } else {
                switch (info.event) {
                    case "created":
                    case "modified":
                        return addOrChange();
                    case "deleted":
                    case "moved":
                        return checkFd();
                }
            }
        };

        const closer = setFSEventsListener(watchPath, realPath, watchCallback, (...args) => this.emit("raw", ...args));
        this._emitReady();
        return closer;
    },
    /**
     * Handle added path with fsevents
     *
     * @private
     * @param {string} path - file/directory path or glob pattern
     * @param {function} transform - converts working path to what the user expects
     * @param {Boolean} forceAdd - ensure add is emitted
     * @param {number} priorDepth - level of subdirectories already traversed
     */
    _addToFsEvents(path, transform, forceAdd, priorDepth) {

        // applies transform if provided, otherwise returns same value
        const processPath = adone.is.function(transform) ? transform : (x) => x;

        const emitAdd = (newPath, stats) => {
            const pp = processPath(newPath);
            const isDir = stats.isDirectory();
            const dirObj = this._getWatchedDir(adone.std.path.dirname(pp));
            const base = adone.std.path.basename(pp);

            // ensure empty dirs get tracked
            if (isDir) {
                this._getWatchedDir(pp);
            }

            if (dirObj.has(base)) {
                return;
            }
            dirObj.add(base);

            if (!this.options.ignoreInitial || forceAdd === true) {
                this._emit(isDir ? "addDir" : "add", pp, stats);
            }
        };

        const wh = this._getWatchHelpers(path);

        // evaluate what is at the path we're being asked to watch
        adone.std.fs[wh.statMethod](wh.watchPath, (error, stats) => {
            if (this._handleError(error) || this._isIgnored(wh.watchPath, stats)) {
                this._emitReady();
                return this._emitReady();
            }

            if (stats.isDirectory()) {
                // emit addDir unless this is a glob parent
                if (!wh.globFilter) {
                    emitAdd(processPath(path), stats);
                }

                // don't recurse further if it would exceed depth setting
                if (priorDepth && priorDepth > this.options.depth) {
                    return;
                }

                // scan the contents of the dir
                adone.util.readdir(wh.watchPath, {
                    entryType: "all",
                    fileFilter: wh.filterPath,
                    directoryFilter: wh.filterDir,
                    lstat: true,
                    depth: this.options.depth - (priorDepth || 0)
                }).each((entry) => {
                    // need to check filterPath on dirs b/c filterDir is less restrictive
                    if (entry.stat.isDirectory() && !wh.filterPath(entry)) {
                        return;
                    }

                    const joinedPath = adone.std.path.join(wh.watchPath, entry.path);
                    const fullPath = entry.fullPath;

                    if (wh.followSymlinks && entry.stat.isSymbolicLink()) {
                        // preserve the current depth here since it can't be derived from
                        // real paths past the symlink
                        const curDepth = is.undefined(this.options.depth) ? undefined : depth(joinedPath, adone.std.path.resolve(wh.watchPath)) + 1;
                        this._handleFsEventsSymlink(joinedPath, fullPath, processPath, curDepth);
                    } else {
                        emitAdd(joinedPath, entry.stat);
                    }
                }).on("error", (err) => {
                    this._handleError(err);
                }).done(() => {
                    this._emitReady();
                });
            } else {
                emitAdd(wh.watchPath, stats);
                this._emitReady();
            }
        });

        if (this.options.persistent && forceAdd !== true) {
            const initWatch = (error, realPath) => {
                const closer = this._watchWithFsEvents(
                    wh.watchPath,
                    adone.std.path.resolve(realPath || wh.watchPath),
                    processPath,
                    wh.globFilter
                );
                if (closer) {
                    if (!this._closers.has(path)) {
                        this._closers.set(path, []);
                    }
                    this._closers.get(path).push(closer);
                }
            };

            if (adone.is.function(transform)) {
                // realpath has already been resolved
                initWatch();
            } else {
                adone.std.fs.realpath(wh.watchPath, initWatch);
            }
        }
    },
    /**
     * Handle symlinks encountered during directory scan
     *
     * @private
     * @param {string} linkPath - path to symlink
     * @param {string} fullPath - absolute path to the symlink
     * @param {function} transform - pre-existing path transformer
     * @param {number} curDepth - level of subdirectories traversed to where symlink is
     * @returns
     */
    _handleFsEventsSymlink(linkPath, fullPath, transform, curDepth) {
        // don't follow the same symlink more than once
        if (this._symlinkPaths.has(fullPath)) {
            return;
        }
        this._symlinkPaths.set(fullPath, true);


        this._readyCount++;

        adone.std.fs.realpath(linkPath, (error, linkTarget) => {
            if (this._handleError(error) || this._isIgnored(linkTarget)) {
                return this._emitReady();
            }

            this._readyCount++;

            // add the linkTarget for watching with a wrapper for transform
            // that causes emitted paths to incorporate the link's path
            this._addToFsEvents(linkTarget || linkPath, (path) => {
                const dotSlash = `.${adone.std.path.sep}`;
                let aliasedPath = linkPath;
                if (linkTarget && linkTarget !== dotSlash) {
                    aliasedPath = path.replace(linkTarget, linkPath);
                } else if (path !== dotSlash) {
                    aliasedPath = adone.std.path.join(linkPath, path);
                }
                return transform(aliasedPath);
            }, false, curDepth);
        });
    }
};

///////////


const dotRe = /\..*\.(sw[px])$|\~$|\.subl.*\.tmp/;
const replacerRe = /^\.[\/\\]/;



// object to hold per-process fs.watch instances
// (may be shared across Watcher instances)
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
            if (is.windows && error.code === "EPERM") {
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
// (may be shared across Watcher instances)
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

export default class Watcher extends adone.event.EventEmitter {
    constructor({
        persistent = true,
        ignoreInitial = false,
        ignorePermissionErrors = false,
        interval = 100,
        binaryInterval = 300,
        disableGlobbing = false,
        useFsEvents = null,
        usePolling = null,
        atomic = null,
        followSymlinks = true,
        awaitWriteFinish = false,
        ignored = [],
        alwaysStat = false,
        depth,
        cwd
    } = {}) {
        super();
        this._watched = new Map();
        this._closers = new Map();
        this._ignoredPaths = new Set();
        this._throttled = new Map();
        this._symlinkPaths = new Map();

        this.closed = false;

        this.enableBinaryInterval = binaryInterval !== interval;

        // Enable fsevents on OS X when polling isn't explicitly enabled.
        if (is.null(useFsEvents)) {
            useFsEvents = !usePolling;
        }
        // If we can't use fsevents, ensure the options reflect it's disabled.
        if (!canUseFSEvents()) {
            useFsEvents = false;
        }

        // Use polling on Mac if not using fsevents.
        // Other platforms use non-polling fs.watch.
        if (is.null(usePolling) && !useFsEvents) {
            usePolling = is.darwin;
        }

        // Editor atomic write normalaization enabled by default with fs.watch
        if (is.null(atomic)) {
            atomic = !usePolling && useFsEvents;
        }
        if (atomic) {
            this._pendingUnlinks = Object.create(null);
        }

        if (awaitWriteFinish) {
            const { stabilityThreshold = 2000, pollInterval = 100 } = awaitWriteFinish;
            awaitWriteFinish = { stabilityThreshold, pollInterval };
            this._pendingWrites = Object.create(null);
        }

        ignored = adone.util.arrify(ignored);

        this._isntIgnored = (path, stat) => !this._isIgnored(path, stat);

        let readyCalls = 0;
        this._emitReady = () => {
            if (++readyCalls >= this._readyCount) {
                this._emitReady = adone.noop;
                this._readyEmitted = true;
                // use process.nextTick to allow time for listener to be bound
                process.nextTick(() => this.emit("ready"));
            }
        };

        this.options = {
            persistent,
            ignoreInitial,
            ignorePermissionErrors,
            interval,
            binaryInterval,
            disableGlobbing,
            useFsEvents,
            usePolling,
            atomic,
            followSymlinks,
            awaitWriteFinish,
            ignored,
            alwaysStat,
            depth,
            cwd
        };
    }

    get _globIgnored() {
        return [...this._ignoredPaths.keys()];
    }

    /**
     * Adds paths to be watched on an existing Watcher instance
     *
     * @public
     * @param {string|string[]} paths - file/directory paths and/or globs
     * @param {Boolean} _origAdd - internal param for handling non-existent paths to be watched
     * @param {Boolean} _internal - interv param indicates a non-user add
     * @returns {this}
     *
     * @memberOf Watcher
     */
    add(paths, _origAdd, _internal) {
        const { cwd } = this.options;
        this.closed = false;
        paths = adone.util.flatten(adone.util.arrify(paths));

        if (!paths.every(adone.is.string)) {
            throw new TypeError(`Non-string provided as watch path: ${paths}`);
        }

        if (cwd) {
            paths = paths.map((path) => {
                if (adone.std.path.isAbsolute(path)) {
                    return path;
                } else if (path[0] === "!") {
                    return `!${adone.std.path.join(cwd, path.substring(1))}`;
                }
                return adone.std.path.join(cwd, path);

            });
        }

        // set aside negated glob strings
        paths = paths.filter((path) => {
            if (path[0] === "!") {
                this._ignoredPaths.add(path.substring(1));
            } else {
                // if a path is being added that was previously ignored, stop ignoring it
                this._ignoredPaths.delete(path);
                delete this._ignoredPaths.delete(`${path}/**`);

                // reset the cached userIgnored anymatch fn
                // to make ignoredPaths changes effective
                this._userIgnored = null;

                return true;
            }
            return false;
        });

        if (this.options.useFsEvents && canUseFSEvents()) {
            if (!this._readyCount) {
                this._readyCount = paths.length;
            }
            if (this.options.persistent) {
                this._readyCount *= 2;
            }
            for (const path of paths) {
                this._addToFsEvents(path);
            }
        } else {
            if (!this._readyCount) {
                this._readyCount = 0;
            }
            this._readyCount += paths.length;
            Promise.all(paths.map((path) => {
                return new Promise((resolve) => {
                    this._addToNodeFs(path, !_internal, 0, 0, _origAdd, (err, res) => {
                        if (res) {
                            this._emitReady();
                        }
                        resolve(err ? null : res);
                    });
                });
            })).then((results) => {
                for (const item of results) {
                    if (!item) {
                        continue;
                    }
                    this.add(adone.std.path.dirname(item), adone.std.path.basename(_origAdd || item));
                }
            });
        }

        return this;
    }

    /**
     * Close watchers or start ignoring events from specified paths.
     *
     * @public
     * @param {string|string[]} paths file/directory paths and/or globs
     * @returns {this}
     *
     * @memberOf Watcher
     */
    unwatch(paths) {
        if (this.closed) {
            return this;
        }
        paths = adone.util.flatten(adone.util.arrify(paths));

        paths.forEach((path) => {
            // convert to absolute path unless relative path already matches
            if (!adone.std.path.isAbsolute(path) && !this._closers.has(path)) {
                if (this.options.cwd) {
                    path = adone.std.path.join(this.options.cwd, path);
                }
                path = adone.std.path.resolve(path);
            }

            this._closePath(path);

            this._ignoredPaths.add(path);
            if (this._watched.has(path)) {
                this._ignoredPaths.add(`${path}/**`);
            }

            // reset the cached userIgnored anymatch fn
            // to make ignoredPaths changes effective
            this._userIgnored = null;
        });

        return this;
    }

    /**
     * Close watchers and remove all listeners from watched paths.
     *
     * @public
     * @returns {this}
     *
     * @memberOf Watcher
     */
    close() {
        if (this.closed) {
            return this;
        }

        this.closed = true;
        for (const [watchPath, closers] of this._closers.entries()) {
            for (const closer of closers) {
                closer();
            }
            this._closers.delete(watchPath);
        }
        this._watched.clear();

        this.removeAllListeners();
        return this;
    }

    /**
     * Expose list of watched paths
     *
     * @public
     * @returns {Object.<string, ...string[]>} object with dir paths as keys and arrays of contained paths as values
     *
     * @memberOf Watcher
     */
    getWatched() {
        const watchList = {};
        for (const [dir, list] of this._watched.entries()) {
            const key = this.options.cwd ? adone.std.path.relative(this.options.cwd, dir) : dir;
            watchList[key || "."] = adone.util.keys(list._items).sort();
        }
        return watchList;
    }

    /**
     * Normalize and emit events
     *
     * @private
     * @param {string} event - the type of an event
     * @param {string} path - the path of a file or a directory
     * @param {...any} vals - an event arguments
     * @returns {this}
     *
     * @memberOf Watcher
     */
    _emit(event, path, ...vals) {
        if (this.options.cwd) {
            path = adone.std.path.relative(this.options.cwd, path);
        }
        const args = [event, path, ...vals];

        const awf = this.options.awaitWriteFinish;
        if (awf && this._pendingWrites[path]) {
            this._pendingWrites[path].lastChange = new Date();
            return this;
        }

        if (this.options.atomic) {
            if (event === "unlink") {
                this._pendingUnlinks[path] = args;
                setTimeout(() => {
                    Object.keys(this._pendingUnlinks).forEach((path) => {
                        this.emit(...this._pendingUnlinks[path]);
                        this.emit("all", ...this._pendingUnlinks[path]);
                        delete this._pendingUnlinks[path];
                    });
                }, adone.is.number(this.options.atomic) ? this.options.atomic : 100);
                return this;
            } else if (event === "add" && this._pendingUnlinks[path]) {
                event = args[0] = "change";
                delete this._pendingUnlinks[path];
            }
        }

        const emitEvent = () => {
            this.emit(...args);
            if (event !== "error") {
                this.emit("all", ...args);
            }
        };

        if (awf && (event === "add" || event === "change") && this._readyEmitted) {
            const awfEmit = (err, stats) => {
                if (err) {
                    event = args[0] = "error";
                    args[1] = err;
                    emitEvent();
                } else if (stats) {
                    // if stats doesn't exist the file must have been deleted
                    if (args.length > 2) {
                        args[2] = stats;
                    } else {
                        args.push(stats);
                    }
                    emitEvent();
                }
            };

            this._awaitWriteFinish(path, awf.stabilityThreshold, event, awfEmit);
            return this;
        }

        if (event === "change") {
            if (!this._throttle("change", path, 50)) {
                return this;
            }
        }

        if (this.options.alwaysStat && vals.length === 0 && (event === "add" || event === "addDir" || event === "change")) {
            const fullPath = this.options.cwd ? adone.std.path.join(this.options.cwd, path) : path;
            adone.std.fs.stat(fullPath, (error, stats) => {
                // Suppress event when fs.stat fails, to avoid sending undefined "stat"
                if (error || !stats) {
                    return;
                }

                args.push(stats);
                emitEvent();
            });
        } else {
            emitEvent();
        }

        return this;
    }

    /**
     * Common handler for errors
     *
     * @private
     * @param {Error}
     * @returns {Error|Boolean} the error if defined, otherwise the value of the Watcher instance's `closed` flag
     *
     * @memberOf Watcher
     */
    _handleError(error) {
        const code = error && error.code;
        const ipe = this.options.ignorePermissionErrors;
        if (error && code !== "ENOENT" && code !== "ENOTDIR" && (!ipe || (code !== "EPERM" && code !== "EACCES"))) {
            this.emit("error", error);
        }
        return error || this.closed;
    }

    /**
     * Helper utility for throttling
     *
     * @private
     * @param {string} action - type of action being throttled
     * @param {string} path - path being acted upon
     * @param {number} timeout - the duration of time to suppress duplicate actions (ms)
     * @returns {Object|Boolean} throttle tracking object or false if action should be suppressed
     *
     * @memberOf Watcher
     */
    _throttle(action, path, timeout) {
        if (!this._throttled.has(action)) {
            this._throttled.set(action, new Map());
        }
        const throttled = this._throttled.get(action);
        let timeoutObject = null;
        if (throttled.has(path)) {
            return false;
        }
        const clear = () => {
            throttled.delete(path);
            clearTimeout(timeoutObject);
        };

        timeoutObject = setTimeout(clear, timeout);
        const value = { timeoutObject, clear };
        throttled.set(path, value);
        return value;
    }

    /**
     * Awaits write operation to finish
     *
     * Polls a newly created file for size variations. When files size does not
     * change for "threshold" milliseconds calls callback.
     * @private
     * @param {string} path - path being acted on
     * @param {number} threshold - time in milliseconds a file size must be fixed before acknowledgeing write operation is finished
     * @param {string} event
     * @param {function} awfEmit - function, to be called when ready for event to be emitted
     *
     * @memberOf Watcher
     */
    _awaitWriteFinish(path, threshold, event, awfEmit) {
        let timeoutHandler;

        let fullPath = path;
        if (this.options.cwd && !adone.std.path.isAbsolute(path)) {
            fullPath = adone.std.path.join(this.options.cwd, path);
        }

        const now = new Date();

        const awaitWriteFinish = (prevStat) => {
            adone.std.fs.stat(fullPath, (err, curStat) => {
                if (err) {
                    if (err.code !== "ENOENT") {
                        awfEmit(err);
                    }
                    return;
                }

                const now = new Date();

                if (prevStat && curStat.size !== prevStat.size) {
                    this._pendingWrites[path].lastChange = now;
                }

                if (now - this._pendingWrites[path].lastChange >= threshold) {
                    delete this._pendingWrites[path];
                    awfEmit(null, curStat);
                } else {
                    timeoutHandler = setTimeout(() => awaitWriteFinish(curStat), this.options.awaitWriteFinish.pollInterval);
                }
            });
        };

        if (!(path in this._pendingWrites)) {
            this._pendingWrites[path] = {
                lastChange: now,
                cancelWait: () => {
                    delete this._pendingWrites[path];
                    clearTimeout(timeoutHandler);
                    return event;
                }
            };
            timeoutHandler = setTimeout((x) => awaitWriteFinish(x), this.options.awaitWriteFinish.pollInterval);
        }
    }

    /**
     * Determines whether user has asked to ignore this path
     *
     * @private
     * @param {string} path - path to file or Directory
     * @param {Object} stats - result of fs.stat
     * @returns {Boolean}
     *
     * @memberOf Watcher
     */
    _isIgnored(path, stats) {
        if (this.options.atomic && dotRe.test(path)) {
            return true;
        }

        if (!this._userIgnored) {
            const cwd = this.options.cwd;
            let ignored = this.options.ignored;
            if (cwd && ignored) {
                ignored = ignored.map((path) => {
                    if (!is.string(path)) {
                        return path;
                    }
                    return adone.std.path.isAbsolute(path) ? path : adone.std.path.join(cwd, path);
                });
            }
            const paths = adone.util.arrify(ignored)
                .filter((path) => adone.is.string(path) && !adone.is.glob(path))
                .map((path) => `${path}/**`);

            this._userIgnored = adone.util.match([...this._globIgnored, ...ignored, ...paths]);
        }

        return this._userIgnored([path, stats]);
    }

    /**
     * Provides a set of common helpers and properties relating to
     * symlink and glob handling
     *
     * @private
     * @param {string} path - file, directory, or glob pattern being watched
     * @param {number} depth - at any depth > 0, this isn't a glob
     * @returns {Object}
     *
     * @memberOf Watcher
     */
    _getWatchHelpers(path, depth) {
        path = path.replace(replacerRe, "");
        const watchPath = depth || this.options.disableGlobbing || !adone.is.glob(path) ? path : adone.util.globParent(path);
        const fullWatchPath = adone.std.path.resolve(watchPath);
        const hasGlob = watchPath !== path;
        const globFilter = hasGlob ? adone.util.match(path) : false;
        const follow = this.options.followSymlinks;
        let globSymlink = hasGlob && follow ? null : false;

        const checkGlobSymlink = (entry) => {
            // only need to resolve once
            // first entry should always have entry.parentDir === ""
            if (is.nil(globSymlink)) {
                globSymlink = entry.fullParentDir === fullWatchPath ? false : {
                    realPath: entry.fullParentDir,
                    linkPath: fullWatchPath
                };
            }

            if (globSymlink) {
                return entry.fullPath.replace(globSymlink.realPath, globSymlink.linkPath);
            }

            return entry.fullPath;
        };

        const entryPath = (entry) => adone.std.path.join(watchPath, adone.std.path.relative(watchPath, checkGlobSymlink(entry)));
        let filterDir = null;
        const filterPath = (entry) => {
            if (entry.stat && entry.stat.isSymbolicLink()) {
                return filterDir(entry);
            }
            const resolvedPath = entryPath(entry);
            return (!hasGlob || globFilter(resolvedPath)) && this._isntIgnored(resolvedPath, entry.stat) && (this.options.ignorePermissionErrors || this._hasReadPermissions(entry.stat));
        };

        const getDirParts = (path) => !hasGlob ? false : adone.std.path.relative(watchPath, path).split(/[\/\\]/);

        const dirParts = getDirParts(path);
        if (dirParts && dirParts.length > 1) {
            dirParts.pop();
        }
        let unmatchedGlob;

        filterDir = (entry) => {
            if (hasGlob) {
                const entryParts = getDirParts(checkGlobSymlink(entry));
                let globstar = false;
                unmatchedGlob = !dirParts.every((part, i) => {
                    if (part === "**") {
                        globstar = true;
                    }
                    return globstar || !entryParts[i] || adone.util.match(part, entryParts[i]);
                });
            }
            return !unmatchedGlob && this._isntIgnored(entryPath(entry), entry.stat);
        };

        return {
            followSymlinks: follow,
            statMethod: follow ? "stat" : "lstat",
            path, watchPath, entryPath,
            hasGlob,
            globFilter, filterPath, filterDir
        };
    }

    /**
     * Provides directory tracking objects
     *
     * @private
     * @param {string} directory - path of the directory
     * @returns {Object} the directory's tracking object
     * @memberOf Watcher
     */
    _getWatchedDir(directory) {
        const dir = adone.std.path.resolve(directory);
        const watcherRemove = (...args) => this._remove(...args);
        if (!this._watched.has(dir)) {
            this._watched.set(dir, {
                _items: Object.create(null),
                add(item) {
                    if (item !== "." && item !== "..") {
                        this._items[item] = true;
                    }
                },
                remove(item) {
                    delete this._items[item];
                    if (!this.children().length) {
                        adone.std.fs.readdir(dir, (err) => {
                            if (err) {
                                watcherRemove(adone.std.path.dirname(dir), adone.std.path.basename(dir));
                            }
                        });
                    }
                },
                has(item) {
                    return item in this._items;
                },
                children() {
                    return Object.keys(this._items);
                }
            });
        }
        return this._watched.get(dir);
    }

    /**
     * Check for read permissions
     * Based on this answer on SO: http://stackoverflow.com/a/11781404/1358405
     *
     * @private
     * @param {Object} stats - result of fs.stat
     * @returns {Boolean}
     *
     * @memberOf Watcher
     */
    _hasReadPermissions(stats) {
        return Boolean(4 & parseInt(((stats && stats.mode) & 0x1ff).toString(8)[0], 10));
    }

    /**
     * Handles emitting unlink events for
     * files and directories, and via recursion, for
     * files and directories within directories that are unlinked
     *
     * @private
     * @param {string} directory - directory within which the following item is located
     * @param {any} item - base path of item/directory
     *
     * @memberOf Watcher
     */
    _remove(directory, item) {
        // if what is being deleted is a directory, get that directory's paths
        // for recursive deleting and cleaning of watched object
        // if it is not a directory, nestedDirectoryChildren will be empty array
        const path = adone.std.path.join(directory, item);
        const fullPath = adone.std.path.resolve(path);
        const isDirectory = this._watched.get(this._watched.has(path) ? path : fullPath);

        // prevent duplicate handling in case of arriving here nearly simultaneously
        // via multiple paths (such as _handleFile and _handleDir)
        if (!this._throttle("remove", path, 100)) {
            return;
        }

        // if the only watched file is removed, watch for its return
        const watchedDirs = [...this._watched.keys()];
        if (!isDirectory && !this.options.useFsEvents && watchedDirs.length === 1) {
            this.add(directory, item, true);
        }

        // This will create a new entry in the watched object in either case
        // so we got to do the directory check beforehand
        const nestedDirectoryChildren = this._getWatchedDir(path).children();

        // Recursively remove children directories / files.
        for (const nestedItem of nestedDirectoryChildren) {
            this._remove(path, nestedItem);
        }
        // Check if item was on the watched list and remove it
        const parent = this._getWatchedDir(directory);
        const wasTracked = parent.has(item);
        parent.remove(item);

        // If we wait for this file to be fully written, cancel the wait.
        let relPath = path;
        if (this.options.cwd) {
            relPath = adone.std.path.relative(this.options.cwd, path);
        }
        if (this.options.awaitWriteFinish && this._pendingWrites[relPath]) {
            const event = this._pendingWrites[relPath].cancelWait();
            if (event === "add") {
                return;
            }
        }

        // The Entry will either be a directory that just got removed
        // or a bogus entry to a file, in either case we have to remove it
        this._watched.delete(path);
        const eventName = isDirectory ? "unlinkDir" : "unlink";
        if (wasTracked && !this._isIgnored(path)) {
            this._emit(eventName, path);
        }

        // Avoid conflicts if we later create another file with the same name
        if (!this.options.useFsEvents) {
            this._closePath(path);
        }
    }

    _closePath(path) {
        if (!this._closers.has(path)) {
            return;
        }
        this._closers.get(path).forEach((x) => x());
        this._closers.delete(path);
        this._getWatchedDir(adone.std.path.dirname(path)).remove(adone.std.path.basename(path));
    }


    // standart handler methods
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
    }

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

        if (is.undefined(this.options.depth) || depth <= this.options.depth) {
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
    }

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
    }

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
    }

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
}

if (canUseFSEvents()) {
    for (const method of adone.util.keys(FSEventsHandler)) {
        Watcher.prototype[method] = FSEventsHandler[method];
    }
}
