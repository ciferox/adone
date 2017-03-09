import { TemplateError } from "./x";
import adone from "adone";
const { is, net: { http: { helper } }, x, util } = adone;

const keywords = Symbol("keywords");

export const makeKeywordArgs = (obj) => {
    obj[keywords] = true;
    return obj;
};

const getKeywordArgs = (args) => {
    const { length } = args;
    if (length) {
        const lastArg = args[length - 1];
        if (lastArg && is.propertyOwned(lastArg, keywords)) {
            return lastArg;
        }
    }
    return {};
};

export const numArgs = (args) => {
    const { length } = args;
    if (length === 0) {
        return 0;
    }

    const lastArg = args[length - 1];
    if (lastArg && is.propertyOwned(lastArg, keywords)) {
        return length - 1;
    } else {
        return length;
    }
};

export class Frame {
    constructor(parent, isolateWrites) {
        this.variables = {};
        this.parent = parent;
        this.topLevel = false;
        this.isolateWrites = isolateWrites;
    }

    set(name, val, resolveUp) {
        const parts = name.split(".");
        let { variables: obj } = this;

        if (resolveUp) {
            const frame = this.resolve(parts[0], true);
            if (frame) {
                frame.set(name, val);
                return;
            }
        }

        for (let i = 0; i < parts.length - 1; i++) {
            const id = parts[i];

            if (!obj[id]) {
                obj[id] = {};
            }
            obj = obj[id];
        }

        obj[parts[parts.length - 1]] = val;
    }

    get(name) {
        const val = this.variables[name];
        if (!is.undefined(val)) {
            return val;
        }
        return null;
    }

    lookup(name) {
        const { parent: p } = this;
        const val = this.variables[name];
        if (!is.undefined(val)) {
            return val;
        }
        return p && p.lookup(name);
    }

    resolve(name, forWrite) {
        const p = (forWrite && this.isolateWrites) ? undefined : this.parent;
        const val = this.variables[name];
        if (!is.undefined(val)) {
            return this;
        }
        return p && p.resolve(name);
    }

    push(isolateWrites) {
        return new Frame(this, isolateWrites);
    }

    pop() {
        return this.parent;
    }
}

export const makeMacro = (argNames, kwargNames, func) => {
    return function (...args) {
        const argCount = numArgs(args);
        const kwargs = getKeywordArgs(args);

        if (argCount > argNames.length) {
            const vals = args.slice(argNames.length, argCount);
            args = args.slice(0, argNames.length);

            // Positional arguments that should be passed in as
            // keyword arguments (essentially default values)
            for (let i = 0; i < vals.length; i++) {
                if (i < kwargNames.length) {
                    kwargs[kwargNames[i]] = vals[i];
                }
            }

            args.push(kwargs);
        } else if (argCount < argNames.length) {
            args = args.slice(0, argCount);

            for (let i = argCount; i < argNames.length; i++) {
                const arg = argNames[i];

                // Keyword arguments that should be passed as
                // positional arguments, i.e. the caller explicitly
                // used the name of a positional arg
                args.push(kwargs[arg]);
                delete kwargs[arg];
            }

            args.push(kwargs);
        }

        return func.apply(this, args);
    };
};

export class SafeString extends String {
    constructor(val) {
        super(val);
        this.val = val;
        this._length = val.length;
    }

    get length() {
        return this._length;
    }

    valueOf() {
        return this.val;
    }

    toString() {
        return this.val;
    }
}

export const copySafeness = (dest, target) => {
    if (dest instanceof SafeString) {
        return new SafeString(target);
    }
    return target.toString();
};

export const markSafe = (val) => {
    if (is.string(val)) {
        return new SafeString(val);
    }
    if (!is.function(val)) {
        return val;
    }
    return function (...args) {
        const ret = val.apply(this, args);
        if (is.string(ret)) {
            return new SafeString(ret);
        }

        return ret;
    };
};

export const suppressValue = (val, autoescape) => {
    val = !is.nil(val) ? val : "";

    if (autoescape && !(val instanceof SafeString)) {
        val = helper.escapeHTML(val.toString());
    }

    return val;
};

export const ensureDefined = (val, lineno, colno) => {
    if (val === null || val === undefined) {
        throw new TemplateError("attempted to output null or undefined value",
            lineno + 1,
            colno + 1);
    }
    return val;
};

export const memberLookup = (obj = {}, val) => {
    if (is.function(obj[val])) {
        return (...args) => obj[val](...args);
    }

    return obj[val];
};

export const callWrap = (obj, name, context, args) => {
    if (!obj) {
        throw new x.InvalidArgument(`Unable to call \`${name}\`, which is undefined or falsey`);
    } else if (typeof obj !== "function") {
        throw new x.InvalidArgument(`Unable to call \`${name}\`, which is not a function`);
    }

    return obj.apply(context, args);
};

export const contextOrFrameLookup = (context, frame, name) => {
    const val = frame.lookup(name);
    return !is.undefined(val) ? val : context.lookup(name);
};

export const handleError = (error, lineno, colno) => {
    if (error.lineno) {
        return error;
    }
    return new TemplateError(error, lineno, colno);
};

export const asyncEach = (arr, dimen, iter, cb) => {
    if (is.array(arr)) {
        const { length } = arr;

        util.asyncIter(arr, function iterBody(item, i, next) {
            switch (dimen) {
                case 1: {
                    iter(item, i, length, next);
                    break;
                }
                case 2: {
                    iter(item[0], item[1], i, length, next);
                    break;
                }
                case 3: {
                    iter(item[0], item[1], item[2], i, length, next);
                    break;
                }
                default: {
                    item.push(i, next);
                    iter.apply(this, item);
                }
            }
        }, cb);
    } else {
        util.asyncFor(arr, (key, val, i, len, next) => {
            iter(key, val, i, len, next);
        }, cb);
    }
};

export const asyncAll = (arr, dimen, func, cb) => {
    let finished = 0;
    let length;
    let i;
    let outputArr;

    const done = (i, output) => {
        finished++;
        outputArr[i] = output;

        if (finished === length) {
            cb(null, outputArr.join(""));
        }
    };

    if (is.array(arr)) {
        ({ length } = arr);
        outputArr = new Array(length);

        if (length === 0) {
            cb(null, "");
        } else {
            for (i = 0; i < arr.length; i++) {
                const item = arr[i];

                switch (dimen) {
                    case 1: {
                        func(item, i, length, done);
                        break;
                    }
                    case 2: {
                        func(item[0], item[1], i, length, done);
                        break;
                    }
                    case 3: {
                        func(item[0], item[1], item[2], i, length, done);
                        break;
                    }
                    default: {
                        item.push(i, done);
                        func.apply(this, item);
                    }
                }
            }
        }
    } else {
        const keys = util.keys(arr);
        ({ length } = keys);
        outputArr = new Array(length);

        if (length === 0) {
            cb(null, "");
        } else {
            for (i = 0; i < keys.length; i++) {
                const k = keys[i];
                func(k, arr[k], i, length, done);
            }
        }
    }
};

export const inOperator = (key, val) => {
    if (is.array(val) || is.string(val)) {
        return val.includes(key);
    }

    if (is.object(val)) {
        return key in val;
    }

    throw new x.IllegalState(`Cannot use "in" operator to search for "${key}" in unexpected types.`);
};

export const isArray = is.array;
export const keys = util.keys;
