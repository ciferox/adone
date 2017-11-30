const Decimal = require("./types/decimal128");
const ObjectId = require("./types/objectid");
const cloneRegExp = require("regexp-clone");
const sliced = require("sliced");
const mpath = require("mpath");
const ms = require("ms");

const {
    is
} = adone;

let MongooseBuffer;
let MongooseArray;

/*!
 * Produces a collection name from model `name`.
 *
 * @param {String} name a model name
 * @return {String} a collection name
 * @api private
 */

export const toCollectionName = function (name, options) {
    options = options || {};
    if (name === "system.profile") {
        return name;
    }
    if (name === "system.indexes") {
        return name;
    }
    if (options.pluralization === false) {
        return name;
    }
    return pluralize(name.toLowerCase());
};

/**
 * Pluralization rules.
 *
 * These rules are applied while processing the argument to `toCollectionName`.
 *
 * @deprecated remove in 4.x gh-1350
 */

export const pluralization = [
    [/(m)an$/gi, "$1en"],
    [/(pe)rson$/gi, "$1ople"],
    [/(child)$/gi, "$1ren"],
    [/^(ox)$/gi, "$1en"],
    [/(ax|test)is$/gi, "$1es"],
    [/(octop|vir)us$/gi, "$1i"],
    [/(alias|status)$/gi, "$1es"],
    [/(bu)s$/gi, "$1ses"],
    [/(buffal|tomat|potat)o$/gi, "$1oes"],
    [/([ti])um$/gi, "$1a"],
    [/sis$/gi, "ses"],
    [/(?:([^f])fe|([lr])f)$/gi, "$1$2ves"],
    [/(hive)$/gi, "$1s"],
    [/([^aeiouy]|qu)y$/gi, "$1ies"],
    [/(x|ch|ss|sh)$/gi, "$1es"],
    [/(matr|vert|ind)ix|ex$/gi, "$1ices"],
    [/([m|l])ouse$/gi, "$1ice"],
    [/(kn|w|l)ife$/gi, "$1ives"],
    [/(quiz)$/gi, "$1zes"],
    [/s$/gi, "s"],
    [/([^a-z])$/, "$1"],
    [/$/gi, "s"]
];
const rules = pluralization;

/**
 * Uncountable words.
 *
 * These words are applied while processing the argument to `toCollectionName`.
 * @api public
 */

export const uncountables = [
    "advice",
    "energy",
    "excretion",
    "digestion",
    "cooperation",
    "health",
    "justice",
    "labour",
    "machinery",
    "equipment",
    "information",
    "pollution",
    "sewage",
    "paper",
    "money",
    "species",
    "series",
    "rain",
    "rice",
    "fish",
    "sheep",
    "moose",
    "deer",
    "news",
    "expertise",
    "status",
    "media"
];

/*!
 * Pluralize function.
 *
 * @author TJ Holowaychuk (extracted from _ext.js_)
 * @param {String} string to pluralize
 * @api private
 */

function pluralize(str) {
    let found;
    if (!~uncountables.indexOf(str.toLowerCase())) {
        found = rules.filter((rule) => {
            return str.match(rule[0]);
        });
        if (found[0]) {
            return str.replace(found[0][0], found[0][1]);
        }
    }
    return str;
}

/*!
 * Determines if `a` and `b` are deep equal.
 *
 * Modified from node/lib/assert.js
 *
 * @param {any} a a value to compare to `b`
 * @param {any} b a value to compare to `a`
 * @return {Boolean}
 * @api private
 */

export const deepEqual = function deepEqual(a, b) {
    if (a === b) {
        return true;
    }

    if (a instanceof Date && b instanceof Date) {
        return a.getTime() === b.getTime();
    }

    if ((a instanceof ObjectId && b instanceof ObjectId) ||
        (a instanceof Decimal && b instanceof Decimal)) {
        return a.toString() === b.toString();
    }

    if (a instanceof RegExp && b instanceof RegExp) {
        return a.source === b.source &&
            a.ignoreCase === b.ignoreCase &&
            a.multiline === b.multiline &&
            a.global === b.global;
    }

    if (typeof a !== "object" && typeof b !== "object") {
        return a == b;
    }

    if (is.null(a) || is.null(b) || is.undefined(a) || is.undefined(b)) {
        return false;
    }

    if (a.prototype !== b.prototype) {
        return false;
    }

    // Handle MongooseNumbers
    if (a instanceof Number && b instanceof Number) {
        return a.valueOf() === b.valueOf();
    }

    if (is.buffer(a)) {
        return buffer.areEqual(a, b);
    }

    if (isMongooseObject(a)) {
        a = a.toObject();
    }
    if (isMongooseObject(b)) {
        b = b.toObject();
    }

    try {
        var ka = Object.keys(a),
            kb = Object.keys(b),
            key, i;
    } catch (e) {
        // happens when one is a string literal and the other isn't
        return false;
    }

    // having the same number of owned properties (keys incorporates
    // hasOwnProperty)
    if (ka.length !== kb.length) {
        return false;
    }

    // the same set of keys (although not necessarily the same order),
    ka.sort();
    kb.sort();

    // ~~~cheap key test
    for (i = ka.length - 1; i >= 0; i--) {
        if (ka[i] !== kb[i]) {
            return false;
        }
    }

    // equivalent values for every corresponding key, and
    // ~~~possibly expensive deep test
    for (i = ka.length - 1; i >= 0; i--) {
        key = ka[i];
        if (!deepEqual(a[key], b[key])) {
            return false;
        }
    }

    return true;
};

/*!
 * Object clone with Mongoose natives support.
 *
 * If options.minimize is true, creates a minimal data object. Empty objects and undefined values will not be cloned. This makes the data payload sent to MongoDB as small as possible.
 *
 * Functions are never cloned.
 *
 * @param {Object} obj the object to clone
 * @param {Object} options
 * @return {Object} the cloned object
 * @api private
 */

export const clone = function clone(obj, options) {
    if (is.nil(obj)) {
        return obj;
    }

    if (is.array(obj)) {
        return cloneArray(obj, options);
    }

    if (isMongooseObject(obj)) {
        if (options && options.json && is.function(obj.toJSON)) {
            return obj.toJSON(options);
        }
        return obj.toObject(options);
    }

    if (obj.constructor) {
        switch (getFunctionName(obj.constructor)) {
            case "Object":
                return cloneObject(obj, options);
            case "Date":
                return new obj.constructor(Number(obj));
            case "RegExp":
                return cloneRegExp(obj);
            default:
                // ignore
                break;
        }
    }

    if (obj instanceof ObjectId) {
        return new ObjectId(obj.id);
    }
    if (obj instanceof Decimal) {
        if (options && options.flattenDecimals) {
            return obj.toJSON();
        }
        return Decimal.fromString(obj.toString());
    }

    if (!obj.constructor && isObject(obj)) {
        // object created with Object.create(null)
        return cloneObject(obj, options);
    }

    if (obj.valueOf) {
        return obj.valueOf();
    }
};

/*!
 * TODO: replace with Object.assign() in 5.0
 */
export const assign = function (target) {
    for (let i = 1; i < arguments.length; ++i) {
        const nextSource = arguments[i];

        if (!is.nil(nextSource)) {
            for (const nextKey in nextSource) {
                if (nextSource.hasOwnProperty(nextKey)) {
                    target[nextKey] = nextSource[nextKey];
                }
            }
        }
    }

    return target;
};

/*!
 * ignore
 */

function cloneObject(obj, options) {
    let retainKeyOrder = options && options.retainKeyOrder,
        minimize = options && options.minimize,
        ret = {},
        hasKeys,
        keys,
        val,
        k,
        i;

    if (retainKeyOrder) {
        for (k in obj) {
            val = clone(obj[k], options);

            if (!minimize || (!is.undefined(val))) {
                hasKeys || (hasKeys = true);
                ret[k] = val;
            }
        }
    } else {
        // faster

        keys = Object.keys(obj);
        i = keys.length;

        while (i--) {
            k = keys[i];
            val = clone(obj[k], options);

            if (!minimize || (!is.undefined(val))) {
                if (!hasKeys) {
                    hasKeys = true;
                }
                ret[k] = val;
            }
        }
    }

    return minimize
        ? hasKeys && ret
        : ret;
}

function cloneArray(arr, options) {
    const ret = [];
    for (let i = 0, l = arr.length; i < l; i++) {
        ret.push(clone(arr[i], options));
    }
    return ret;
}

/*!
 * Shallow copies defaults into options.
 *
 * @param {Object} defaults
 * @param {Object} options
 * @return {Object} the merged object
 * @api private
 */

export const options = function (defaults, options) {
    let keys = Object.keys(defaults),
        i = keys.length,
        k;

    options = options || {};

    while (i--) {
        k = keys[i];
        if (!(k in options)) {
            options[k] = defaults[k];
        }
    }

    return options;
};

/*!
 * Generates a random string
 *
 * @api private
 */

export const random = function () {
    return Math.random().toString().substr(3);
};

/*!
 * Merges `from` into `to` without overwriting existing properties.
 *
 * @param {Object} to
 * @param {Object} from
 * @api private
 */

export const merge = function merge(to, from, options) {
    options = options || {};
    const keys = Object.keys(from);
    let i = 0;
    let len = keys.length;
    let key;

    if (options.retainKeyOrder) {
        while (i < len) {
            key = keys[i++];
            if (is.nil(to[key])) {
                to[key] = from[key];
            } else if (isObject(from[key])) {
                merge(to[key], from[key], options);
            } else if (options.overwrite) {
                to[key] = from[key];
            }
        }
    } else {
        while (len--) {
            key = keys[len];
            if (is.nil(to[key])) {
                to[key] = from[key];
            } else if (isObject(from[key])) {
                merge(to[key], from[key], options);
            } else if (options.overwrite) {
                to[key] = from[key];
            }
        }
    }
};

/*!
 * Applies toObject recursively.
 *
 * @param {adone.odm.Document|Array|Object} obj
 * @return {Object}
 * @api private
 */

export const toObject = function toObject(obj) {
    let ret;

    if (isNullOrUndefined(obj)) {
        return obj;
    }

    if (obj instanceof adone.odm.Document) {
        return obj.toObject();
    }

    if (is.array(obj)) {
        ret = [];

        for (let i = 0, len = obj.length; i < len; ++i) {
            ret.push(toObject(obj[i]));
        }

        return ret;
    }

    if ((obj.constructor && getFunctionName(obj.constructor) === "Object") ||
        (!obj.constructor && isObject(obj))) {
        ret = {};

        for (const k in obj) {
            ret[k] = toObject(obj[k]);
        }

        return ret;
    }

    return obj;
};

/*!
 * Determines if `arg` is an object.
 *
 * @param {Object|Array|String|Function|RegExp|any} arg
 * @api private
 * @return {Boolean}
 */

export const isObject = function (arg) {
    if (is.buffer(arg)) {
        return true;
    }
    return Object.prototype.toString.call(arg) === "[object Object]";
};

/*!
 * A faster Array.prototype.slice.call(arguments) alternative
 * @api private
 */

export const args = sliced;

/*!
 * process.nextTick helper.
 *
 * Wraps `callback` in a try/catch + nextTick.
 *
 * node-mongodb-native has a habit of state corruption when an error is immediately thrown from within a collection callback.
 *
 * @param {Function} callback
 * @api private
 */

export const tick = function tick(callback) {
    if (!is.function(callback)) {
        return;
    }
    return function () {
        try {
            callback.apply(this, arguments);
        } catch (err) {
            // only nextTick on err to get out of
            // the event loop and avoid state corruption.
            process.nextTick(() => {
                throw err;
            });
        }
    };
};

/*!
 * Returns if `v` is a mongoose object that has a `toObject()` method we can use.
 *
 * This is for compatibility with libs like Date.js which do foolish things to Natives.
 *
 * @param {any} v
 * @api private
 */

export const isMongooseObject = function (v) {
    MongooseArray || (MongooseArray = require("./types").Array);
    MongooseBuffer || (MongooseBuffer = require("./types").Buffer);

    return v instanceof adone.odm.Document ||
        (v && v.isMongooseArray) ||
        (v && v.isMongooseBuffer);
};

/*!
 * Converts `expires` options of index objects to `expiresAfterSeconds` options for MongoDB.
 *
 * @param {Object} object
 * @api private
 */

export const expires = function expires(object) {
    if (!(object && object.constructor.name === "Object")) {
        return;
    }
    if (!("expires" in object)) {
        return;
    }

    let when;
    if (!is.string(object.expires)) {
        when = object.expires;
    } else {
        when = Math.round(ms(object.expires) / 1000);
    }
    object.expireAfterSeconds = when;
    delete object.expires;
};

/*!
 * Populate options constructor
 */

function PopulateOptions(path, select, match, options, model, subPopulate) {
    this.path = path;
    this.match = match;
    this.select = select;
    this.options = options;
    this.model = model;
    if (typeof subPopulate === "object") {
        this.populate = subPopulate;
    }
    this._docs = {};
}

// make it compatible with utils.clone
PopulateOptions.prototype.constructor = Object;

/*!
 * populate helper
 */

export const populate = function populate(path, select, model, match, options, subPopulate) {
    // The order of select/conditions args is opposite Model.find but
    // necessary to keep backward compatibility (select could be
    // an array, string, or object literal).

    // might have passed an object specifying all arguments
    if (arguments.length === 1) {
        if (path instanceof PopulateOptions) {
            return [path];
        }

        if (is.array(path)) {
            return path.map((o) => {
                return populate(o)[0];
            });
        }

        if (isObject(path)) {
            match = path.match;
            options = path.options;
            select = path.select;
            model = path.model;
            subPopulate = path.populate;
            path = path.path;
        }
    } else if (!is.string(model) && !is.function(model)) {
        options = match;
        match = model;
        model = undefined;
    }

    if (!is.string(path)) {
        throw new TypeError(`utils.populate: invalid path. Expected string. Got typeof \`${  typeof path  }\``);
    }

    if (typeof subPopulate === "object") {
        subPopulate = populate(subPopulate);
    }

    const ret = [];
    const paths = path.split(" ");
    options = clone(options, { retainKeyOrder: true });
    for (let i = 0; i < paths.length; ++i) {
        ret.push(new PopulateOptions(paths[i], select, match, options, model, subPopulate));
    }

    return ret;
};

/*!
 * Return the value of `obj` at the given `path`.
 *
 * @param {String} path
 * @param {Object} obj
 */

export const getValue = function (path, obj, map) {
    return mpath.get(path, obj, "_doc", map);
};

/*!
 * Sets the value of `obj` at the given `path`.
 *
 * @param {String} path
 * @param {Anything} val
 * @param {Object} obj
 */

export const setValue = function (path, val, obj, map) {
    mpath.set(path, val, obj, "_doc", map);
};

/*!
 * Returns an array of values from object `o`.
 *
 * @param {Object} o
 * @return {Array}
 * @private
 */

export const object = {};
object.vals = function vals(o) {
    let keys = Object.keys(o),
        i = keys.length,
        ret = [];

    while (i--) {
        ret.push(o[keys[i]]);
    }

    return ret;
};

/*!
 * @see export const options
 */

object.shallowCopy = options;

/*!
 * Safer helper for hasOwnProperty checks
 *
 * @param {Object} obj
 * @param {String} prop
 */

const hop = Object.prototype.hasOwnProperty;
object.hasOwnProperty = function (obj, prop) {
    return hop.call(obj, prop);
};

/*!
 * Determine if `val` is null or undefined
 *
 * @return {Boolean}
 */

export const isNullOrUndefined = function (val) {
    return is.nil(val);
};

/*!
 * ignore
 */

export const array = {};

/*!
 * Flattens an array.
 *
 * [ 1, [ 2, 3, [4] ]] -> [1,2,3,4]
 *
 * @param {Array} arr
 * @param {Function} [filter] If passed, will be invoked with each item in the array. If `filter` returns a falsey value, the item will not be included in the results.
 * @return {Array}
 * @private
 */

array.flatten = function flatten(arr, filter, ret) {
    ret || (ret = []);

    arr.forEach((item) => {
        if (is.array(item)) {
            flatten(item, filter, ret);
        } else {
            if (!filter || filter(item)) {
                ret.push(item);
            }
        }
    });

    return ret;
};

/*!
 * Removes duplicate values from an array
 *
 * [1, 2, 3, 3, 5] => [1, 2, 3, 5]
 * [ ObjectId("550988ba0c19d57f697dc45e"), ObjectId("550988ba0c19d57f697dc45e") ]
 *    => [ObjectId("550988ba0c19d57f697dc45e")]
 *
 * @param {Array} arr
 * @return {Array}
 * @private
 */

array.unique = function (arr) {
    const primitives = {};
    const ids = {};
    const ret = [];
    const length = arr.length;
    for (let i = 0; i < length; ++i) {
        if (is.number(arr[i]) || is.string(arr[i])) {
            if (primitives[arr[i]]) {
                continue;
            }
            ret.push(arr[i]);
            primitives[arr[i]] = true;
        } else if (arr[i] instanceof ObjectId) {
            if (ids[arr[i].toString()]) {
                continue;
            }
            ret.push(arr[i]);
            ids[arr[i].toString()] = true;
        } else {
            ret.push(arr[i]);
        }
    }

    return ret;
};

/*!
 * Determines if two buffers are equal.
 *
 * @param {Buffer} a
 * @param {Object} b
 */

export const pluralizationbuffer = {};
const buffer = {};
buffer.areEqual = function (a, b) {
    if (!is.buffer(a)) {
        return false;
    }
    if (!is.buffer(b)) {
        return false;
    }
    if (a.length !== b.length) {
        return false;
    }
    for (let i = 0, len = a.length; i < len; ++i) {
        if (a[i] !== b[i]) {
            return false;
        }
    }
    return true;
};

export const getFunctionName = function (fn) {
    if (fn.name) {
        return fn.name;
    }
    return (fn.toString().trim().match(/^function\s*([^\s(]+)/) || [])[1];
};

export const decorate = function (destination, source) {
    for (const key in source) {
        destination[key] = source[key];
    }
};

/**
 * merges to with a copy of from
 *
 * @param {Object} to
 * @param {Object} fromObj
 * @api private
 */

export const mergeClone = function (to, fromObj) {
    const keys = Object.keys(fromObj);
    const len = keys.length;
    let i = 0;
    let key;

    while (i < len) {
        key = keys[i++];
        if (is.undefined(to[key])) {
            // make sure to retain key order here because of a bug handling the $each
            // operator in mongodb 2.4.4
            to[key] = clone(fromObj[key], {
                retainKeyOrder: 1,
                flattenDecimals: false
            });
        } else {
            if (isObject(fromObj[key])) {
                let obj = fromObj[key];
                if (isMongooseObject(fromObj[key]) && !fromObj[key].isMongooseBuffer) {
                    obj = obj.toObject({ transform: false, virtuals: false });
                }
                if (fromObj[key].isMongooseBuffer) {
                    obj = Buffer.from(obj);
                }
                mergeClone(to[key], obj);
            } else {
                // make sure to retain key order here because of a bug handling the
                // $each operator in mongodb 2.4.4
                to[key] = clone(fromObj[key], {
                    retainKeyOrder: 1,
                    flattenDecimals: false
                });
            }
        }
    }
};

/**
 * Executes a function on each element of an array (like _.each)
 *
 * @param {Array} arr
 * @param {Function} fn
 * @api private
 */

export const each = function (arr, fn) {
    for (let i = 0; i < arr.length; ++i) {
        fn(arr[i]);
    }
};

/*!
 * ignore
 */

export const noop = function () { };
