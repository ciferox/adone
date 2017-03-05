import adone from "adone";
const { is } = adone;

const irregularPlurals = adone.o({
    "addendum": "addenda",
    "aircraft": "aircraft",
    "alga": "algae",
    "alumna": "alumnae",
    "alumnus": "alumni",
    "amoeba": "amoebae",
    "analysis": "analyses",
    "antenna": "antennae",
    "antithesis": "antitheses",
    "apex": "apices",
    "appendix": "appendices",
    "axis": "axes",
    "bacillus": "bacilli",
    "bacterium": "bacteria",
    "barracks": "barracks",
    "basis": "bases",
    "beau": "beaux",
    "bison": "bison",
    "bureau": "bureaus",
    "cactus": "cacti",
    "calf": "calves",
    "child": "children",
    "château": "châteaus",
    "cherub": "cherubim",
    "codex": "codices",
    "concerto": "concerti",
    "corpus": "corpora",
    "crisis": "crises",
    "criterion": "criteria",
    "curriculum": "curricula",
    "datum": "data",
    "deer": "deer",
    "diagnosis": "diagnoses",
    "die": "dice",
    "dwarf": "dwarfs",
    "echo": "echoes",
    "elf": "elves",
    "elk": "elk",
    "ellipsis": "ellipses",
    "embargo": "embargoes",
    "emphasis": "emphases",
    "erratum": "errata",
    "faux pas": "faux pas",
    "fez": "fezes",
    "firmware": "firmware",
    "fish": "fish",
    "focus": "foci",
    "foot": "feet",
    "formula": "formulae",
    "fungus": "fungi",
    "gallows": "gallows",
    "genus": "genera",
    "goose": "geese",
    "graffito": "graffiti",
    "grouse": "grouse",
    "half": "halves",
    "hero": "heroes",
    "hoof": "hooves",
    "hypothesis": "hypotheses",
    "index": "indices",
    "knife": "knives",
    "larva": "larvae",
    "leaf": "leaves",
    "libretto": "libretti",
    "life": "lives",
    "loaf": "loaves",
    "locus": "loci",
    "louse": "lice",
    "man": "men",
    "matrix": "matrices",
    "means": "means",
    "medium": "media",
    "memorandum": "memoranda",
    "minutia": "minutiae",
    "moose": "moose",
    "mouse": "mice",
    "nebula": "nebulae",
    "neurosis": "neuroses",
    "news": "news",
    "nucleus": "nuclei",
    "oasis": "oases",
    "offspring": "offspring",
    "opus": "opera",
    "ovum": "ova",
    "ox": "oxen",
    "paralysis": "paralyses",
    "parenthesis": "parentheses",
    "phenomenon": "phenomena",
    "phylum": "phyla",
    "potato": "potatoes",
    "prognosis": "prognoses",
    "quiz": "quizzes",
    "radius": "radii",
    "referendum": "referenda",
    "salmon": "salmon",
    "scarf": "scarves",
    "self": "selves",
    "series": "series",
    "sheep": "sheep",
    "shelf": "shelves",
    "shrimp": "shrimp",
    "species": "species",
    "stimulus": "stimuli",
    "stratum": "strata",
    "swine": "swine",
    "syllabus": "syllabi",
    "symposium": "symposia",
    "synopsis": "synopses",
    "synthesis": "syntheses",
    "tableau": "tableaus",
    "that": "those",
    "thesis": "theses",
    "thief": "thieves",
    "tomato": "tomatoes",
    "tooth": "teeth",
    "trout": "trout",
    "tuna": "tuna",
    "vertebra": "vertebrae",
    "vertex": "vertices",
    "veto": "vetoes",
    "vita": "vitae",
    "vortex": "vortices",
    "wharf": "wharves",
    "wife": "wives",
    "wolf": "wolves",
    "woman": "women"
});

// Массив собственных имён для plain-объекта (см. util.keys()).
const objectOwnProps = Object.getOwnPropertyNames({}.__proto__);

const util = adone.o({
    arrify: (val) => {
        if (is.undefined(val)) {
            return [];
        }
        return !is.array(val) ? [val] : val;
    },
    slice: (args, sliceStart = 0, sliceEnd) => {
        const ret = [];
        let len = args.length;

        if (len === 0) {
            return [];
        }

        const start = (sliceStart < 0 ? Math.max(0, sliceStart + len) : sliceStart);

        if (!is.undefined(sliceEnd)) {
            len = sliceEnd < 0 ? sliceEnd + len : sliceEnd;
        }

        while (len-- > start) {
            ret[len - start] = args[len];
        }

        return ret;
    },
    normalizePath: (str, stripTrailing = false) => {
        if (typeof str !== "string") {
            throw new TypeError("path must be a string");
        }
        str = str.replace(/[\\\/]+/g, "/");
        if (stripTrailing) {
            str = str.replace(/\/$/, "");
        }
        return str;
    },
    unixifyPath: (filePath, unescape = false) => {
        if (is.win32 || adone.std.path.sep === "\\") {
            return util.normalizePath(filePath);
        }
        if (unescape) {
            return filePath ? filePath.toString().replace(/\\(\w)/g, "$1") : "";
        }
        return filePath;
    },
    functionName: (fn) => {
        if (typeof fn !== "function") {
            throw new TypeError("expected a function");
        }

        let fnName = fn.displayName || fn.name || (/function ([^\(]+)?\(/.exec(fn.toString()) || [])[1] || null;
        fnName = fnName ? fnName.replace(/^bound/, "") : "";
        fnName = fnName ? fnName.trim() : "";
        return fnName;
    },
    mapArguments: (argmap) => {
        if (is.function(argmap)) {
            return argmap;
        } else if (is.numeral(argmap)) {
            return () => util.slice(arguments, 0, argmap);
        } else if (is.array(argmap)) {
            return () => {
                const args = arguments;
                return argmap.reduce((ctx, hint, idx) => {
                    ctx[hint] = args[idx];
                    return ctx;
                }, {});
            };
        }

        return (x) => x;
    },
    parseMs: (ms) => {
        if (!is.number(ms)) {
            throw new TypeError(ms + " is not a number");
        }

        const roundTowardZero = ms > 0 ? Math.floor : Math.ceil;

        return {
            days: roundTowardZero(ms / 86400000),
            hours: roundTowardZero(ms / 3600000) % 24,
            minutes: roundTowardZero(ms / 60000) % 60,
            seconds: roundTowardZero(ms / 1000) % 60,
            milliseconds: roundTowardZero(ms) % 1000
        };
    },
    pluralizeWord: (str, plural, count) => {
        if (is.number(plural)) {
            count = plural;
        }

        if (str in irregularPlurals) {
            plural = irregularPlurals[str];
        } else if (!is.string(plural)) {
            plural = (str.replace(/(?:s|x|z|ch|sh)$/i, "$&e").replace(/([^aeiou])y$/i, "$1ie") + "s")
                .replace(/i?e?s$/i, (m) => {
                    const isTailLowerCase = str.slice(-1) === str.slice(-1).toLowerCase();
                    return isTailLowerCase ? m.toLowerCase() : m.toUpperCase();
                });
        }

        return count === 1 ? str : plural;
    },
    functionParams: (func) => {
        let str = func;
        if (typeof str !== "string") {
            str = str.toString();
        }
        str = str.replace(/(\/\/.*$)|(\/\*[\s\S]*?\*\/)|(\s*=[^,\)]*(("(?:\\"|[^"\r\n])*")|("(?:\\"|[^"\r\n])*"))|(\s*=[^,\)]*))/mg, "").trim();
        if (str.indexOf("function") === 0) {
            str = str.match(/^function\s*[^\(]*\(\s*([^\)]*)\)/m)[1];
        } else if (str.indexOf("=>") > -1) {
            str = str.split("=>")[0].trim();
        }
        if (str[0] === "(" && str[str.length - 1] === ")") {
            str = str.slice(1, -1);
        }
        return str.length ? str.split(/,/g).map((p) => p.trim()) : [];
    },
    random: (min = 0, max = 0xFFFFFFFF) => {
        min >>>= 0;
        max >>>= 0;
        const b = adone.std.crypto.randomBytes(4);
        const val = (b[0] | b[1] << 8 | b[2] << 16 | b[3] << 24) >>> 0;
        return min + (val % (max - min));
    },
    /**
     * Прикрепляет индекс к каждому элементу из итератора
     *
     * @param {Iterable} iterable
     * @param {number} [start=0] - начальный индекс
     */
    *enumerate(iterable, start = 0) {
        let i = start;
        for (const a of iterable) {
            yield [i++, a];
        }
    },
    /**
     * Возвращает свойства объекта
     *
     * Без свойств new Object
     *
     * @param {Object} object
     * @returns {string[]} список свойств
     */
    keys: (object, { onlyEnumerable = true, followProto = false, all = false } = {}) => {
        if (is.nil(object)) {
            return [];
        }

        if (all) {
            [onlyEnumerable, followProto] = [false, true];
        }

        const fetchKeys = onlyEnumerable ? Object.keys : Object.getOwnPropertyNames;

        if (!followProto) {
            return fetchKeys(object);
        }

        const props = new Set();

        do {
            const ownKeys = fetchKeys(object);
            for (let i = 0; i < ownKeys.length; ++i) {
                props.add(ownKeys[i]);
            }
            const prototype = Object.getPrototypeOf(object);
            if (prototype) {
                const prototypeKeys = fetchKeys(prototype);
                for (let i = 0; i < prototypeKeys.length; ++i) {
                    props.add(prototypeKeys[i]);
                }
            }
            object = object.__proto__;
        } while (object);

        for (let i = 0; i < objectOwnProps.length; ++i) {
            props.delete(objectOwnProps[i]);  // what if the props are modified?
        }

        return [...props];
    },
    values: (obj, options) => util.keys(obj, options).map((k) => obj[k]),
    entries: (obj, options) => util.keys(obj, options).map((k) => [k, obj[k]]),
    /**
     * Приводит объект к dot-nation
     * @param {Object} object
     * @returns {Object}
     */
    toDotNotation: (object) => {
        const result = {};
        const stack = new adone.collection.Stack([[object, ""]]);
        while (!stack.empty) {
            const [object, prefix] = stack.pop();
            const it = is.array(object) ? util.enumerate(object) : util.entries(object);
            for (let [k, v] of it) {
                let nextPrefix;
                if (!is.identifier(k)) {
                    if (!is.number(k) && !is.digits(k)) {
                        k = `"${k}"`;
                    }
                    nextPrefix = prefix ? `${prefix}[${k}]` : `[${k}]`;
                } else {
                    nextPrefix = prefix ? `${prefix}.${k}` : k;
                }
                if (is.object(v)) {
                    stack.push([v, nextPrefix]);
                } else {
                    result[nextPrefix] = v;
                }
            }
        }
        return result;
    },
    /**
     * Flattens an array
     */
    flatten: (array) => {
        const result = [];
        for (const i of array) {
            if (is.array(i)) {
                result.push(...util.flatten(i));
            } else {
                result.push(i);
            }
        }
        return result;
    },
    /**
     * extract the non-magic parent path from a glob string.
     *
     * @param {string} str
     * @returns {string}
     */
    globParent(str) {
        // flip windows path separators
        if (is.win32 && str.indexOf("/") < 0) {
            str = str.split("\\").join("/");
        }

        // special case for strings ending in enclosure containing path separator
        if (/[\{\[].*[\/]*.*[\}\]]$/.test(str)) {
            str += "/";
        }

        // preserves full path in case of trailing path separator
        str += "a";

        // remove path parts that are globby
        do {
            str = adone.std.path.dirname(str);
        } while (is.glob(str) || /(^|[^\\])([\{\[]|\([^\)]+$)/.test(str));

        // remove escape chars and return result
        return str.replace(/\\([\*\?\|\[\]\(\)\{\}])/g, "$1");
    },
    by: (by, compare) => {
        compare = compare || Object.compare;
        by = by || adone.identity;
        const compareBy = (a, b) => compare(by(a), by(b));
        compareBy.compare = compare;
        compareBy.by = by;
        return compareBy;
    },
    readdir: (root, {
        fileFilter = () => true,
        directoryFilter = () => true,
        depth: maximumDepth = Infinity,
        entryType = "files",
        lstat = false
    } = {}) => {
        const bothEntries = entryType === "both" || entryType === "all";
        const fileEntries = bothEntries || entryType === "files";
        const directoryEntries = bothEntries || entryType === "directories";

        function normalizeFilter(filter) {
            filter = adone.util.arrify(filter);
            const functions = [];
            const other = [];
            for (const x of filter) {
                if (is.function(x)) {
                    functions.push(x);
                } else {
                    other.push(x);
                }
            }
            const matcher = adone.util.match(other);
            return (x) => functions.some((y) => y(x)) || matcher(x.name);  // cannot mix negate and other?
        }

        fileFilter = normalizeFilter(fileFilter);
        directoryFilter = normalizeFilter(directoryFilter);

        let resolvedRoot;
        let pending = 0;
        const source = adone.core().through(async function ([path, depth]) {
            --pending;
            const realPath = await adone.util.realpath.async(path);
            const relativePath = adone.std.path.relative(realPath, resolvedRoot);

            const files = await adone.std.fs.readdirAsync(path);
            const statMethod = lstat ? "lstatAsync" : "statAsync";

            await Promise.all(files.map((name) => {
                const fullPath = adone.std.path.join(realPath, name);
                const path = adone.std.path.join(relativePath, name);
                const parentDir = relativePath;
                const fullParentDir = realPath;
                return adone.std.fs[statMethod](fullPath).then((stat) => {
                    const entry = { name, fullPath, path, parentDir, fullParentDir, stat };
                    if (stat.isDirectory()) {
                        if (directoryEntries && directoryFilter(entry)) {
                            this.push(entry);
                        }
                        if (depth < maximumDepth && directoryFilter(entry)) {
                            ++pending;
                            source.write([fullPath, depth + 1]);
                        }
                    } else if (fileEntries && fileFilter(entry)) {
                        this.push(entry);
                    }
                }).catch((err) => {
                    if (err.code === "ENOENT") {
                        // deleted
                        return;
                    }
                    throw err;
                });
            }));
            if (!pending) {
                source.end();
            }
        });
        adone.util.realpath.async(root).then((_resolvedRoot) => {
            resolvedRoot = _resolvedRoot;
            ++pending;
            source.write([resolvedRoot, 0]);
        }).catch((err) => {
            source.emit("warn", err);
            source.end();
        });
        return source;
    },
    toFastProperties(obj: Object): void {
        function f() { }
        f.prototype = obj;
        new f();
        return;
        eval(obj);
    },
    stripBom(x) {
        if (x.charCodeAt(0) === 0xFEFF) {
            return x.slice(1);
        }
        return x;
    },
    sortKeys(object: Object, { deep = false, compare }: { deep: boolean; compare: ?Function } = {}): Object {
        const obj = {};
        const keys = Object.keys(object).sort(compare);
        for (const key of keys) {
            obj[key] = deep && is.object(obj[key]) ? util.sortKeys(object[key]) : object[key];
        }
        return obj;
    },
    /**
     * Pack an array to an Object
     *
     * @param {array} array
     * @return {object}
     * @example
     * ```js
     * > packObject(['a', 'b', 'c', 'd'])
     * { a: 'b', c: 'd' }
     * ```
     */
    packObject(array) {
        const result = {};
        const length = array.length;

        for (let i = 1; i < length; i += 2) {
            result[array[i - 1]] = array[i];
        }

        return result;
    },
    globize: (path, ext, recursive) => {
        const stars = recursive ? `**${adone.std.path.sep}*.${ext}` : `*.${ext}`;
        if (path.endsWith("/") || path.endsWith("\\")) {
            path += stars;
        } else {
            path += `${adone.std.path.sep}${stars}`;
        }
        return path;
    },
    unique: (array, projection = null) => {
        const tmp = new Set();
        const result = [];
        for (let i = 0; i < array.length; ++i) {
            const value = array[i];
            const hash = is.null(projection) ? value : projection(value);
            if (tmp.has(hash)) {
                continue;
            }
            result.push(value);
            tmp.add(hash);
        }
        return result;
    },
    invertObject: (source, options) => {
        const dest = {};
        for (const key of util.keys(source, options)) {
            dest[source[key]] = key;
        }
        return dest;
    }
});

adone.lazify({
    match: "./match.js",
    realpath: "./realpath.js",
    throat: "./throat.js",
    toposort: "./toposort",
    jsesc: "./jsesc",
    Mode: "./mode",
    typeDetect: "./type_detect",
    deepEqual: "./deep_equal",
    diff: "./diff",
    memcpy: "./memcpy",
    microtime: "./microtime",
    uuid: "./uuid",
    userid: "./userid",
    StreamSearch: "./streamsearch",
    delegate: "./delegate",
    GlobExp: "./globexp"
}, util, require);

export default util;
