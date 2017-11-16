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

const { S_IFMT, S_IFDIR, S_IFLNK } = fs.constants;

const { resolve, normalize: stdNormalize } = std.path;

/**
 * @param {string} pattern
 */
const split = (pattern) => pattern.split("/");

// use / slash everywhere while processing

/**
 * @param {string} a
 * @param {string} b
 */
const joinAbsolute = (a, b) => {
    if (a[a.length - 1] === "/") {
        return `${a}${b}`;
    }
    return `${a}/${b}`;
};

/**
 * @param {string} a
 * @param {string} b
 */
const joinRelative = (a, b) => {
    if (!a) {
        return b;
    }
    if (a[a.length - 1] === "/") {
        return `${a}${b}`;
    }
    return `${a}/${b}`;
};

/**
 * @param {string[]} parts
 */
const joinMany = (parts) => parts.join("/");

/**
 * @param {string} path
 */
const normalize = (path) => path.replace(/\\/g, "/");

/**
 * Replace back paths on windows..
 *
 * @param {string} path
 */
const toWindowsPaths = (path) => path.replace(/\//g, "\\");

/**
 * @param {string} path
 */
const removeTrailingSlashes = (path) => path.replace(/\/+$/, "");

/** @type {(path: string) => boolean} */
const isAbsolute = is.windows
    ? (path) => {
        const { length } = path;
        if (length === 0) {
            return false;
        }
        const c = path.charCodeAt(0);
        if (c === 47 /*/*/) {
            return true;
        }
        if (length <= 2) {
            return false;
        }
        if ((c >= 65 /*A*/ && c <= 90 /*Z*/) || (c >= 98/*a*/ && c <= 122/*z*/)) {
            if (path.charCodeAt(1) === 58/*:*/) {
                const c2 = path.charCodeAt(2);
                return c2 === 47/*/*/;
            }
        }
        return false;

    }
    : (path) => path.length > 0 && path.charCodeAt(0) === 47/*/*/;

const GLOBSTAR = "globstar";
const EMPTY = "empty";
const PREV = "prev";
const CURRENT = "current";
const STATIC = "static";
const DYNAMIC = "dynamic";

class StaticValue {
    /**
     * @param {string} part
     */
    constructor(part) {
        switch (part) {
            case "": {
                this.type = EMPTY;
                this.isDotted = false;
                break;
            }
            case ".": {
                this.type = CURRENT;
                this.isDotted = false;
                break;
            }
            case "..": {
                this.type = PREV;
                this.isDotted = false;
                break;
            }
            default: {
                this.type = STATIC;
                this.isDotted = part[0] === ".";
            }
        }

        this.part = part;
    }

    /**
     * @param {string} value
     */
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
            this.type = GLOBSTAR;
            this.isDotted = false;
        } else {
            this.type = DYNAMIC;
            if (part[0] === ".") {
                this.isDotted = true;
                this.re = util.match.makeRe(part.slice(1));
            } else {
                this.isDotted = false;
                this.re = util.match.makeRe(part, { dot: true });
            }
        }

        this.part = part;
    }

    /**
     * @param {string} value
     * @returns {boolean}
     */
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

    /**
     * @param {string[]} parts
     */
    joinMany(parts) {
        if (parts.length === 1) {
            return this.join(parts[0]);
        }

        const { relative, absolute } = this;

        let newAbsolute = joinAbsolute(absolute, parts[0]);
        let newRelative = joinRelative(relative, parts[0]);

        for (let i = 1; i < parts.length; ++i) {
            newAbsolute = `${newAbsolute}/${parts[i]}`;
            newRelative = `${newRelative}/${parts[i]}`;
        }
        return new StaticPart(newAbsolute, newRelative);
    }

    /**
     * @param {string} part
     */
    join(part) {
        const { absolute, relative } = this;

        return new StaticPart(
            joinAbsolute(absolute, part),
            joinRelative(relative, part)
        );
    }
}

/**
 * @typedef EntryOptions
 * @property {StaticPart} staticPart entry's static part
 * @property {adone.fs.I.Stats} [stat] stats object for the entry, can be unset if not requested
 * @property {number} index index of the matched mattern
 */

class Entry {
    constructor(/** @type {EntryOptions} */{
        staticPart,
        stat = null,
        index
    }) {
        this.path = staticPart.relative;
        this.absolutePath = staticPart.absolute;
        this.stat = stat;
        this.index = index;
    }

    toWindowsPaths() {
        this.path = toWindowsPaths(this.path);
        this.absolutePath = toWindowsPaths(this.absolutePath);
        return this;
    }

    get normalizedRelative() {
        return stdNormalize(this.path);
    }

    get normalizedAbsolute() {
        return stdNormalize(this.absolutePath);
    }
}

class Runtime {
    constructor({
        isChildIgnored,
        isChildDirIgnored,
        dot,
        stat,
        strict,
        follow
    }) {
        this.statCache = new collection.MapCache();
        this.readdirCache = new collection.MapCache();
        this.isChildIgnored = isChildIgnored;
        this.isChildDirIgnored = isChildDirIgnored;
        this.dot = dot;
        this.stat = stat;
        this.strict = strict;
        this.follow = follow;
    }

    clearCache() {
        this.statCache.clear();
        this.readdirCache.clear();
    }
}

const takePart = (x) => x.part;
const emptyDynamicPart = [];

/**
 * @typedef PatternOptions
 * @property {Function} processor pattern/entry processor from the glob instance, it processes derived entries/patterns
 * @property {StaticPart} staticPart static part of the pattern
 * @property {Array<StaticValue | DynamicValue>} dynamicPart dynamic part of the pattern
 * @property {Runtime} runtime runtime options from the glob
 * @property {number} index index of the input pattern
 * @property {boolean} [insideGlobStar] whether we are inside **
 * @property {boolean} [root] whether the pattern is a root pattern, not derived from Pattern.process
 */

class Pattern {
    constructor(/** @type {PatternOptions} */{
        processor,
        staticPart,
        dynamicPart,
        runtime,
        index,
        insideGlobStar = false,
        root = false
    }) {
        this.processor = processor;
        this.staticPart = staticPart;
        this.runtime = runtime;
        this.root = root;
        this.index = index;
        this.insideGlobStar = insideGlobStar;
        this.dynamicPart = this.reduce(dynamicPart);
    }

    /**
     * Analyses the dynamic part to strip static values from it.
     * Reduces the number of syscalls
     * For example when "a/b/c" we dont have to read "a" and then "b" to determine that "c" exists
     * But an empty static value is a special case..
     *
     * @param {Array<DynamicValue | StaticValue>} dynamicPart
     * @returns {Array<DynamicValue | StaticValue>}
     */
    reduce(dynamicPart) {
        if (!dynamicPart.length) {
            return dynamicPart;
        }
        let i;
        for (i = 0; i < dynamicPart.length; ++i) {
            const part = dynamicPart[i];
            if (part instanceof DynamicValue || part.type === EMPTY) {
                break;
            }
        }
        if (i === 0) {
            return dynamicPart;
        }
        this.staticPart = this.staticPart.joinMany(dynamicPart.slice(0, i).map(takePart));
        return dynamicPart.slice(i);
    }

    producePattern(staticPart, dynamicPart, insideGlobStar) {
        const { processor, runtime, index } = this;
        processor(new Pattern({
            processor,
            dynamicPart,
            staticPart,
            runtime,
            index,
            insideGlobStar
        }));
    }

    produceEntry(staticPart, stat) {
        this.processor(new Entry({
            staticPart,
            index: this.index,
            stat
        }));
    }

    async lstat() {
        const { staticPart, runtime } = this;
        const { statCache } = runtime;
        const { absolute } = staticPart;

        if (statCache.has(absolute)) {
            return statCache.get(absolute);
        }
        const promise = fs.lstat(absolute).catch(identity);
        statCache.set(absolute, promise);
        return promise;
    }

    async stat() {
        const { staticPart, runtime } = this;
        const { statCache } = runtime;
        const { absolute } = staticPart;

        const key = `\x00stat\x00${absolute}`; // use the same cache for stat calls, but a prefixed key

        if (statCache.has(key)) {
            return statCache.get(key);
        }
        const promise = fs.stat(absolute).catch(identity);
        statCache.set(key, promise);
        return promise;
    }

    async readdir() {
        const { staticPart, runtime } = this;
        const { readdirCache } = runtime;
        const { absolute } = staticPart;

        if (readdirCache.has(absolute)) {
            return readdirCache.get(absolute);
        }
        const promise = fs.readdir(absolute).catch(identity);
        readdirCache.set(absolute, promise);
        return promise;
    }

    _handleDynamicPartUnderGlobstar(file, nextStaticPart, dynamicPart, childDirIgnored) {
        const { runtime } = this;

        // static part that includes the file and the same dynamic part
        this.producePattern(nextStaticPart, dynamicPart, true); // mark that we are inside globstar

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
                        this.producePattern(nextStaticPart, emptyDynamicPart);
                    } else {
                        this.produceEntry(nextStaticPart);
                    }
                } else {
                    this.producePattern(nextStaticPart, dynamicPart.slice(2));
                }
            }
        } else {
            // the dynamic part is only **, we have exact match
            // but we have no stat and dont know what it is, if we want stats we have to go further
            // also, directory symlinks are handled before

            if (runtime.stat || childDirIgnored) {
                this.producePattern(nextStaticPart, emptyDynamicPart);
            } else {
                this.produceEntry(nextStaticPart);
            }
        }
    }

    _handleDynamicPart(file, nextStaticPart, dynamicPart, childDirIgnored) {
        const { runtime } = this;

        // it matches the part, so we have less dynamic parts
        // if there are no other dynamic parts we have an exact match
        if (dynamicPart.length === 1) {
            // if child dir with the same name is ignored, we have to stat to determine whether this is a directory or not
            if (runtime.stat || childDirIgnored) {
                this.producePattern(nextStaticPart, emptyDynamicPart);
            } else {
                this.produceEntry(nextStaticPart);
            }
        } else {
            this.producePattern(nextStaticPart, dynamicPart.slice(1));
        }
    }

    _handleChildren(dynamicPart, files) {
        const { runtime, staticPart } = this;
        const { dot, isChildIgnored, isChildDirIgnored } = runtime;

        for (const file of files) {
            if (!dot && file[0] === ".") {
                if (dynamicPart[0].type === GLOBSTAR) {
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

            if (isChildIgnored(nextStaticPart.relative)) {
                continue;
            }

            if (dynamicPart[0].type === GLOBSTAR) {
                // **/smth
                this._handleDynamicPartUnderGlobstar(
                    file,
                    nextStaticPart,
                    dynamicPart,
                    isChildDirIgnored(nextStaticPart.relative)
                );
            } else if (dynamicPart[0].test(file)) {
                // smth
                this._handleDynamicPart(
                    file,
                    nextStaticPart,
                    dynamicPart,
                    isChildDirIgnored(nextStaticPart.relative)
                );
            }
        }
    }

    async _readAndHandleChildren(dynamicPart) {
        const files = await this.readdir();

        if (is.array(files)) {
            if (!files.length) {
                return;
            }
            return this._handleChildren(dynamicPart, files);
        }

        switch (files.code) {
            case "ELOOP": // can this appear here?
            case "ENAMETOOLONG": // can this appear here?
            case "UNKNOWN": // can this appear here?
            case "ENOENT": {
                // expected errors
                break;
            }
            default: {
                if (this.runtime.strict) {
                    throw files;
                }
            }
        }
    }

    _handleDir(stat, dynamicPart, files) {
        const { runtime, staticPart } = this;

        // now we know that this is a directory, we can check if it is ignored
        if (runtime.isChildDirIgnored(staticPart.relative)) {
            return;
        }

        switch (dynamicPart.length) {
            case 0: {
                // no dynamic parts, so emit the directory
                this.produceEntry(staticPart, stat);
                return;
            }
            case 1: {
                switch (dynamicPart[0].type) {
                    case EMPTY: {
                        // empty part means patterns like this a/, */ we have to emit only the directory itself
                        this.produceEntry(staticPart.join(""), stat);
                        return;
                    }
                    case CURRENT: {
                        // handle "."
                        this.producePattern(staticPart.join("."), dynamicPart.slice(1));
                        return;
                    }
                    case PREV: {
                        // handle ".."
                        this.producePattern(staticPart.join(".."), dynamicPart.slice(1));
                        return;
                    }
                    case GLOBSTAR: {
                        // dynamic part is **, emit the directory
                        // only root is marked with trailing / (virtual/** -> virtual/)
                        // but only if we have some relative part, because ** for the given cwd should not match / (cwd itself)
                        if (staticPart.relative) {
                            this.produceEntry(this.root ? staticPart.join("") : staticPart, stat);
                        }
                        break;
                    }
                }
                break;
            }
            default: { // >= 2
                switch (dynamicPart[0].type) {
                    case GLOBSTAR: {
                        switch (dynamicPart[1].type) {
                            case EMPTY: {
                                if (dynamicPart.length === 2) {
                                    // **/
                                    this.produceEntry(staticPart.join(""), stat);
                                } else {
                                    // **/smth
                                    this.producePattern(staticPart, [dynamicPart[0]].concat(dynamicPart.slice(2)));
                                    return;
                                }
                                break;
                            }
                            case GLOBSTAR: {
                                // consequent **/**
                                this.producePattern(staticPart, dynamicPart.slice(1));
                                return;
                            }
                            case CURRENT: {
                                this.producePattern(staticPart.join("."), dynamicPart.slice(2));
                                break;
                            }
                            case PREV: {
                                this.producePattern(staticPart.join(".."), dynamicPart.slice(2));
                                break;
                            }
                        }
                        break;
                    }
                    case EMPTY: {
                        // /
                        this.producePattern(staticPart, dynamicPart.slice(1));
                        break;
                    }
                    case CURRENT: {
                        // handle "."
                        this.producePattern(staticPart.join("."), dynamicPart.slice(1));
                        return;
                    }
                    case PREV: {
                        // handle ".."
                        this.producePattern(staticPart.join(".."), dynamicPart.slice(1));
                        return;
                    }
                }
            }
        }

        // files can come from _handleAsDir or not in case of _handleAsFile

        if (files) {
            return this._handleChildren(dynamicPart, files);
        }
        return this._readAndHandleChildren(dynamicPart);
    }

    async _handleSymlink(stat) {
        const { runtime, insideGlobStar, dynamicPart } = this;

        const targetStat = await this.stat();

        if (is.error(targetStat)) {
            switch (targetStat.code) {
                case "ELOOP": // symlink loop
                case "ENOTDIR": // symlink refers to a directory that does not exist, but exists a file with the same name, dead link
                case "ENOENT": { // symlink refers to a file that does not exist, dead link
                    // expected errors
                    break;
                }
                default: {
                    if (runtime.strict) {
                        throw targetStat;
                    }
                }
            }
        } else if (targetStat.isDirectory()) {
            if (insideGlobStar) {
                if (runtime.follow) {
                    return this._handleDir(targetStat, dynamicPart);
                }
                // if we do not follow symlinks, then we just stop the recursion here
                // remove globstar from the dynamic part and follow the rest
                return this._handleDir(targetStat, dynamicPart.slice(1));

            }
            return this._handleDir(targetStat, dynamicPart);
        }
        return this._handleExistingFile(stat);
    }

    async _handleAsFile() {
        // we dont know whether it exists or not

        const { runtime } = this;

        const stat = await this.lstat();

        if (is.error(stat)) {
            switch (stat.code) {
                case "ENOTDIR": // we tried to stat a directory wich does not exist, the path has / at the end
                case "ELOOP": // too many links, symlink loop
                case "ENOENT": { // unexistent file was requested, must be race condition
                    // expected errors
                    break;
                }
                default: {
                    if (runtime.strict) {
                        throw stat;
                    }
                }
            }
            return;
        }

        switch (stat.mode & S_IFMT) {
            case S_IFDIR: {
                return this._handleDir(stat, this.dynamicPart);
            }
            case S_IFLNK: {
                // handle symlink following for symlinks to directories
                return this._handleSymlink(stat);
            }
            default: {
                return this._handleExistingFile(stat);
            }
        }
    }

    async _handleExistingFile(stat) {
        // we know it exists, this is not a directory

        const { staticPart, dynamicPart, runtime } = this;
        const { absolute } = staticPart;

        if (dynamicPart.length !== 0 || absolute.endsWith("/")) {
            // there are some dynamic parts that must be resolved,
            // or it ends with /, means it must be a directory
            return;
        }
        if (runtime.stat && !stat) {
            stat = await fs.lstat(absolute);
        }
        this.produceEntry(this.staticPart, stat);
    }

    async _handleAsDir() {
        // symlink directories restrictions are handled before
        // here we can have symlink directory

        const { runtime } = this;

        const files = await this.readdir();

        if (is.array(files)) {
            if (!runtime.stat) {
                return this._handleDir(undefined, this.dynamicPart, files);
            }
            return this._handleDir(await this.lstat(), this.dynamicPart, files);
        }

        // files is an error

        switch (files.code) {
            case "ENOTSUP": // https://github.com/isaacs/node-glob/issues/205
            case "ENOTDIR": {
                // this is not a directory but it exists
                return this._handleExistingFile();
            }
            case "ELOOP":
            case "ENAMETOOLONG":
            case "UNKNOWN":
            case "ENOENT": {
                // expected errors
                break;
            }
            default: {
                if (runtime.strict) {
                    throw files;
                }
            }
        }
    }

    async process() {
        const { insideGlobStar, runtime, dynamicPart } = this;

        /**
         * 2 ways
         * 1. readdir and then determine what it is by the result
         * 2. lstat and then we also know what it is
         *
         * the first way can reduce the number of syscalls:
         * if the entry is a directory it will be read and throw if it is not a directory
         * if it throws we know either it exists or not, so we can reduce stat calls
         *
         * the second way requires lstat and only then readdir,
         * but for some cases, like "*", we can find what we want only by a readdir call
         *
         * but if we are inside ** and the follow option is disabled we have to know exactly what it is,
         * because if it is a symlink to a directory we must stop the recursion here, so just use the first way
         *
         * and if there are no dynamic parts we handle it as a file, just stat and emit if it is ok
         */
        if (
            (insideGlobStar && !runtime.follow)
            || dynamicPart.length === 0
        ) {
            return this._handleAsFile();
        }

        return this._handleAsDir();
    }

    inspect() {
        return `<Pattern "${joinMany([this.staticPart.relative, ...this.dynamicPart.map(takePart)])}">`;
    }
}

const absoluteGetter = (entry) => entry.absolutePath;
const relativeGetter = (entry) => entry.path;
const normalizedAbsoluteGetter = (entry) => entry.normalizedAbsolute;
const normalizedRelativeGetter = (entry) => entry.normalizedRelative;
const defaultRoot = is.windows ? resolve("/").slice(0, -1) : resolve("/");

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
        index = false,
        root = defaultRoot
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

        /** @type {(x: string) => boolean} */
        let isIgnored = adone.falsely;

        /** @type {(x: string) => boolean} */
        let isChildIgnored = adone.falsely;

        /** @type {(x: string) => boolean} */
        let isChildDirIgnored = adone.falsely;

        if (ignoreList.length) {
            const childPatterns = [];
            const childDirPatterns = [];
            const overallPatterns = [];
            for (const pattern of ignoreList) {
                const normalizedPattern = normalize(pattern);
                const re = util.match.makeRe(normalizedPattern, { dot: true });

                // in this case we can exclude entrire subtrees while walking
                if (normalizedPattern.endsWith("/**")) {
                    childPatterns.push(re); // for childs

                    const dirRe = util.match.makeRe(normalizedPattern.slice(0, -3), { dot: true }); // for child dir
                    childDirPatterns.push(dirRe);

                } else if (normalizedPattern.endsWith("/**/*")) {
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
        this.runtime = new Runtime({
            isChildIgnored,
            isChildDirIgnored,
            dot,
            stat: stat || nodir, // if nodir is enabled we have to stat all the entries to know where directories are
            strict,
            follow
        });

        this.nodir = nodir;
        this.cwd = removeTrailingSlashes(normalize(resolve(cwd)));
        this.unique = unique;
        this.rawEntries = rawEntries || stat || index;
        this.absolute = absolute;
        this.normalized = normalized;
        this.root = root === defaultRoot
            ? root
            : `${removeTrailingSlashes(normalize(resolve(this.cwd, root)))}/`;
        this._ended = false;
        this._paused = true;
        this._resumeScheduled = false;
        this._pausedAfterResume = false;
        this._endEmitted = false;

        this._processes = 0;
        this.__processor = (x) => this._processor(x);
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
            const normalizedPattern = normalize(matchPatterns[i]);
            const expanded = util.braces.expand(normalizedPattern);
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

    /**
     * @param {string} pattern
     * @param {number} index
     */
    _getFirstPattern(pattern, index) {
        // const normalizedPattern = pattern;
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
            if (isAbsolute(pattern)) { // the pattern is absolute
                /**
                 * when the pattern starts with /, parts[0] is empty
                 * on windows we can have absolute paths like C:\ D:\ and parts[0] is C: or D:, so it will be handled properly
                 * and paths like \ are also handled properly, here parts[0] is empty
                 */
                if (parts[0]) { // custom root on windows C:, D: or something else
                    absoluteStaticPart = `${parts[0]}/`;
                } else {
                    absoluteStaticPart = this.root;
                }
                if (parts.length > 1) {
                    absoluteStaticPart = joinAbsolute(absoluteStaticPart, joinMany(parts.slice(1, i)));
                }
                relativeStaticPart = absoluteStaticPart;
            } else { // the pattern is relative
                relativeStaticPart = joinMany(parts.slice(0, i));
                absoluteStaticPart = joinAbsolute(this.cwd, relativeStaticPart);
            }
        }
        const staticPart = new StaticPart(absoluteStaticPart, relativeStaticPart);
        const dynamicPart = this._normalizeDynamicPart(parts.slice(i)).map((x) => {
            if (is.glob(x)) {
                return new DynamicValue(x);
            }
            return new StaticValue(x);
        });
        return new Pattern({
            processor: this.__processor,
            staticPart,
            dynamicPart,
            runtime: this.runtime,
            index,
            insideGlobStar: false,
            root: true
        });
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
        if (this.nodir && sub.stat.isDirectory()) { // if nodir is set, stats are always present
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

        let value;

        if (this.rawEntries) {
            value = is.windows ? sub.toWindowsPaths() : sub;
        } else {
            value = is.windows ? toWindowsPaths(path) : path;
        }

        if (this._paused) {
            this.emitQueue.push(value);
        } else {
            this.emit("match", value);
        }
    }

    async process(pattern) {
        ++this._processes;
        await pattern.process().catch(this.__onError);
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
