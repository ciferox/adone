const { is, noop } = adone;

const irregularPlurals = {
    addendum: "addenda",
    aircraft: "aircraft",
    alga: "algae",
    alumna: "alumnae",
    alumnus: "alumni",
    amoeba: "amoebae",
    analysis: "analyses",
    antenna: "antennae",
    antithesis: "antitheses",
    apex: "apices",
    appendix: "appendices",
    axis: "axes",
    bacillus: "bacilli",
    bacterium: "bacteria",
    barracks: "barracks",
    basis: "bases",
    beau: "beaux",
    bison: "bison",
    bureau: "bureaus",
    cactus: "cacti",
    calf: "calves",
    child: "children",
    château: "châteaus",
    cherub: "cherubim",
    codex: "codices",
    concerto: "concerti",
    corpus: "corpora",
    crisis: "crises",
    criterion: "criteria",
    curriculum: "curricula",
    datum: "data",
    deer: "deer",
    diagnosis: "diagnoses",
    die: "dice",
    dwarf: "dwarfs",
    echo: "echoes",
    elf: "elves",
    elk: "elk",
    ellipsis: "ellipses",
    embargo: "embargoes",
    emphasis: "emphases",
    erratum: "errata",
    "faux pas": "faux pas",
    fez: "fezes",
    firmware: "firmware",
    fish: "fish",
    focus: "foci",
    foot: "feet",
    formula: "formulae",
    fungus: "fungi",
    gallows: "gallows",
    genus: "genera",
    goose: "geese",
    graffito: "graffiti",
    grouse: "grouse",
    half: "halves",
    hero: "heroes",
    hoof: "hooves",
    hypothesis: "hypotheses",
    index: "indices",
    knife: "knives",
    larva: "larvae",
    leaf: "leaves",
    libretto: "libretti",
    life: "lives",
    loaf: "loaves",
    locus: "loci",
    louse: "lice",
    man: "men",
    matrix: "matrices",
    means: "means",
    medium: "media",
    memorandum: "memoranda",
    minutia: "minutiae",
    moose: "moose",
    mouse: "mice",
    nebula: "nebulae",
    neurosis: "neuroses",
    news: "news",
    nucleus: "nuclei",
    oasis: "oases",
    offspring: "offspring",
    opus: "opera",
    ovum: "ova",
    ox: "oxen",
    paralysis: "paralyses",
    parenthesis: "parentheses",
    phenomenon: "phenomena",
    phylum: "phyla",
    potato: "potatoes",
    prognosis: "prognoses",
    quiz: "quizzes",
    radius: "radii",
    referendum: "referenda",
    salmon: "salmon",
    scarf: "scarves",
    self: "selves",
    series: "series",
    sheep: "sheep",
    shelf: "shelves",
    shrimp: "shrimp",
    species: "species",
    stimulus: "stimuli",
    stratum: "strata",
    swine: "swine",
    syllabus: "syllabi",
    symposium: "symposia",
    synopsis: "synopses",
    synthesis: "syntheses",
    tableau: "tableaus",
    that: "those",
    thesis: "theses",
    thief: "thieves",
    tomato: "tomatoes",
    tooth: "teeth",
    trout: "trout",
    tuna: "tuna",
    vertebra: "vertebrae",
    vertex: "vertices",
    veto: "vetoes",
    vita: "vitae",
    vortex: "vortices",
    wharf: "wharves",
    wife: "wives",
    wolf: "wolves",
    woman: "women"
};

// Массив собственных имён для plain-объекта (см. util.keys()).
const objectOwnProps = Object.getOwnPropertyNames({}.__proto__);

export const arrify = (val) => {
    if (is.undefined(val)) {
        return [];
    }
    return !is.array(val) ? [val] : val;
};

export const slice = (args, sliceStart = 0, sliceEnd) => {
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
};

export const normalizePath = (str, stripTrailing = false) => {
    if (typeof str !== "string") {
        throw new TypeError("path must be a string");
    }
    str = str.replace(/[\\\/]+/g, "/");
    if (stripTrailing) {
        str = str.replace(/\/$/, "");
    }
    return str;
};

export const unixifyPath = (filePath, unescape = false) => {
    if (is.win32 || adone.std.path.sep === "\\") {
        return normalizePath(filePath);
    }
    if (unescape) {
        return filePath ? filePath.toString().replace(/\\(\w)/g, "$1") : "";
    }
    return filePath;
};

export const functionName = (fn) => {
    if (typeof fn !== "function") {
        throw new TypeError("expected a function");
    }

    let fnName = fn.displayName || fn.name || (/function ([^\(]+)?\(/.exec(fn.toString()) || [])[1] || null;
    fnName = fnName ? fnName.replace(/^bound/, "") : "";
    fnName = fnName ? fnName.trim() : "";
    return fnName;
};

export const mapArguments = (argmap) => {
    if (is.function(argmap)) {
        return argmap;
    } else if (is.numeral(argmap)) {
        return () => slice(arguments, 0, argmap);
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
};

export const parseMs = (ms) => {
    if (!is.number(ms)) {
        throw new TypeError(`${ms} is not a number`);
    }

    const roundTowardZero = ms > 0 ? Math.floor : Math.ceil;

    return {
        days: roundTowardZero(ms / 86400000),
        hours: roundTowardZero(ms / 3600000) % 24,
        minutes: roundTowardZero(ms / 60000) % 60,
        seconds: roundTowardZero(ms / 1000) % 60,
        milliseconds: roundTowardZero(ms) % 1000
    };
};

export const pluralizeWord = (str, plural, count) => {
    if (is.number(plural)) {
        count = plural;
    }

    if (str in irregularPlurals) {
        plural = irregularPlurals[str];
    } else if (!is.string(plural)) {
        plural = (`${str.replace(/(?:s|x|z|ch|sh)$/i, "$&e").replace(/([^aeiou])y$/i, "$1ie")}s`)
            .replace(/i?e?s$/i, (m) => {
                const isTailLowerCase = str.slice(-1) === str.slice(-1).toLowerCase();
                return isTailLowerCase ? m.toLowerCase() : m.toUpperCase();
            });
    }

    return count === 1 ? str : plural;
};

export const functionParams = (func) => {
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
};

export const random = (min = 0, max = 0xFFFFFFFF) => {
    min >>>= 0;
    max >>>= 0;
    const b = adone.std.crypto.randomBytes(4);
    const val = (b[0] | b[1] << 8 | b[2] << 16 | b[3] << 24) >>> 0;
    return min + (val % (max - min));
};

export const randomChoice = (arrayLike, from = 0, to = arrayLike.length) => arrayLike[random(from, to)];

export const shuffleArray = (array) => {
    if (!array.length) {
        return array;
    }
    for (let i = 0; i < array.length - 1; ++i) {
        const j = random(i, array.length);
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
};

export const enumerate = function*(iterable, start = 0) {
    let i = start;
    for (const a of iterable) {
        yield [i++, a];
    }
};

export const zip = function*(...iterables) {
    if (iterables.length === 0) {
        return;
    }
    const iterators = iterables.map((obj) => {
        if (!is.iterable(obj)) {
            throw new adone.x.InvalidArgument("Only iterables are supported");
        }
        return obj[Symbol.iterator]();
    });
    const tmp = [];
    while (true) {  // eslint-disable-line
        let finish = false;
        for (let i = 0; i < iterators.length; ++i) {
            const it = iterators[i];
            if (finish) {
                if (it.return) {
                    it.return();
                }
                continue;
            }
            const { value, done } = it.next();
            if (done) {
                finish = true;
                continue;
            }
            tmp.push(value);
        }
        if (finish) {
            return;
        }
        yield tmp.slice();
        tmp.length = 0;
    }
};

export const keys = (object, { onlyEnumerable = true, followProto = false, all = false } = {}) => {
    if (is.nil(object)) {
        return [];
    }

    if (all) {
        [onlyEnumerable, followProto] = [false, true];
    }

    if (!followProto) {
        if (onlyEnumerable) {
            return Object.keys(object);
        }
        return Object.getOwnPropertyNames(object);
    }

    const props = new Set();

    if (onlyEnumerable) {
        for (const prop in object) {
            props.add(prop);
        }
    } else {
        const { getOwnPropertyNames: fetchKeys } = Object;
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
    }

    return [...props];
};

export const values = (obj, options) => keys(obj, options).map((k) => obj[k]);

export const entries = (obj, options) => keys(obj, options).map((k) => [k, obj[k]]);

export const toDotNotation = (object) => {
    const result = {};
    const stack = new adone.collection.Stack([[object, ""]]);
    while (!stack.empty) {
        const [object, prefix] = stack.pop();
        const it = is.array(object) ? enumerate(object) : entries(object);
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
};

export const flatten = (array, { depth = 1 } = {}) => {
    const result = [];
    for (let i = 0; i < array.length; ++i) {
        let item = array[i];
        if (is.array(item)) {
            if (depth > 1) {
                item = flatten(item, { depth: depth - 1 });
            }
            result.push(...item);
        } else {
            result.push(item);
        }
    }
    return result;
};

export const globParent = (str) => {
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
};

export const by = (by, compare) => {
    compare = compare || Object.compare;
    by = by || adone.identity;
    const compareBy = (a, b) => compare(by(a), by(b));
    compareBy.compare = compare;
    compareBy.by = by;
    return compareBy;
};

export const readdir = (root, {
    fileFilter = () => true,
    directoryFilter = () => true,
    depth: maximumDepth = Infinity,
    entryType = "files",
    lstat = false
} = {}) => {
    const bothEntries = entryType === "both" || entryType === "all";
    const fileEntries = bothEntries || entryType === "files";
    const directoryEntries = bothEntries || entryType === "directories";
    const normalizeFilter = (filter) => {
        filter = arrify(filter);
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
    };

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
};

export const toFastProperties = (obj: Object): void => {
    function f() { }
    f.prototype = obj;
    new f();
    return;
    eval(obj);
};

export const stripBom = (x) => {
    if (x.charCodeAt(0) === 0xFEFF) {
        return x.slice(1);
    }
    return x;
};

export const sortKeys = (object: Object, { deep = false, compare }: { deep: boolean; compare: ?Function } = {}): Object => {
    const obj = {};
    const keys = Object.keys(object).sort(compare);
    for (const key of keys) {
        obj[key] = deep && is.object(obj[key]) ? sortKeys(object[key]) : object[key];
    }
    return obj;
};

export const globize = (path, { exts = ".js", recursive = false } = {}) => {
    const stars = recursive ? `**${adone.std.path.sep}*${exts}` : `*${exts}`;
    if (path.endsWith("/") || path.endsWith("\\")) {
        path += stars;
    } else {
        path += `${adone.std.path.sep}${stars}`;
    }
    return path;
};

export const unique = (array, projection = null) => {
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
};

export const invertObject = (source, options) => {
    const dest = {};
    for (const key of keys(source, options)) {
        dest[source[key]] = key;
    }
    return dest;
};

export const humanizeTime = (ms, opts) => {
    if (!is.finite(ms)) {
        throw new TypeError(`${ms} is not finite number`);
    }

    opts = opts || {};

    if (ms < 1000) {
        const msDecimalDigits = is.number(opts.msDecimalDigits) ? opts.msDecimalDigits : 0;
        return (msDecimalDigits ? ms.toFixed(msDecimalDigits) : Math.ceil(ms)) + (opts.verbose ? ` ${pluralizeWord("millisecond", Math.ceil(ms))}` : "ms");
    }

    const ret = [];

    const add = function (val, long, short, valStr) {
        if (val === 0) {
            return;
        }

        const postfix = opts.verbose ? ` ${pluralizeWord(long, val)}` : short;

        ret.push((valStr || val) + postfix);
    };

    const parsed = parseMs(ms);

    add(parsed.days, "day", "d");
    add(parsed.hours, "hour", "h");
    add(parsed.minutes, "minute", "m");

    if (opts.compact) {
        add(parsed.seconds, "second", "s");
        return `~${ret[0]}`;
    }

    const sec = ms / 1000 % 60;
    const secDecimalDigits = is.number(opts.secDecimalDigits) ? opts.secDecimalDigits : 1;
    const secStr = sec.toFixed(secDecimalDigits).replace(/\.0$/, "");
    add(sec, "second", "s", secStr);

    return ret.join(" ");
};

export const humanizeSize = (num, space = " ") => {
    if (!is.number(num) || is.nan(num)) {
        throw new TypeError(`${num} is not a a number`);
    }

    const neg = num < 0;
    const units = ["B", "kB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

    if (neg) {
        num = -num;
    }

    if (num < 1) {
        return `${(neg ? "-" : "") + num + space}B`;
    }

    const exponent = Math.min(Math.floor(Math.log(num) / Math.log(1024)), units.length - 1);
    num = Number((num / Math.pow(1024, exponent)).toFixed(2));
    const unit = units[exponent];

    return (neg ? "-" : "") + num + space + unit;
};

export const humanizeAddr = (protocol, port, host) => {
    let addr;
    protocol = protocol || "tcp:";
    if (!protocol.endsWith(":")) {
        protocol += ":";
    }
    if (is.number(port)) {
        addr = adone.sprintf("%s//%s:%d", protocol, host, port);
    } else {
        addr = adone.sprintf("%s//%s", protocol, port);
    }
    return addr;
};

export const clone = (obj, { deep = true } = {}) => {
    if (!is.object(obj)) {
        return obj;
    }
    if (is.array(obj)) {
        if (deep) {
            return obj.map((x) => clone(x, { deep }));
        }
        return obj.slice(0);
    }
    if (is.function(obj)) {
        return obj;
    }
    const res = {};
    for (const key of keys(obj)) {
        res[key] = deep ? clone(obj[key], { deep }) : obj[key];
    }
    return res;
};

export const toUTF8Array = (str) => {
    let char;
    let i = 0;
    const utf8 = [];
    const len = str.length;

    while (i < len) {
        char = str.charCodeAt(i++);
        if (char < 0x80) {
            utf8.push(char);
        } else if (char < 0x800) {
            utf8.push(
                0xc0 | (char >> 6),
                0x80 | (char & 0x3f)
            );
        } else if (char < 0xd800 || char >= 0xe000) {
            utf8.push(
                0xe0 | (char >> 12),
                0x80 | ((char >> 6) & 0x3f),
                0x80 | (char & 0x3f)
            );
        } else { // surrogate pair
            i++;
            char = 0x10000 + (((char & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
            utf8.push(
                0xf0 | (char >> 18),
                0x80 | ((char >> 12) & 0x3f),
                0x80 | ((char >> 6) & 0x3f),
                0x80 | (char & 0x3f)
            );
        }
    }

    return utf8;
};

export const asyncIter = (arr, iter, cb) => {
    let i = -1;

    const next = () => {
        i++;

        if (i < arr.length) {
            iter(arr[i], i, next, cb);
        } else {
            cb();
        }
    };

    next();
};

export const asyncFor = (obj, iter, cb) => {
    const keys_ = keys(obj);
    const { length } = keys_;
    let i = -1;

    const next = () => {
        i++;
        const k = keys_[i];

        if (i < length) {
            iter(k, obj[k], i, length, next);
        } else {
            cb();
        }
    };

    next();
};

export const once = (fn, { silent = true } = {}) => {
    let called = false;
    return function onceWrapper(...args) {
        if (called) {
            if (!silent) {
                throw new adone.x.IllegalState("Callback has been already called");
            }
            return;
        }
        called = true;
        return fn.apply(this, args);
    };
};

export const asyncWaterfall = (tasks, callback = noop) => {
    if (!is.array(tasks)) {
        return callback(new adone.x.InvalidArgument("First argument to waterfall must be an array of functions"));
    }
    if (!tasks.length) {
        return callback();
    }

    let taskIndex = 0;

    const nextTask = (args) => {
        if (taskIndex === tasks.length) {
            return callback(null, ...args);
        }

        const taskCallback = once((err, ...args) => {
            if (err) {
                return callback(err, ...args);
            }
            nextTask(args);
        }, { silent: false });

        args.push(taskCallback);

        const task = tasks[taskIndex++];
        task(...args);
    };

    nextTask([]);
};

adone.lazify({
    match: "./match",
    realpath: "./realpath",
    throat: "./throat",
    toposort: "./toposort",
    jsesc: "./jsesc",
    Mode: "./mode",
    typeOf: "./typeof",
    deepEqual: "./deep_equal",
    diff: "./diff",
    memcpy: "./memcpy",
    microtime: "./microtime",
    uuid: "./uuid",
    userid: "./userid",
    StreamSearch: "./streamsearch",
    delegate: "./delegate",
    GlobExp: "./globexp",
    iconv: "./iconv",
    sqlstring: "./sqlstring",
    Editor: "./editor",
    binarySearch: "./binary_search"
}, exports, require);
