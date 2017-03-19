

let FSEvents;
try {
    FSEvents = adone.fsevents;
} catch (error) {
    //
}

// object to hold per-process fsevents instances (may be shared across chokidar Watcher instances)
const FSEventsWatchers = new Map();

// Threshold of duplicate path prefixes at which to start consolidating going forward
const consolidateThreshhold = 10;

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
        if (!adone.util.properties(watchContainer.listeners).length) {
            watchContainer.watcher.stop();
            FSEventsWatchers.delete(watchPath);
        }
    };
}

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
export const canUse = () => FSEvents && [...FSEventsWatchers.keys()].length < 128;

export default {
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
            if (this.options.depth !== undefined && depth(fullPath, realPath) > this.options.depth) {
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
                } else {
                    this._ignoredPaths.delete(path);
                    this._ignoredPaths.delete(`${path}/**/*`);
                }
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
                            const curDepth = this.options.depth === undefined ? undefined : depth(fullPath, realPath) + 1;
                            return this._addToFsEvents(path, false, true, curDepth);
                        } else {
                            // track new paths
                            // (other than symlinks being followed, which will be tracked soon)
                            this._getWatchedDir(parent).add(item);
                        }
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
                        adone.std.fs.close(fd);
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
                        const curDepth = this.options.depth === undefined ? undefined : depth(joinedPath, adone.std.path.resolve(wh.watchPath)) + 1;
                        this._handleFsEventsSymlink(joinedPath, fullPath, processPath, curDepth);
                    } else {
                        emitAdd(joinedPath, entry.stat);
                    }
                }).error((err) => {
                    this._handleError(err);
                }, { all: true }).done(() => {
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
                    this._closers.set(path, closer);
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
        } else {
            this._symlinkPaths.set(fullPath, true);
        }

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
