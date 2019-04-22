/* eslint-disable eqeqeq */
/* eslint-disable adone/no-undefined-comp */
/* eslint-disable adone/no-array-isarray */
/* eslint-disable adone/no-null-comp */
/* eslint-disable adone/no-typeof */

export const EMPTY_BUFFER = Buffer.allocUnsafe(0);

const objectProto = Object.prototype;
const hasOwnProperty = objectProto.hasOwnProperty;
const toString = objectProto.toString;
const funcToString = Function.prototype.toString;
const objectCtorString = funcToString.call(Object);
const symToStringTag = Symbol.toStringTag;

const PRIVATE_SYMBOL = Symbol();
const NAMESPACE_SYMBOL = Symbol();

export const getTag = (value) => {
    if (value == null) {
        return value === undefined ? "[object Undefined]" : "[object Null]";
    }
    if (!(symToStringTag && symToStringTag in Object(value))) {
        return toString.call(value);
    }
    const isOwn = hasOwnProperty.call(value, symToStringTag);
    const tag = value[symToStringTag];
    let unmasked = false;
    try {
        value[symToStringTag] = undefined;
        unmasked = true;
    } catch (e) {
        //
    }

    const result = toString.call(value);
    if (unmasked) {
        if (isOwn) {
            value[symToStringTag] = tag;
        } else {
            delete value[symToStringTag];
        }
    }
    return result;
};


export const asNamespace = (obj) => {
    obj[NAMESPACE_SYMBOL] = true;
    return obj;
};
asNamespace.SYMBOL = NAMESPACE_SYMBOL;

export const defaultMapper = (mod) => (mod !== null && typeof mod === "object" && mod.__esModule === true && "default" in mod) ? mod.default : mod;

let lazifyErrorhandler = (err) => {
    console.error(err);
    process.exit(1);
};

export const setLazifyErrorHandler = (handler) => {
    lazifyErrorhandler = handler;
};

export const lazify = (modules, _obj, _require = require, {
    asNamespace = false,
    configurable = false,
    enumerable = true,
    writable = false,
    mapper = defaultMapper
} = {}) => {
    const obj = _obj || {};
    Object.keys(modules).forEach((key) => {
        Object.defineProperty(obj, key, {
            configurable: true,
            enumerable,
            get() {
                const value = modules[key];

                let mod;
                if (typeof value === "function") {
                    mod = value(key);
                } else if (typeof value === "string") {
                    try {
                        mod = _require(value);
                    } catch (err) {
                        // console.log(require("util").inspect(err));
                        if (err.code !== "MODULE_NOT_FOUND") {
                            throw err;
                        }
                        lazifyErrorhandler(err);
                    }
                } else if (Array.isArray(value) && value.length >= 1 && typeof value[0] === "string") {
                    mod = value.reduce((mod, entry, i) => {
                        if (typeof entry === "function") {
                            return entry(mod);
                        } else if (typeof entry === "string") {
                            if (!(entry in mod)) {
                                throw new Error(`Invalid parameter name in ${key}[${i + 1}]`);
                            }
                            return mod[entry];
                        }
                        throw new TypeError(`Invalid type at ${key}[${i + 1}]`);
                    }, _require(value.shift()));
                } else {
                    throw new TypeError(`Invalid module type of ${key}`);
                }

                try {
                    mod = mapper(mod, key);
                } catch (err) {
                    lazifyErrorhandler(err);
                }

                Object.defineProperty(obj, key, {
                    configurable,
                    enumerable,
                    writable,
                    value: mod
                });

                try {
                    return asNamespace
                        ? asNamespace(mod)
                        : mod;
                } catch (err) {
                    return mod;
                }
            }
        });
    });

    return obj;
};
lazify.mapper = defaultMapper;

export const lazifyp = (modules, obj, _require = require, options) => {
    if (isPlainObject(obj[PRIVATE_SYMBOL])) {
        return lazify(modules, obj[PRIVATE_SYMBOL], _require, options);
    }

    obj[PRIVATE_SYMBOL] = lazify(modules, null, _require, options);
    return obj[PRIVATE_SYMBOL];
};
lazifyp.SYMBOL = PRIVATE_SYMBOL;

export const definep = (modules, obj) => {
    if (isPlainObject(obj[PRIVATE_SYMBOL])) {
        Object.assign(obj[PRIVATE_SYMBOL], modules);
    } else {
        obj[PRIVATE_SYMBOL] = modules;
    }

    return obj;
};

export const getPrivate = (obj) => obj[PRIVATE_SYMBOL];

const null_ = Symbol.for("adone:null");
const undefined_ = Symbol.for("adone:undefined");

export {
    null_ as null,
    undefined_ as undefined
};

export const noop = () => { };
export const identity = (x) => x;
export const truly = () => true;
export const falsely = () => false;
export const o = (...props) => props.length > 0 ? Object.assign({}, ...props) : Object.create(null);


// TODO: add browser support
export const setTimeout = global.setTimeout;
export const clearTimeout = global.clearTimeout;
export const setInterval = global.setInterval;
export const clearInterval = global.clearInterval;
export const setImmediate = global.setImmediate;
export const clearImmediate = global.clearImmediate;

// common predicators
export const isWindows = process.platform === "win32";
export const isArray = Array.isArray;
export const isFunction = (value) => typeof value === "function";
export const isString = (value) => typeof value === "string" || value instanceof String;
export const isNumber = (value) => typeof value === "number";
export const isBuffer = (obj) => obj != null && ((Boolean(obj.constructor) && typeof obj.constructor.isBuffer === "function" && obj.constructor.isBuffer(obj)) || Boolean(obj._isBuffer));
export const isPlainObject = (value) => {
    if (!(value != null && typeof value === "object") || getTag(value) !== "[object Object]") {
        return false;
    }
    const proto = Object.getPrototypeOf(value);
    if (proto === null) {
        return true;
    }
    const Ctor = hasOwnProperty.call(proto, "constructor") && proto.constructor;
    return typeof Ctor === "function" && Ctor instanceof Ctor && funcToString.call(Ctor) === objectCtorString;
};


// common utils

export const unique = (array, projection = null) => {
    const tmp = new Set();
    const result = [];
    for (let i = 0; i < array.length; ++i) {
        const value = array[i];
        const hash = projection === null ? value : projection(value);
        if (tmp.has(hash)) {
            continue;
        }
        result.push(value);
        tmp.add(hash);
    }
    return result;
};



asNamespace(exports);
