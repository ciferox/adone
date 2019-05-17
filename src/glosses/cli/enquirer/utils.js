const {
    is
} = adone;

const toString = Object.prototype.toString;
const colors = require("./colors");
let called = false;
const fns = [];

const complements = {
    yellow: "blue",
    cyan: "red",
    green: "magenta",
    black: "white",
    blue: "yellow",
    red: "cyan",
    magenta: "green",
    white: "black"
};

exports.longest = (arr, prop) => {
    return arr.reduce((a, v) => Math.max(a, prop ? v[prop].length : v.length), 0);
};

exports.hasColor = (str) => Boolean(str) && colors.hasColor(str);

const isObject = exports.isObject = (val) => {
    return !is.null(val) && typeof val === "object" && !is.array(val);
};

exports.nativeType = (val) => {
    return toString.call(val).slice(8, -1).toLowerCase().replace(/\s/g, "");
};

exports.isAsyncFn = (val) => {
    return exports.nativeType(val) === "asyncfunction";
};

exports.isPrimitive = (val) => {
    return !is.nil(val) && typeof val !== "object" && !is.function(val);
};

exports.resolve = (context, value, ...rest) => {
    if (is.function(value)) {
        return value.call(context, ...rest);
    }
    return value;
};

exports.scrollDown = (choices = []) => [...choices.slice(1), choices[0]];
exports.scrollUp = (choices = []) => [choices.pop(), ...choices];

exports.reorder = (arr = []) => {
    const res = arr.slice();
    res.sort((a, b) => {
        if (a.index > b.index) {
            return 1; 
        }
        if (a.index < b.index) {
            return -1; 
        }
        return 0;
    });
    return res;
};

exports.swap = (arr, index, pos) => {
    const len = arr.length;
    const idx = pos === len ? 0 : pos < 0 ? len - 1 : pos;
    const choice = arr[index];
    arr[index] = arr[idx];
    arr[idx] = choice;
};

exports.width = (stream, fallback = 80) => {
    let columns = (stream && stream.columns) ? stream.columns : fallback;
    if (stream && is.function(stream.getWindowSize)) {
        columns = stream.getWindowSize()[0];
    }
    if (process.platform === "win32") {
        return columns - 1;
    }
    return columns;
};

exports.height = (stream, fallback = 20) => {
    let rows = (stream && stream.rows) ? stream.rows : fallback;
    if (stream && is.function(stream.getWindowSize)) {
        rows = stream.getWindowSize()[1];
    }
    return rows;
};

exports.wordWrap = (str, options = {}) => {
    if (!str) {
        return str; 
    }

    if (is.number(options)) {
        options = { width: options };
    }

    let { indent = "", newline = (`\n${indent}`), width = 80 } = options;
    const spaces = (newline + indent).match(/[^\S\n]/g) || [];
    width -= spaces.length;
    const source = `.{1,${width}}([\\s\\u200B]+|$)|[^\\s\\u200B]+?([\\s\\u200B]+|$)`;
    const output = str.trim();
    const regex = new RegExp(source, "g");
    let lines = output.match(regex) || [];
    lines = lines.map((line) => line.replace(/\n$/, ""));
    if (options.padEnd) {
        lines = lines.map((line) => line.padEnd(width, " ")); 
    }
    if (options.padStart) {
        lines = lines.map((line) => line.padStart(width, " ")); 
    }
    return indent + lines.join(newline);
};

exports.unmute = (color) => {
    const name = color.stack.find((n) => colors.keys.color.includes(n));
    if (name) {
        return colors[name];
    }
    const bg = color.stack.find((n) => n.slice(2) === "bg");
    if (bg) {
        return colors[name.slice(2)];
    }
    return (str) => str;
};

exports.pascal = (str) => str ? str[0].toUpperCase() + str.slice(1) : "";

exports.inverse = (color) => {
    if (!color || !color.stack) {
        return color; 
    }
    const name = color.stack.find((n) => colors.keys.color.includes(n));
    if (name) {
        const col = colors[`bg${exports.pascal(name)}`];
        return col ? col.black : color;
    }
    const bg = color.stack.find((n) => n.slice(0, 2) === "bg");
    if (bg) {
        return colors[bg.slice(2).toLowerCase()] || color;
    }
    return colors.none;
};

exports.complement = (color) => {
    if (!color || !color.stack) {
        return color; 
    }
    const name = color.stack.find((n) => colors.keys.color.includes(n));
    const bg = color.stack.find((n) => n.slice(0, 2) === "bg");
    if (name && !bg) {
        return colors[complements[name] || name];
    }
    if (bg) {
        const lower = bg.slice(2).toLowerCase();
        const comp = complements[lower];
        if (!comp) {
            return color; 
        }
        return colors[`bg${exports.pascal(comp)}`] || color;
    }
    return colors.none;
};

exports.meridiem = (date) => {
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? "pm" : "am";
    hours = hours % 12;
    const hrs = hours === 0 ? 12 : hours;
    const min = minutes < 10 ? `0${minutes}` : minutes;
    return `${hrs}:${min} ${ampm}`;
};

/**
 * Set a value on the given object.
 * @param {Object} obj
 * @param {String} prop
 * @param {any} value
 */

exports.set = (obj = {}, prop = "", val) => {
    return prop.split(".").reduce((acc, k, i, arr) => {
        let value = arr.length - 1 > i ? (acc[k] || {}) : val;
        if (!exports.isObject(value) && i < arr.length - 1) {
            value = {}; 
        }
        return (acc[k] = value);
    }, obj);
};

/**
 * Get a value from the given object.
 * @param {Object} obj
 * @param {String} prop
 */

exports.get = (obj = {}, prop = "", fallback) => {
    const value = is.nil(obj[prop])
        ? prop.split(".").reduce((acc, k) => acc && acc[k], obj)
        : obj[prop];
    return is.nil(value) ? fallback : value;
};

exports.mixin = (target, b) => {
    if (!isObject(target)) {
        return b; 
    }
    if (!isObject(b)) {
        return target; 
    }
    for (const key of Object.keys(b)) {
        const desc = Object.getOwnPropertyDescriptor(b, key);
        if (desc.hasOwnProperty("value")) {
            if (target.hasOwnProperty(key) && isObject(desc.value)) {
                const existing = Object.getOwnPropertyDescriptor(target, key);
                if (isObject(existing.value)) {
                    target[key] = exports.merge({}, target[key], b[key]);
                } else {
                    Reflect.defineProperty(target, key, desc);
                }
            } else {
                Reflect.defineProperty(target, key, desc);
            }
        } else {
            Reflect.defineProperty(target, key, desc);
        }
    }
    return target;
};

exports.merge = (...args) => {
    const target = {};
    for (const ele of args) {
        exports.mixin(target, ele); 
    }
    return target;
};

exports.mixinEmitter = (obj, emitter) => {
    const proto = emitter.constructor.prototype;
    for (const key of Object.keys(proto)) {
        const val = proto[key];
        if (is.function(val)) {
            exports.define(obj, key, val.bind(emitter));
        } else {
            exports.define(obj, key, val);
        }
    }
};

exports.onExit = (callback) => {
    const onExit = (quit, code) => {
        if (called) {
            return; 
        }

        called = true;
        fns.forEach((fn) => fn());

        if (quit === true) {
            process.exit(128 + code);
        }
    };

    if (fns.length === 0) {
        process.once("SIGTERM", onExit.bind(null, true, 15));
        process.once("SIGINT", onExit.bind(null, true, 2));
        process.once("exit", onExit);
    }

    fns.push(callback);
};

exports.define = (obj, key, value) => {
    Reflect.defineProperty(obj, key, { value });
};

exports.defineExport = (obj, key, fn) => {
    let custom;
    Reflect.defineProperty(obj, key, {
        enumerable: true,
        configurable: true,
        set(val) {
            custom = val;
        },
        get() {
            return custom ? custom() : fn();
        }
    });
};
