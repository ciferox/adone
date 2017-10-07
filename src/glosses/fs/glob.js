// @ts-check

const {
    std,
    fs,
    collection,
    is,
    util,
    event: { EventEmitter },
    stream: { CoreStream },
    identity
} = adone;

const split = (pattern) => pattern.split(/\//);
const { resolve, sep, normalize } = std.path;
const join = (a, b) => a ? a === sep ? `${sep}${b}` : `${a}${sep}${b}` : b;
const joinMany = (parts) => parts.join(sep);

class StaticValue {
    constructor(part) {
        if (part === "") {
            this.isEmpty = true;
        } else if (part === ".") {
            this.isCurrent = true;
        } else if (part === "..") {
            this.isPrev = true;
        } else if (part[0] === ".") {
            this.isDotted = true;
        }

        this.part = part;
    }

    test(value) {
        return this.part === value;
    }
}

class DynamicValue {
    /**
     * @param {string} part
     */
    constructor(part) {
        if (part === "**") {
            this.isGlobstar = true;
        } else {
            if (part[0] === ".") {
                this.isDotted = true;
                this.re = util.match.makeRe(part.slice(1));
            } else {
                this.re = util.match.makeRe(part, { dot: true });
            }
        }

        this.part = part;
    }

    test(value) {
        if (this.isDotted) {
            return value[0] === "." && this.re.test(value.slice(1));
        }
        return this.re.test(value);
    }

    toString() {
        return this.part;
    }
}

class StaticPart {
    /**
     * @param {string} absolute
     * @param {string} relative
     */
    constructor(absolute, relative) {
        this.absolute = absolute;
        this.relative = relative;
    }

    join(part) {
        return new StaticPart(join(this.absolute, part), join(this.relative, part));
    }
}

class Entry {
    /**
     * @param {StaticPart} staticPart
     * @param {adone.fs.I.Stats} stat
     */
    constructor(staticPart, stat, index) {
        this.path = staticPart.relative;
        this.absolutePath = staticPart.absolute;
        this.stat = stat;
        this.index = index;
    }

    get normalizedRelative() {
        return normalize(this.path);
    }

    get normalizedAbsolute() {
        return normalize(this.absolutePath);
    }
}

class Runtime {
    constructor(isChildIgnored, isChildDirIgnored, dot, stat, strict, follow, realpath) {
        this.lstatCache = new collection.MapCache();
        this.readdirCache = new collection.MapCache();
        this.isChildIgnored = isChildIgnored;
        this.isChildDirIgnored = isChildDirIgnored;
        this.dot = dot;
        this.stat = stat;
        this.strict = strict;
        this.follow = follow;
        this.realpath = realpath;
    }

    clearCache() {
        this.lstatCache.clear();
        this.readdirCache.clear();
    }
}

const emptyDynamicPart = [];

class Pattern {
    /**
     * @param {StaticPart} staticPart static part of the pattern
     * @param {Array<StaticValue | DynamicValue>} dynamicPart dynamic part of the pattern
     * @param {Runtime} runtime runtime options from the glob
     */
    constructor(staticPart, dynamicPart, runtime, index, insideGlobStar = false, root = false) {
        this.staticPart = staticPart;
        this.dynamicPart = dynamicPart;
        this.runtime = runtime;
        this.root = root;
        this.index = index;
        this.insideGlobStar = insideGlobStar;
    }

    async process(processor) {
        let stat;
        const { runtime, staticPart } = this;
        const { absolute: absoluteStaticPart } = staticPart;

        const { lstatCache } = runtime;

        if (lstatCache.has(absoluteStaticPart)) {
            stat = await lstatCache.get(absoluteStaticPart);
        } else {
            const promise = fs.lstat(absoluteStaticPart).catch(identity);
            lstatCache.set(absoluteStaticPart, promise); // cache a promise for concurrent processes
            stat = await promise;
            lstatCache.set(absoluteStaticPart, stat); // replace the promise with the value
        }

        if (is.error(stat)) {
            if (
                runtime.strict
                && stat.code !== "ENOENT" // race condition
                && stat.code !== "ENOTDIR" // we tried to stat a directory wich does not exist, the path has / at the end
                && stat.code !== "ELOOP" // too many links, symlink loop
            ) {
                throw stat;
            }
            // just swallow
            return;
        }

        let { dynamicPart, index, insideGlobStar } = this;

        if (!stat.isDirectory()) {
            let follow = false;

            // handle symlink following for symlinks to directories
            if (stat.isSymbolicLink()) {
                // check if it is a directory symlink
                let targetStat;
                try {
                    targetStat = await fs.stat(absoluteStaticPart);
                } catch (err) {
                    if (err.code !== "ELOOP" && err.code !== "ENOENT" && runtime.strict) {
                        throw err;
                    }
                    // found a loop or a dead link, just do not follow and emit the file
                }
                if (targetStat && targetStat.isDirectory()) {
                    if (insideGlobStar) {
                        if (runtime.follow) {
                            follow = true;
                            stat = targetStat;
                        } else {
                            // if we do not follow symlinks, then we just stop the recursion here
                            // remove globstar from the dynamic part and follow the rest
                            //
                            dynamicPart = dynamicPart.slice(1);
                            follow = true;
                            stat = targetStat;
                        }
                    } else {
                        follow = true;
                        stat = targetStat;
                    }
                }
            }

            if (!follow) {
                // if there are no dynamic parts or it is **, we have an exact match
                if (
                    dynamicPart.length === 0
                ) {
                    processor(new Entry(staticPart, stat, index));
                }
                // this is a file, but there are some dynamic things that must be resolved
                // so it does not match
                return;
            }
            // this is a symlink to a directory we must follow
        }

        // a directory or a symlink to a direcotry

        // now we know that this is a directory, we can check if it is ignored
        if (runtime.isChildDirIgnored(staticPart.relative)) {
            return;
        }

        if (dynamicPart.length === 0) {
            // no dynamic parts, so emit the directory
            processor(new Entry(staticPart, stat, index));
            return;
        }
        if (dynamicPart.length === 1) {
            const part = dynamicPart[0];
            if (part.isGlobstar) {
                // dynamic part is **, emit the directory
                // only root is marked with trailing / (virtual/** -> virtual/)
                // but only if we have some relative part
                // because ** for some cwd should not match /
                if (staticPart.relative) {
                    processor(new Entry(this.root ? staticPart.join("") : staticPart, stat, index));
                }
            } else if (part.isEmpty) {
                // empty part means patterns like this a/, */ we have to emit only the directory itself
                processor(new Entry(staticPart.join(""), stat, index)); // mark the path
                return;
            }
        }

        if (dynamicPart.length >= 2) {
            if (dynamicPart[0].isGlobstar) {
                if (dynamicPart[1].isEmpty) {
                    if (dynamicPart.length === 2) {
                        // **/
                        processor(new Entry(staticPart.join(""), stat, index));
                    } else {
                        // **/smth
                        processor(new Pattern(staticPart, [dynamicPart[0]].concat(dynamicPart.slice(2)), runtime, index));
                        return;
                    }
                } else if (dynamicPart[1].isGlobstar) {
                    // consequent **/**
                    processor(new Pattern(staticPart, dynamicPart.slice(1), runtime, index));
                    return;
                }
            }
        }

        if (dynamicPart[0].isEmpty) {
            // /
            processor(new Pattern(staticPart, dynamicPart.slice(1), runtime, index));
            return;
        }

        if (dynamicPart[0].isCurrent) {
            // handle "."
            processor(new Pattern(staticPart.join("."), dynamicPart.slice(1), runtime, index));
            return;
        }

        if (dynamicPart[0].isPrev) {
            // handle ".."
            processor(new Pattern(staticPart.join(".."), dynamicPart.slice(1), runtime, index));
            return;
        }

        let dynamicSlice1 = null;
        let dynamicSlice2 = null;

        if (dynamicPart.length > 1 && dynamicPart[0].isGlobstar) {
            if (dynamicPart[1].isCurrent) {
                dynamicSlice2 = dynamicPart.slice(2);
                processor(new Pattern(staticPart.join("."), dynamicSlice2, runtime, index));
            } else if (dynamicPart[1].isPrev) {
                dynamicSlice2 = dynamicPart.slice(2);
                processor(new Pattern(staticPart.join(".."), dynamicSlice2, runtime, index));
            }
        }

        // there are some dynamic parts, go further

        const { readdirCache } = runtime;

        let files;
        if (readdirCache.has(absoluteStaticPart)) {
            files = await readdirCache.get(absoluteStaticPart);
        } else {
            const promise = fs.readdir(absoluteStaticPart).catch(identity);
            readdirCache.set(absoluteStaticPart, promise);
            files = await promise;
            readdirCache.set(absoluteStaticPart, files);
        }

        if (!is.array(files)) {
            // race condition if ENOENT
            if (files.code !== "ENOENT" && runtime.strict) {
                throw files;
            }
            // just swallow
            throw files;
        }

        for (const file of files) {
            if (!runtime.dot && file[0] === ".") {
                if (dynamicPart[0].isGlobstar) {
                    if (dynamicPart.length === 1) {
                        // ** and dot is false, does not match
                        continue;
                    }
                    if (!dynamicPart[1].isDotted) {
                        // the next pattern is not explicitly dotted, does not match
                        continue;
                    }
                    // we have **/.smth
                } else if (!dynamicPart[0].isDotted) {
                    // the pattern is not explicitly dotted, does not match
                    continue;
                }
                // we have either **/.smth or .smth
            }

            const nextStaticPart = staticPart.join(file);

            if (runtime.isChildIgnored(nextStaticPart.relative)) {
                continue;
            }

            const childDirIgnored = runtime.isChildDirIgnored(nextStaticPart.relative);

            if (dynamicPart[0].isGlobstar) {
                // static part that includes the file and the same dynamic part
                processor(new Pattern(nextStaticPart, dynamicPart, runtime, index, true));

                // it can match the next pattern
                if (dynamicPart.length > 1) {
                    // here we will not meet **/**
                    if (dynamicPart[1].test(file)) {
                        // it matches the part after the globstar, assume the globstar matches nothing src/**/a -> src/a.
                        // remove the globstar and the next thing

                        // if there are no other things we have an exact match
                        if (dynamicPart.length === 2) {
                            // if child dir with the same name is ignored, we have to stat to determine whether this is a directory or not
                            if (runtime.stat || childDirIgnored) {
                                processor(new Pattern(nextStaticPart, emptyDynamicPart, runtime, index));
                            } else {
                                processor(new Entry(nextStaticPart, undefined, index));
                            }
                        } else {
                            if (!dynamicSlice2) {
                                dynamicSlice2 = dynamicPart.slice(2);
                            }
                            processor(new Pattern(nextStaticPart, dynamicSlice2, runtime, index));
                        }
                    }
                } else {
                    // the dynamic part is only **, we have exact match
                    // but we have no stat and dont know what it is, if we want stats we have to go further
                    // also, directory symlinks are handled before

                    if (runtime.stat || childDirIgnored) {
                        processor(new Pattern(nextStaticPart, emptyDynamicPart, runtime, index));
                    } else {
                        processor(new Entry(nextStaticPart, undefined, index));
                    }
                }
            } else if (dynamicPart[0].test(file)) { // it matches the part, so we have less dynamic parts
                // if there are no other dynamic parts we have an exact match
                if (dynamicPart.length === 1) {
                    // if child dir with the same name is ignored, we have to stat to determine whether this is a directory or not
                    if (runtime.stat || childDirIgnored) {
                        processor(new Pattern(nextStaticPart, emptyDynamicPart, runtime, index));
                    } else {
                        processor(new Entry(nextStaticPart, undefined, index));
                    }
                } else {
                    if (!dynamicSlice1) {
                        dynamicSlice1 = dynamicPart.slice(1);
                    }
                    processor(new Pattern(nextStaticPart, dynamicSlice1, runtime, index));
                }

            }
        }
    }

    inspect() {
        return `<Pattern "${joinMany([this.staticPart, ...this.dynamicPart.map((x) => {
            if (is.regexp(x)) {
                return x.result[0].input;
            }
            return x;
        })])}">`;
    }
}

const absoluteGetter = (entry) => entry.absolutePath;
const relativeGetter = (entry) => entry.path;
const normalizedAbsoluteGetter = (entry) => entry.normalizedAbsolute;
const normalizedRelativeGetter = (entry) => entry.normalizedRelative;

class Glob extends EventEmitter {
    constructor(patterns, {
        cwd = process.cwd(),
        stat = false,
        dot = false,
        nodir = false,
        strict = true,
        follow = false,
        unique = true,
        rawEntries = false,
        absolute = false,
        normalized = false,
        realpath = false,
        index = false
    } = {}) {
        super();
        this.emitQueue = new collection.Queue();
        this.processQueue = new collection.Queue();

        const matchPatterns = [];

        const ignoreList = [];
        for (const pattern of util.arrify(patterns)) {
            if (pattern[0] === "!") {
                ignoreList.push(pattern.slice(1));
            } else {
                matchPatterns.push(pattern);
            }
        }

        let isIgnored = adone.falsely;
        let isChildIgnored = adone.falsely;
        let isChildDirIgnored = adone.falsely;

        if (ignoreList.length) {
            const childPatterns = [];
            const childDirPatterns = [];
            const overallPatterns = [];
            for (const pattern of ignoreList) {
                const re = util.match.makeRe(pattern, { dot: true });

                // in this case we can exclude entrire subtrees while walking
                if (pattern.endsWith("/**")) {
                    childPatterns.push(re); // for childs

                    const dirRe = util.match.makeRe(pattern.slice(0, -3), { dot: true }); // for child dir
                    childDirPatterns.push(dirRe);

                } else if (pattern.endsWith("/**/*")) {
                    childPatterns.push(re); // only for childs
                }
                overallPatterns.push(re);
            }

            // we can have no patterns for child nodes
            if (childPatterns.length) {
                isChildIgnored = (path) => {
                    for (const re of childPatterns) {
                        if (re.test(path)) {
                            return true;
                        }
                        return false;
                    }
                };
            }

            if (childDirPatterns.length) {
                isChildDirIgnored = (path) => {
                    for (const re of childDirPatterns) {
                        if (re.test(path)) {
                            return true;
                        }
                        return false;
                    }
                };
            }

            // we will always have at least one pattern here
            isIgnored = (path) => {
                for (const re of overallPatterns) {
                    if (re.test(path)) {
                        return true;
                    }
                }
                return false;
            };
        }

        /**
         * Runtime that is passed to the patterns
         */
        this.runtime = new Runtime(
            isChildIgnored,
            isChildDirIgnored,
            dot,
            stat || nodir, // if nodir or mark is enabled we have to stat all the entries to know where directories are
            strict,
            follow,
            realpath
        );

        this.nodir = nodir;
        this.cwd = cwd;
        this.unique = unique;
        this.rawEntries = rawEntries || stat || index;
        this.absolute = absolute;
        this.normalized = normalized;
        this._ended = false;
        this._paused = true;
        this._resumeScheduled = false;
        this._pausedAfterResume = false;
        this._endEmitted = false;

        this._processes = 0;
        this.__processor = this._processor.bind(this);
        this.__pathGetter = this.normalized
            ? this.absolute ? normalizedAbsoluteGetter : normalizedRelativeGetter
            : this.absolute ? absoluteGetter : relativeGetter;
        this.__isIgnored = isIgnored;

        this.emitCache = unique && new collection.MapCache();
        this.__onError = (err) => this.emit("error", err);
        this.once("end", () => {
            this.runtime.clearCache();
            this.emitCache && this.emitCache.clear();
        });

        for (let i = 0; i < matchPatterns.length; ++i) {
            const expanded = util.braces.expand(matchPatterns[i]);
            for (const subpattern of expanded) {
                const compiled = this._getFirstPattern(subpattern, i);
                if (isIgnored(compiled.staticPart.relative)) {
                    continue;
                } else {
                    this.processQueue.push(compiled);
                }
            }
        }
    }

    _normalizeDynamicPart(parts) {
        if (!parts.length) {
            return parts;
        }
        const normalized = [];
        for (let i = 0; i < parts.length; ++i) {
            const part = parts[i];
            const lastPart = normalized.length > 0 && normalized[normalized.length - 1];
            if (part === "**" && lastPart === "**") { // **/** === **
                continue;
            }
            normalized.push(part);
        }
        return normalized;
    }

    _getFirstPattern(pattern, index) {
        const parts = split(pattern);
        let i;
        for (i = 0; i < parts.length; ++i) {
            const part = parts[i];
            // the first glob part means that the static part is over and the dynamic part starts
            if (is.glob(part)) {
                break;
            }
        }
        let relativeStaticPart;
        let absoluteStaticPart;

        if (i === 0) { // there is no static part, the pattern is relative
            absoluteStaticPart = this.cwd;
            relativeStaticPart = "";
        } else {
            if (parts[0] === "") { // the pattern is absolute
                relativeStaticPart = join(resolve("/"), joinMany(parts.slice(1, i)));
                absoluteStaticPart = relativeStaticPart;
            } else { // the pattern is relative
                relativeStaticPart = joinMany(parts.slice(0, i));
                absoluteStaticPart = join(this.cwd, relativeStaticPart);
            }
        }
        const staticPart = new StaticPart(absoluteStaticPart, relativeStaticPart); // normalize absolute?
        const dynamicPart = this._normalizeDynamicPart(parts.slice(i)).map((x) => {
            if (is.glob(x)) {
                return new DynamicValue(x);
            }
            return new StaticValue(x);
        });
        return new Pattern(staticPart, dynamicPart, this.runtime, index, false, true);
    }

    isPaused() {
        return this._paused;
    }

    pause() {
        this._paused = true;
        if (this._resumeScheduled) {
            this._pausedAfterResume = true;
        }
        return this;
    }

    resume() {
        if (!this.isPaused() || this._ended) {
            return this;
        }
        if (this._resumeScheduled) {
            if (this._pausedAfterResume) {
                this._pausedAfterResume = false;
            }
            return this;
        }
        this._resumeScheduled = true;
        process.nextTick(() => {
            if (this._ended) {
                return;
            }
            this._resumeScheduled = false;
            if (this._pausedAfterResume) {
                this._pausedAfterResume = false;
                return;
            }
            while (!this.emitQueue.empty) {
                this.emit("match", this.emitQueue.pop());
            }
            if (this.processQueue.empty && !this._endEmitted) {
                this.emit("end");
                this._endEmitted = true;
            } else {
                while (!this.processQueue.empty) {
                    this.process(this.processQueue.pop());
                }
            }
            this._paused = false;
        });
        return this;
    }

    end() {
        if (this._ended || this._endEmitted) {
            return this;
        }
        this._ended = true;
        this.processQueue.clear();
        this.emitQueue.clear();
        if (this.isPaused()) {
            process.nextTick(() => {
                this.emit("end");
                this._endEmitted = true;
            });
        }
        return this;
    }

    _processor(sub) {
        if (this._ended) {
            return;
        }
        if (sub instanceof Pattern) {
            if (this._paused) {
                this.processQueue.push(sub);
            } else {
                this.process(sub);
            }
            return;
        }
        if (this.nodir && sub.stat.isDirectory()) { // it nodir is set, stats are always present
            return;
        }
        const path = this.__pathGetter(sub);
        if (this.__isIgnored(path)) {
            return;
        }
        if (this.unique) {
            if (this.emitCache.has(path)) {
                return;
            }
            this.emitCache.set(path, true);
        }
        if (!this.rawEntries) {
            sub = path;
        }
        if (this._paused) {
            this.emitQueue.push(sub);
        } else {
            this.emit("match", sub);
        }
    }

    async process(pattern) {
        ++this._processes;
        await pattern.process(this.__processor).catch(this.__onError);
        --this._processes;
        if (this._processes === 0 && this.emitQueue.empty && this.processQueue.empty && !this._endEmitted) {
            this.emit("end");
            this._endEmitted = true;
        }
    }
}

class GlobStream extends CoreStream {
    constructor(patterns, options) {
        super();
        this.glob = new Glob(patterns, options);
        this.glob
            .on("end", () => super.end())
            .on("match", (match) => this.write(match))
            .on("error", (err) => {
                // if we have an error we immediately stop the stream
                this.emit("error", err);
                this.end();
            });
    }

    pause() {
        this.glob.pause();
        return super.pause();
    }

    resume() {
        this.glob.resume();
        return super.resume();
    }

    end() {
        this.glob.end();
        return this;
    }
}

export default function glob(patterns, options) {
    return new GlobStream(patterns, options);
}

glob.Glob = Glob;
