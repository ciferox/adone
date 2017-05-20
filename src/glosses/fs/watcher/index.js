import NodeFsHandler from "./lib/nodefs-handler";
import FSEventsHandler, { canUse as canUseFSEvents } from "./lib/fsevents-handler";

const dotRe = /\..*\.(sw[px])$|\~$|\.subl.*\.tmp/;
const replacerRe = /^\.[\/\\]/;

export default class Watcher extends adone.EventEmitter {
    constructor({
        persistent = true,
        ignoreInitial = false,
        ignorePermissionErrors = false,
        interval = 100,
        binaryInterval = 300,
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
        if (useFsEvents === null) {
            useFsEvents = !usePolling;
        }
        // If we can't use fsevents, ensure the options reflect it's disabled.
        if (!canUseFSEvents()) {
            useFsEvents = false;
        }

        // Use polling on Mac if not using fsevents.
        // Other platforms use non-polling fs.watch.
        if (usePolling === null && !useFsEvents) {
            usePolling = process.platform === "darwin";
        }

        // Editor atomic write normalaization enabled by default with fs.watch
        if (atomic === null) {
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
            persistent, ignoreInitial, ignorePermissionErrors,
            interval, binaryInterval, useFsEvents,
            usePolling, atomic, followSymlinks,
            awaitWriteFinish, ignored, alwaysStat,
            depth, cwd
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
        let timeoutObject;
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
                    if (typeof path !== "string") {
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
        const watchPath = depth || !adone.is.glob(path) ? path : adone.util.globParent(path);
        const fullWatchPath = adone.std.path.resolve(watchPath);
        const hasGlob = watchPath !== path;
        const globFilter = hasGlob ? adone.util.match(path) : false;
        const follow = this.options.followSymlinks;
        let globSymlink = hasGlob && follow ? null : false;

        const checkGlobSymlink = (entry) => {
            // only need to resolve once
            // first entry should always have entry.parentDir === ""
            if (globSymlink == null) {
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
        let filterDir;
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
                    if (item !== ".") {
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
}

// Attach watch handler

const importHandler = (handler) => {
    for (const method of adone.util.keys(handler)) {
        Watcher.prototype[method] = handler[method];
    }
};

importHandler(NodeFsHandler);
if (canUseFSEvents()) {
    importHandler(FSEventsHandler);
}
