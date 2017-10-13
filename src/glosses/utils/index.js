const { is, std, noop, collection } = adone;

const util = adone.lazify({
    matchPath: "./match_path",
    toposort: "./toposort",
    jsesc: "./jsesc",
    typeOf: "./typeof",
    memcpy: () => adone.native.Memory,
    uuid: "./uuid",
    userid: () => adone.native.UserId,
    StreamSearch: "./streamsearch",
    delegate: "./delegate",
    iconv: "./iconv",
    sqlstring: "./sqlstring",
    Editor: "./editor",
    binarySearch: "./binary_search",
    buffer: () => ({
        concat: (list, totalLength) => {
            const target = Buffer.allocUnsafe(totalLength);
            let offset = 0;

            for (let i = 0; i < list.length; i++) {
                const buf = list[i];
                buf.copy(target, offset);
                offset += buf.length;
            }

            return target;
        },
        mask: adone.native.Common.maskBuffer,
        unmask: adone.native.Common.unmaskBuffer
    }),
    shebang: "./shebang",
    reinterval: "./reinterval",
    RateLimiter: "./rate_limiter",
    throttle: "./throttle",
    fakeClock: "./fake_clock",
    ltgt: "./ltgt",
    LogRotator: "./log_rotator",
    debounce: "./debounce",
    Snapdragon: "./snapdragon",
    braces: "./braces",
    toRegex: "./to_regex",
    regexNot: "./regex_not",
    fillRange: "./fill_range",
    toRegexRange: "./to_regex_range",
    splitString: "./split_string",
    match: "./match",
    arrayDiff: "./array_diff",
    retry: "./retry"
}, adone.asNamespace(exports), require);

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

// About 1.5x faster than the two-arg version of Array#splice().
export const spliceOne = (list, index) => {
    for (let i = index, k = i + 1, n = list.length; k < n; i += 1, k += 1) {
        list[i] = list[k];
    }
    list.pop();
};

export const normalizePath = (str, stripTrailing = false) => {
    if (!is.string(str)) {
        throw new TypeError("path must be a string");
    }
    str = str.replace(/[\\/]+/g, "/");
    if (stripTrailing) {
        str = str.replace(/\/$/, "");
    }
    return str;
};

export const functionName = (fn) => {
    if (!is.function(fn)) {
        return null;
    }

    let fnName = fn.displayName || fn.name || (/function ([^(]+)?\(/.exec(fn.toString()) || [])[1] || null;
    fnName = fnName ? fnName.replace(/^bound/, "") : "";
    fnName = fnName ? fnName.trim() : "";
    return fnName;
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
    if (!is.string(str)) {
        str = str.toString();
    }
    str = str.replace(/(\/\/.*$)|(\/\*[\s\S]*?\*\/)|(\s*=[^,)]*(("(?:\\"|[^"\r\n])*")|("(?:\\"|[^"\r\n])*"))|(\s*=[^,)]*))/mg, "").trim();
    if (str.indexOf("function") === 0) {
        str = str.match(/^function\s*[^(]*\(\s*([^)]*)\)/m)[1];
    } else if (str.indexOf("=>") > -1) {
        str = str.split("=>")[0].trim();
    }
    if (str[0] === "(" && str[str.length - 1] === ")") {
        str = str.slice(1, -1);
    }
    return str.length ? str.split(/,/g).map((p) => p.trim()) : [];
};

export const randomChoice = (arrayLike, from = 0, to = arrayLike.length) => arrayLike[adone.math.random(from, to)];

export const shuffleArray = (array) => {
    if (!array.length) {
        return array;
    }
    for (let i = 0; i < array.length - 1; ++i) {
        const j = adone.math.random(i, array.length);
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
};

export const enumerate = function* (iterable, start = 0) {
    let i = start;
    for (const a of iterable) {
        yield [i++, a];
    }
};

export const zip = function* (...iterables) {
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

const _keys = (object, onlyEnumerable, followProto) => {
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
            props.delete(objectOwnProps[i]); // what if the props are modified?
        }
    }

    return [...props];
};

export const keys = (object, { onlyEnumerable = true, followProto = false, all = false } = {}) => {
    if (is.nil(object)) {
        return [];
    }

    if (all) {
        [onlyEnumerable, followProto] = [false, true];
    }

    return _keys(object, onlyEnumerable, followProto);
};

export const values = (object, { onlyEnumerable = true, followProto = false, all = false } = {}) => {
    if (is.nil(object)) {
        return [];
    }

    if (all) {
        [onlyEnumerable, followProto] = [false, true];
    }

    if (!followProto && onlyEnumerable) {
        return Object.values(object);
    }

    const k = _keys(object, onlyEnumerable, followProto);
    for (let i = 0; i < k.length; ++i) {
        k[i] = object[k[i]];
    }
    return k;
};

export const entries = (object, { onlyEnumerable = true, followProto = false, all = false } = {}) => {
    if (is.nil(object)) {
        return [];
    }

    if (all) {
        [onlyEnumerable, followProto] = [false, true];
    }

    if (!followProto && onlyEnumerable) {
        return Object.entries(object);
    }

    const k = _keys(object, onlyEnumerable, followProto);
    for (let i = 0; i < k.length; ++i) {
        const key = k[i];
        k[i] = [key, object[key]];
    }
    return k;
};

export const toDotNotation = (object) => {
    const result = {};
    const stack = collection.Stack.from([[object, ""]]);
    while (!stack.empty) {
        const [object, prefix] = stack.pop();
        const it = is.array(object) ? enumerate(object) : entries(object);
        for (let [k, v] of it) { // eslint-disable-line prefer-const
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

export const flatten = (array, { depth = Infinity } = {}) => {
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
    if (is.windows && !str.includes("/")) {
        str = str.split("\\").join("/");
    }

    // special case for strings ending in enclosure containing path separator
    if (/[{[].*[/]*.*[}\]]$/.test(str)) {
        str += "/";
    }

    // preserves full path in case of trailing path separator
    str += "a";

    // remove path parts that are globby
    do {
        str = std.path.dirname(str);
    } while (is.glob(str) || /(^|[^\\])([{[]|\([^)]+$)/.test(str));

    // remove escape chars and return result
    return str.replace(/\\([*?|[\](){}])/g, "$1");
};

export const toFastProperties = (() => {
    let fastProto = null;

    // Creates an object with permanently fast properties in V8. See Toon Verwaest's
    // post https://medium.com/@tverwaes/setting-up-prototypes-in-v8-ec9c9491dfe2#5f62
    // for more details. Use %HasFastProperties(object) and the Node.js flag
    // --allow-natives-syntax to check whether an object has fast properties.
    const FastObject = function (o) {
        // A prototype object will have "fast properties" enabled once it is checked
        // against the inline property cache of a function, e.g. fastProto.property:
        // https://github.com/v8/v8/blob/6.0.122/test/mjsunit/fast-prototype.js#L48-L63
        if (!is.null(fastProto) && typeof fastProto.property) {
            const result = fastProto;
            fastProto = FastObject.prototype = null;
            return result;
        }
        fastProto = FastObject.prototype = is.nil(o) ? Object.create(null) : o;
        return new FastObject();
    };

    // Initialize the inline property cache of FastObject
    FastObject();

    return (o) => FastObject(o);
})();

export const sortKeys = (object, { deep = false, compare } = {}) => {
    const obj = {};
    const keys = Object.keys(object).sort(compare);
    for (const key of keys) {
        obj[key] = deep && is.object(obj[key]) ? sortKeys(object[key]) : object[key];
    }
    return obj;
};

export const globize = (path, { exts = "", recursively = false } = {}) => {
    const stars = recursively ? `**${std.path.sep}*${exts}` : `*${exts}`;
    if (path.endsWith("/") || path.endsWith("\\")) {
        path += stars;
    } else {
        path += `${std.path.sep}${stars}`;
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

const sizeRegexp = /^(\d+|\d*\.\d+|\d+\.\d*)\s?((?:B|kB|MB|GB|TB|PB|EB|ZB|YB))?$/i;
const units = new Map();
{
    let val = 1;
    for (const sz of ["b", "kb", "mb", "gb", "tb", "pb", "eb", "zb", "yb"]) {
        units.set(sz, val);
        val *= 1024;
    }
}

export const parseSize = (str) => {
    if (is.number(str)) {
        return Math.floor(str);
    }
    if (!is.string(str)) {
        return null;
    }
    const match = str.match(sizeRegexp);
    if (is.null(match)) {
        return null;
    }

    const value = Number(match[1]);
    const unit = match[2];

    if (is.undefined(unit)) {
        return Math.floor(value);
    }

    return Math.floor(value * units.get(unit.toLowerCase()));
};

const timeRegExp = /^(\d+|\d*\.\d+|\d+\.\d*)\s?([^\d]*)$/i;

export const parseTime = (str) => {
    if (is.number(str)) {
        return Math.floor(str);
    }
    if (!is.string(str)) {
        return null;
    }
    const match = str.match(timeRegExp);
    if (is.null(match)) {
        return null;
    }
    const value = Number(match[1]);
    const unit = adone.datetime.normalizeUnits(match[2]);
    if (!unit) {
        return null;
    }
    return adone.datetime.duration(value, unit).as("milliseconds");
};

export const clone = (obj, { deep = true, nonPlainObjects = false, onlyEnumerable = true } = {}) => {
    if (!is.object(obj)) {
        return obj;
    }
    if (is.array(obj)) {
        if (deep) {
            return obj.map((x) => clone(x, { deep, nonPlainObjects, onlyEnumerable }));
        }
        return obj.slice(0);
    }
    if (is.function(obj)) {
        return obj;
    }
    if (is.regexp(obj)) {
        return new RegExp(obj.source, obj.flags);
    }
    if (is.buffer(obj)) {
        return Buffer.from(obj);
    }
    if (is.date(obj)) {
        return new Date(obj.getTime());
    }
    if (!nonPlainObjects && !is.plainObject(obj)) {
        return obj;
    }
    const res = {};
    for (const key of keys(obj, { onlyEnumerable })) {
        res[key] = deep ? clone(obj[key], { deep, nonPlainObjects, onlyEnumerable }) : obj[key];
    }
    return res;
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

export const xrange = function* (start = null, stop = null, step = 1) {
    if (is.null(stop)) {
        [start, stop] = [0, start];
    }

    if (step < 0) {
        for (let i = start; i > stop; i += step) {
            yield i;
        }
    } else {
        for (let i = start; i < stop; i += step) {
            yield i;
        }
    }
};

export const range = (start, stop, step) => [...xrange(start, stop, step)];

export const reFindAll = (regexp, str) => {
    const res = [];
    let match;
    do {
        match = regexp.exec(str);
        if (match) {
            res.push(match);
        }
    } while (match);
    return res;
};

export const assignDeep = (target, ...sources) => {
    target = target || {};
    for (const src of sources) {
        if (!is.plainObject(src)) {
            continue;
        }
        for (const [key, value] of entries(src)) {
            if (is.plainObject(value) && is.plainObject(target[key])) {
                assignDeep(target[key], value);
            } else {
                target[key] = clone(value);
            }
        }
    }
    return target;
};

export const pick = (obj, props) => {
    const newObj = {};
    for (const prop of props) {
        if (prop in obj) {
            newObj[prop] = obj[prop];
        }
    }
    return newObj;
};

export const max = (array, func = adone.identity) => {
    if (!array.length) {
        return undefined;
    }
    let maxScore = null;
    let maxElem = undefined;
    for (let i = 0; i < array.length; ++i) {
        const elem = array[i];
        if (is.null(maxScore)) {
            maxScore = func(elem);
            maxElem = elem;
            continue;
        }
        const score = func(elem);
        if (score > maxScore) {
            maxScore = score;
            maxElem = elem;
        }
    }
    return maxElem;
};

export const min = (array, func = adone.identity) => {
    if (!array.length) {
        return undefined;
    }
    let minScore = null;
    let minElem = undefined;
    for (let i = 0; i < array.length; ++i) {
        const elem = array[i];
        if (is.null(minScore)) {
            minScore = func(elem);
            minElem = elem;
            continue;
        }
        const score = func(elem);
        if (score < minScore) {
            minScore = score;
            minElem = elem;
        }
    }
    return minElem;
};

export const repeat = (item, n) => {
    const arr = new Array(n);
    for (let i = 0; i < n; ++i) {
        arr[i] = item;
    }
    return arr;
};
