import adone from "adone";
const {
    std: { fs, path },
    util: { GlobExp },
    is
} = adone;

class CallbackCache {
    constructor() {
        this._cache = new Map();
    }

    inflight(key, callback) {
        if (!is.function(callback)) {
            throw new TypeError("Callback must be a function");
        }

        if (this._cache.has(key)) {
            this._cache.get(key).push(callback);
            return null;
        } else {
            this._cache.set(key, [callback]);
            return (...args) => {
                const callbacks = this._cache.get(key);

                for (let i = 0; i < callbacks.length; i++) {
                    callbacks[i](...args);
                }

                this._cache.delete(key);
            };
        }
    }
}


class Glob extends adone.EventEmitter {
    constructor(pattern, options = {}, cb) {
        super();

        if (is.function(options)) {
            cb = options;
            options = {};
        }

        // base-matching: just use globstar for that.
        if (options.matchBase && !pattern.includes("/")) {
            if (options.noglobstar) {
                throw new Error("base matching requires globstar");
            }
            pattern = `**/${pattern}`;
        }

        this.silent = Boolean(options.silent);
        this.pattern = pattern;
        this.strict = Boolean(options.strict);
        this.realpath = Boolean(options.realpath);
        this.follow = Boolean(options.follow);
        this.dot = Boolean(options.dot);
        this.mark = Boolean(options.mark);
        this.nodir = Boolean(options.nodir);
        if (this.nodir) {
            this.mark = true;
        }
        this.nounique = Boolean(options.nounique);
        this.nonull = Boolean(options.nonull);
        this.nosort = Boolean(options.nosort);
        this.nocase = Boolean(options.nocase);
        this.stat = Boolean(options.stat);
        this.maxLength = options.maxLength || Infinity;

        this.cache = options.cache || new Map();
        this.statCache = options.statCache || new Map();
        this.realpathCache = options.realpathCache || new Map();
        this.callbackCache = new CallbackCache();
        this.cacheEmitter = new adone.EventEmitter();
        this.symlinks = options.symlinks || Object.create(null);

        this._setupIgnores(options);

        this.changedCwd = false;
        const cwd = process.cwd();
        if (!is.propertyOwned(options, "cwd")) {
            this.cwd = cwd;
        } else {
            this.cwd = path.resolve(options.cwd);
            this.changedCwd = this.cwd !== cwd;
        }

        this.root = options.root || path.resolve("/");
        this.root = path.resolve(this.root);
        if (is.win32) {
            this.root = this.root.replace(/\\/g, "/");
        }

        this.cwdAbs = this._makeAbs(this.cwd);
        this.nomount = Boolean(options.nomount);

        this.globexp = new GlobExp(pattern, options);
        this.options = this.globexp.options;

        // process each pattern in the globexp set
        let n = this.globexp.set.length;

        // The matches are stored as {<filename>: true,...} so that
        // duplicates are automagically pruned.
        // Later, we do an Object.keys() on these.
        // Keep them as a list so we can fill in when nonull is set.
        this.matches = [];
        for (let i = 0; i < n; i++) {
            this.matches.push(new Set());
        }

        this.found = [];

        if (is.function(cb)) {
            this.on("error", cb);
            this.on("end", (matches) => {
                cb(null, matches);
            });
        }

        n = this.globexp.set.length;
        this._processCounter = 0;
        this._processQueue = [];

        this._emitQueue = [];
        this.paused = false;

        process.nextTick(() => {
            const done = () => {
                --this._processCounter;
                if (this._processCounter <= 0 && this._emitQueue.length === 0) {
                    this._finish();
                }
            };

            if (n === 0) {
                return done();
            }

            for (let i = 0; i < n; i++) {
                this._process(this.globexp.set[i], i, false, done);
            }
        });
    }

    _setupIgnores(options) {
        this.ignore = options.ignore ? adone.util.arrify(options.ignore) : [];

        if (this.ignore.length > 0) {
            // ignore patterns are always in dot:true mode.
            this.ignore = this.ignore.map((pattern) => {
                let gmatcher = null;
                if (pattern.slice(-3) === "/**") {
                    const gpattern = pattern.replace(/(\/\*\*)+$/, "");
                    gmatcher = new GlobExp(gpattern, { dot: true });
                }

                return {
                    matcher: new GlobExp(pattern, { dot: true }),
                    gmatcher
                };
            });
        }
    }

    // Return true, if pattern ends with globstar '**', for the accompanying parent directory.
    // Ex:- If node_modules/** is the pattern, add 'node_modules' to ignore list along with it's contents
    isIgnored(path) {
        if (!this.ignore.length) {
            return false;
        }

        return this.ignore.some((item) => {
            return item.matcher.test(path) || (item.gmatcher ? item.gmatcher.test(path) : false);
        });
    }

    _finish() {
        if (this.aborted) {
            return;
        }

        if (!this.nosort) {
            if (this.nocase) {
                this.found = this.found.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
            } else {
                this.found = this.found.sort((a, b) => a.localeCompare(b));
            }
        }

        if (this.nonull) {
            for (let i = 0, l = this.matches.length; i < l; i++) {
                if (this.matches[i].size === 0) {
                    const literal = this.globexp.globSet[i];
                    if (!this.isIgnored(literal)) {
                        if (!this.nounique || !this.found.includes(literal)) {
                            this.emit("match", literal, this.statCache.get(this._makeAbs(literal)));
                        }
                    }
                }
            }
        }

        this.emit("end", this.found);
    }

    _mark(p) {
        const abs = this._makeAbs(p);
        const c = this.cache.get(abs);
        let m = p;
        if (c) {
            const isDir = c === "DIR" || is.array(c);
            const slash = p.slice(-1) === "/";

            if (isDir && !slash) {
                m += "/";
            } else if (!isDir && slash) {
                m = m.slice(0, -1);
            }

            if (m !== p) {
                const mabs = this._makeAbs(m);
                this.statCache.set(mabs, this.statCache.get(abs));
                this.cache.set(mabs, c);
            }
        }

        return m;
    }

    _makeAbs(f) {
        let abs = f;
        if (f.charAt(0) === "/") {
            abs = path.join(this.root, f);
        } else if (is.pathAbsolute(f) || f === "") {
            abs = f;
        } else if (this.changedCwd) {
            abs = path.resolve(this.cwd, f);
        } else {
            abs = path.resolve(f);
        }

        if (is.win32) {
            abs = abs.replace(/\\/g, "/");
        }

        return abs;
    }

    abort() {
        this.aborted = true;
        this.emit("abort");
    }

    pause() {
        if (!this.paused) {
            this.paused = true;
            this.emit("pause");
        }
    }

    resume() {
        if (this.paused) {
            this.emit("resume");
            this.paused = false;
            if (this._emitQueue.length) {
                const eq = this._emitQueue;
                this._emitQueue = [];

                for (let i = 0; i < eq.length; i++) {
                    this._emitMatch(...eq[i]);
                }

                if (this._processQueue.length === 0) {
                    this._finish();
                }
            }
            if (this._processQueue.length) {
                const pq = this._processQueue;
                this._processQueue = [];
                for (let i = 0; i < pq.length; i++) {
                    this._processCounter--;
                    this._process(...pq[i]);
                }
            }
        }
    }

    isChildrenIgnored(path) {
        if (!this.ignore.length) {
            return false;
        }

        return this.ignore.some((item) => {
            return Boolean(item.gmatcher && item.gmatcher.test(path));
        });
    }

    _process(pattern, index, inGlobStar, cb) {
        if (this.aborted) {
            return;
        }

        this._processCounter++;
        if (this.paused) {
            this._processQueue.push([pattern, index, inGlobStar, cb]);
            return;
        }

        // Get the first [n] parts of pattern that are all strings.
        let n = 0;
        while (is.string(pattern[n])) {
            n++;
        }
        // now n is the index of the first one that is *not* a string.

        // see if there's anything else
        let prefix;
        switch (n) {
            // if not, then this is rather simple
            case pattern.length: {
                this._processSimple(pattern.join("/"), index, cb);
                return;
            }

            case 0:
                // pattern *starts* with some non-trivial item.
                // going to readdir(cwd), but not include the prefix in matches.
                prefix = null;
                break;

            default:
                // pattern has some string bits in the front.
                // whatever it starts with, whether that's 'absolute' like /foo/bar,
                // or 'relative' like '../baz'
                prefix = pattern.slice(0, n).join("/");
                break;
        }

        const remain = pattern.slice(n);

        // get the list of entries.
        let read;
        if (prefix === null) {
            read = ".";
        } else if (is.pathAbsolute(prefix) || is.pathAbsolute(pattern.join("/"))) {
            if (!prefix || !is.pathAbsolute(prefix)) {
                prefix = `/${prefix}`;
            }
            read = prefix;
        } else {
            read = prefix;
        }

        const abs = this._makeAbs(read);

        //if ignored, skip _processing
        if (this.isChildrenIgnored(read)) {
            return cb();
        }

        const isGlobStar = remain[0] === GlobExp.GLOBSTAR;
        if (isGlobStar) {
            this._processGlobStar(prefix, read, abs, remain, index, inGlobStar, cb);
        } else {
            this._processReaddir(prefix, read, abs, remain, index, inGlobStar, cb);
        }
    }

    _processReaddir(prefix, read, abs, remain, index, inGlobStar, cb) {
        this._readdir(abs, inGlobStar, (er, entries) => {
            return this._processReaddir2(prefix, read, abs, remain, index, inGlobStar, entries, cb);
        });
    }

    _processReaddir2(prefix, read, abs, remain, index, inGlobStar, entries, cb) {
        // if the abs isn't a dir, then nothing can match!
        if (!entries) {
            return cb();
        }

        // It will only match dot entries if it starts with a dot, or if
        // dot is set.    Stuff like @(.foo|.bar) isn't allowed.
        const pn = remain[0];
        const negate = Boolean(this.globexp.negate);
        const rawGlob = pn._glob;
        const dotOk = this.dot || rawGlob.charAt(0) === ".";

        const matchedEntries = [];
        for (let i = 0; i < entries.length; i++) {
            const e = entries[i];
            if (e.charAt(0) !== "." || dotOk) {
                let m;
                if (negate && !prefix) {
                    m = !e.match(pn);
                } else {
                    m = e.match(pn);
                }
                if (m) {
                    matchedEntries.push(e);
                }
            }
        }

        const len = matchedEntries.length;
        // If there are no matched entries, then nothing matches.
        if (len === 0) {
            return cb();
        }

        // if this is the last remaining pattern bit, then no need for
        // an additional stat *unless* the user has specified mark or
        // stat explicitly. We know they exist, since readdir returned
        // them.

        if (remain.length === 1 && !this.mark && !this.stat) {
            for (let i = 0; i < len; i++) {
                let e = matchedEntries[i];
                if (prefix) {
                    if (prefix !== "/") {
                        e = `${prefix}/${e}`;
                    } else {
                        e = prefix + e;
                    }
                }

                if (e.charAt(0) === "/" && !this.nomount) {
                    e = path.join(this.root, e);
                }
                this._emitMatch(index, e);
            }
            // This was the last one, and no stats were needed
            return cb();
        }

        // now test all matched entries as stand-ins for that part
        // of the pattern.
        remain.shift();
        for (let i = 0; i < len; i++) {
            let e = matchedEntries[i];
            if (prefix) {
                if (prefix !== "/") {
                    e = `${prefix}/${e}`;
                } else {
                    e = prefix + e;
                }
            }
            this._process([e].concat(remain), index, inGlobStar, cb);
        }
        cb();
    }

    _emitMatch(index, e) {
        if (this.aborted) {
            return;
        }

        if (this.matches[index].has(e)) {
            return;
        }

        if (this.isIgnored(e)) {
            return;
        }

        const abs = this._makeAbs(e);

        if (this.nodir) {
            const c = this.cache.get(e) || this.cache.get(abs);
            if (c === "DIR" || Array.isArray(c)) {
                return;
            }
        }

        if (this.paused) {
            this._emitQueue.push([index, e]);
            return;
        }

        this.matches[index].add(e);

        if (this.realpath) {
            if (this.realpathCache.has(abs)) {
                e = this.realpathCache.get(abs);
            } else {
                try {
                    // benchmarks show that glob with sync realpath is fastest
                    e = adone.util.realpath.realpathSync(abs);
                } catch (error) {
                    if (error.syscall === "stat") {
                        e = abs;
                    } else {
                        this.emit("error", error);
                    }
                }
            }
        }

        if (this.mark) {
            e = this._mark(e);
        }

        this.found.push(e);
        this.emit("match", e, this.statCache.get(abs));
        return;
    }

    _readdirInGlobStar(abs, cb) {
        if (this.aborted) {
            return;
        }

        // follow all symlinked directories forever
        // just proceed as if this is a non-globstar situation
        if (this.follow) {
            return this._readdir(abs, false, cb);
        }

        const _lstatcb = (er, lstat) => {
            if (er) {
                return cb();
            }

            const isSym = lstat.isSymbolicLink();
            this.symlinks[abs] = isSym;

            // If it's not a symlink or a dir, then it's definitely a regular file.
            // don't bother doing a readdir in that case.
            if (!isSym && !lstat.isDirectory()) {
                this.cache.set(abs, "FILE");
                cb();
            } else {
                this._readdir(abs, false, cb);
            }
        };

        const lstatkey = `lstat\0${abs}`;
        const lstatcb = this.callbackCache.inflight(lstatkey, _lstatcb);

        if (lstatcb) {
            fs.lstat(abs, lstatcb);
        }
    }

    _readdir(abs, inGlobStar, cb) {
        if (this.aborted) {
            return;
        }

        cb = this.callbackCache.inflight(`readdir\0${abs}\0${inGlobStar}`, cb);
        if (!cb) {
            return;
        }

        if (inGlobStar && !is.propertyOwned(this.symlinks, abs)) {
            return this._readdirInGlobStar(abs, cb);
        }

        if (this.cache.has(abs)) {
            const c = this.cache.get(abs);
            if (!c || c === "FILE") {
                return cb();
            }

            if (Array.isArray(c)) {
                return cb(null, c);
            }
        }

        fs.readdir(abs, (er, entries) => {
            if (er) {
                this._readdirError(abs, er, cb);
            } else {
                this._readdirEntries(abs, entries, cb);
            }
        });
    }

    _readdirEntries(abs, entries, cb) {
        if (this.aborted) {
            return;
        }

        // if we haven't asked to stat everything, then just
        // assume that everything in there exists, so we can avoid
        // having to stat it a second time.
        if (!this.mark && !this.stat) {
            for (let i = 0; i < entries.length; i++) {
                let e = entries[i];
                if (abs === "/") {
                    e = abs + e;
                } else {
                    e = `${abs}/${e}`;
                }
                this.cache.set(e, true);
            }
        }

        this.cache.set(abs, entries);
        return cb(null, entries);
    }

    _readdirError(f, er, cb) {
        if (this.aborted) {
            return;
        }

        // handle errors, and cache the information
        switch (er.code) {
            case "ENOTSUP": // can happen when working off some Windows Network Mapped Drives using DFS
            case "ENOTDIR": { // totally normal. means it *does* exist.
                const abs = this._makeAbs(f);
                this.cache.set(abs, "FILE");
                if (abs === this.cwdAbs) {
                    const error = new Error(`${er.code} invalid cwd ${this.cwd}`);
                    error.path = this.cwd;
                    error.code = er.code;
                    this.emit("error", error);
                    this.abort();
                }
                break;
            }
            case "ENOENT":
            case "ELOOP":
            case "ENAMETOOLONG":
            case "UNKNOWN":
                this.cache.set(this._makeAbs(f), false);
                break;

            default: // some unusual error. Treat as failure.
                this.cache.set(this._makeAbs(f), false);
                if (this.strict) {
                    this.emit("error", er);
                    this.abort();
                }
                if (!this.silent) {
                    adone.error("glob error", er);
                }
                break;
        }

        return cb();
    }

    _processGlobStar(prefix, read, abs, remain, index, inGlobStar, cb) {
        this._readdir(abs, inGlobStar, (er, entries) => {
            this._processGlobStar2(prefix, read, abs, remain, index, inGlobStar, entries, cb);
        });
    }

    _processGlobStar2(prefix, read, abs, remain, index, inGlobStar, entries, cb) {
        // no entries means not a dir, so it can never have matches
        // foo.txt/** doesn't match foo.txt
        if (!entries) {
            return cb();
        }

        // test without the globstar, and with every child both below
        // and replacing the globstar.
        const remainWithoutGlobStar = remain.slice(1);
        const gspref = prefix ? [prefix] : [];
        const noGlobStar = gspref.concat(remainWithoutGlobStar);

        // the noGlobStar pattern exits the inGlobStar state
        this._process(noGlobStar, index, false, cb);

        const isSym = this.symlinks[abs];
        const len = entries.length;

        // If it's a symlink, and we're in a globstar, then stop
        if (isSym && inGlobStar) {
            return cb();
        }

        for (let i = 0; i < len; i++) {
            const e = entries[i];
            if (e.charAt(0) === "." && !this.dot) {
                continue;
            }

            // these two cases enter the inGlobStar state
            const instead = gspref.concat(entries[i], remainWithoutGlobStar);
            this._process(instead, index, true, cb);

            const below = gspref.concat(entries[i], remain);
            this._process(below, index, true, cb);
        }

        cb();
    }

    _processSimple(prefix, index, cb) {
        // XXX review this. Shouldn't it be doing the mounting etc
        // before doing stat? kinda weird?
        this._stat(prefix, (er, exists) => {
            this._processSimple2(prefix, index, er, exists, cb);
        });
    }

    _processSimple2(prefix, index, er, exists, cb) {
        // If it doesn't exist, then just mark the lack of results
        if (!exists) {
            return cb();
        }

        if (prefix && is.pathAbsolute(prefix) && !this.nomount) {
            const trail = /[\/\\]$/.test(prefix);
            if (prefix.charAt(0) === "/") {
                prefix = path.join(this.root, prefix);
            } else {
                prefix = path.resolve(this.root, prefix);
                if (trail) {
                    prefix += "/";
                }
            }
        }

        if (is.win32) {
            prefix = prefix.replace(/\\/g, "/");
        }

        // Mark this as a match
        this._emitMatch(index, prefix);
        cb();
    }

    _stat(f, cb) {
        if (f.length > this.maxLength) {
            return cb();
        }

        const abs = this._makeAbs(f);
        const needDir = f.slice(-1) === "/";

        if (!this.stat && this.cache.has(abs)) {
            let c = this.cache.get(abs);

            if (Array.isArray(c)) {
                c = "DIR";
            }

            // It exists, but maybe not how we need it
            if (!needDir || c === "DIR") {
                return cb(null, c);
            }

            if (needDir && c === "FILE") {
                return cb();
            }

            // otherwise we have to stat, because maybe c=true
            // if we know it exists, but not what it is.
        }

        const stat = this.statCache.get(abs);
        if (stat !== undefined) {
            if (stat === false) {
                return cb(null, stat);
            } else {
                const type = stat.isDirectory() ? "DIR" : "FILE";
                if (needDir && type === "FILE") {
                    return cb();
                } else {
                    return cb(null, type, stat);
                }
            }
        }

        const _lstatcb = (er, lstat) => {
            if (lstat && lstat.isSymbolicLink()) {
                // If it's a symlink, then treat it as the target, unless
                // the target does not exist, then treat it as a file.
                return fs.stat(abs, (er, stat) => {
                    if (er) {
                        this._stat2(f, abs, null, lstat, cb);
                    } else {
                        this._stat2(f, abs, er, stat, cb);
                    }
                });
            } else {
                this._stat2(f, abs, er, lstat, cb);
            }
        };

        const statcb = this.callbackCache.inflight(`stat\0${abs}`, _lstatcb);
        if (statcb) {
            fs.lstat(abs, statcb);
        }
    }

    _stat2 = function (f, abs, er, stat, cb) {
        if (er) {
            this.statCache.set(abs, false);
            return cb();
        }

        this.statCache.set(abs, stat);

        if (abs.slice(-1) === "/" && !stat.isDirectory()) {
            return cb(null, false, stat);
        }

        const needDir = f.slice(-1) === "/";
        const c = stat.isDirectory() ? "DIR" : "FILE";
        this.cache.set(abs, this.cache.get(abs) || c);

        if (needDir && c !== "DIR") {
            return cb();
        }

        return cb(null, c, stat);
    }
}

const isNegative = (pattern) => {
    if (typeof pattern === "string") {
        return pattern[0] === "!";
    }
    if (pattern instanceof RegExp) {
        return true;
    }
    return false;
};

class GlobCore extends adone.core.Core {
    constructor(patterns, options = {}) {
        super();
        if (!options) {
            options = {};
        }

        patterns = adone.util.arrify(patterns);
        let activeGlobs = 0;
        this.globs = [];
        if (patterns.length) {
            const negativeMatchers = [];
            patterns.forEach((pattern, patternIndex) => {
                if (isNegative(pattern) && !options.nonegate) {
                    if (pattern[0] === "!") {
                        pattern = pattern.slice(1);
                    }
                    negativeMatchers.push(new GlobExp(pattern));
                } else {
                    const g = new Glob(pattern, options);
                    ++activeGlobs;

                    g.on("match", (file, stat) => {
                        if (!options.stat && !options.patternIndex) {
                            this.write(file);
                            return;
                        }
                        const res = { path: file };
                        if (options.stat) {
                            res.stat = stat;
                        }
                        if (options.patternIndex) {
                            res.patternIndex = patternIndex;
                        }
                        this.write(res);
                    });

                    g.on("end", () => {
                        if (--activeGlobs === 0) {
                            this.end();
                        }
                    });

                    g.on("error", (error) => {
                        this.emit("error", error);
                    });
                    this.globs.push(g);
                }
            });
            if (negativeMatchers.length) {
                this.filter((match) => {
                    for (const matcher of negativeMatchers) {
                        if (matcher.test((options.stat || options.patternIndex) ? match.path : match)) {
                            return false;
                        }
                    }
                    return true;
                });
            }
            if (!options.nonunique) {
                if (options.stat) {
                    this.unique((x) => x.path);
                } else {
                    this.unique();
                }
            }
        } else if (options.end !== false) {
            process.nextTick(() => this.end());
        }
    }

    pause() {
        for (const glob of this.globs) {
            glob.pause();
        }
        return super.pause();
    }

    resume() {
        const res = super.resume();
        for (const glob of this.globs) {
            glob.resume();
        }
        return res;
    }

    end(...args) {
        for (const glob of this.globs) {
            glob.abort();
        }
        super.end(...args);
    }
}

export default function glob(patterns, options) {
    return new GlobCore(patterns, options);
}

glob.Core = GlobCore;
glob.Glob = Glob;
