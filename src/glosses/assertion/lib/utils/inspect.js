// This is (almost) directly from Node.js utils
// https://github.com/joyent/node/blob/f8c335d0caf47f16d31413f89aa28eda3878e3aa/lib/util.js


import getProperties from "./getProperties";
import getEnumerableProperties from "./getEnumerableProperties";
import config from "../config";

const getName = adone.util.functionName;

/**
 * Echoes the value of a value. Tries to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Boolean} showHidden Flag that shows hidden (not enumerable)
 *    properties of objects.
 * @param {Number} depth Depth in which to descend in object. Default is 2.
 * @param {Boolean} colors Flag to turn on ANSI escape codes to color the
 *    output. Default is false (no coloring).
 * @namespace Utils
 * @name inspect
 */
export default function inspect(obj, showHidden, depth) {
    const ctx = {
        showHidden,
        seen: [],
        stylize: (str) => str
    };
    return formatValue(ctx, obj, (typeof depth === "undefined" ? 2 : depth));
}

function formatValue(ctx, value, recurseTimes) {
    // Provide a hook for user-specified inspect functions.
    // Check that value is an object with an inspect function on it
    if (value && adone.is.function(value.inspect) &&
        // Filter out the util module, it's inspect function is special
        value.inspect !== exports.inspect &&
        // Also filter out any prototype objects using the circular check.
        !(value.constructor && value.constructor.prototype === value)) {
        let ret = value.inspect(recurseTimes, ctx);
        if (!adone.is.string(ret)) {
            ret = formatValue(ctx, ret, recurseTimes);
        }
        return ret;
    }

    // Primitive types cannot have properties
    const primitive = formatPrimitive(ctx, value);
    if (primitive) {
        return primitive;
    }

    // Look up the keys of the object.
    const visibleKeys = getEnumerableProperties(value);
    const keys = ctx.showHidden ? getProperties(value) : visibleKeys;

    let name;
    let nameSuffix;

    // Some type of object without properties can be shortcutted.
    // In IE, errors have a single `stack` property, or if they are vanilla `Error`,
    // a `stack` plus `description` property; ignore those for consistency.
    if (keys.length === 0 || (adone.is.error(value) && (
        (keys.length === 1 && keys[0] === "stack") ||
        (keys.length === 2 && keys[0] === "description" && keys[1] === "stack")
    ))) {
        if (adone.is.function(value)) {
            name = getName(value);
            nameSuffix = name ? `: ${name}` : "";
            return ctx.stylize(`[Function${nameSuffix}]`, "special");
        }
        if (adone.is.regexp(value)) {
            return ctx.stylize(RegExp.prototype.toString.call(value), "regexp");
        }
        if (adone.is.date(value)) {
            return ctx.stylize(Date.prototype.toUTCString.call(value), "date");
        }
        if (adone.is.error(value)) {
            return formatError(value);
        }
    }

    let base = "";
    let array = false;
    let typedArray = false;
    let braces = ["{", "}"];

    if (isTypedArray(value)) {
        typedArray = true;
        braces = ["[", "]"];
    }

    if (adone.is.array(value)) {
        array = true;
        braces = ["[", "]"];
    }

    // Make functions say that they are functions
    if (adone.is.function(value)) {
        name = getName(value);
        nameSuffix = name ? `: ${name}` : "";
        base = ` [Function${nameSuffix}]`;
    }

    // Make RegExps say that they are RegExps
    if (adone.is.regexp(value)) {
        base = ` ${RegExp.prototype.toString.call(value)}`;
    }

    // Make dates with properties first say the date
    if (adone.is.date(value)) {
        base = ` ${Date.prototype.toUTCString.call(value)}`;
    }

    // Make error with message first say the error
    if (adone.is.error(value)) {
        return formatError(value);
    }

    if (keys.length === 0 && (!array || value.length == 0)) {
        return braces[0] + base + braces[1];
    }

    if (recurseTimes < 0) {
        if (adone.is.regexp(value)) {
            return ctx.stylize(RegExp.prototype.toString.call(value), "regexp");
        } 
        return ctx.stylize("[Object]", "special");
        
    }

    ctx.seen.push(value);

    let output;
    if (array) {
        output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
    } else if (typedArray) {
        return formatTypedArray(value);
    } else {
        output = keys.map((key) => {
            return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
        });
    }

    ctx.seen.pop();

    return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
    switch (typeof value) {
        case "undefined":
            return ctx.stylize("undefined", "undefined");

        case "string": {
            const simple = `'${JSON.stringify(value).replace(/^"|"$/g, "")
                .replace(/'/g, "\\'")
                .replace(/\\"/g, "\"")}'`;
            return ctx.stylize(simple, "string");
        }
        case "number":
            if (value === 0 && (1 / value) === -Infinity) {
                return ctx.stylize("-0", "number");
            }
            return ctx.stylize(String(value), "number");

        case "boolean":
            return ctx.stylize(`${value}`, "boolean");

        case "symbol":
            return ctx.stylize(value.toString(), "symbol");
    }
    // For some reason typeof null is "object", so special case here.
    if (value === null) {
        return ctx.stylize("null", "null");
    }
}


function formatError(value) {
    return `[${Error.prototype.toString.call(value)}]`;
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
    const output = [];
    for (let i = 0, l = value.length; i < l; ++i) {
        if (Object.prototype.hasOwnProperty.call(value, String(i))) {
            output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
                String(i), true));
        } else {
            output.push("");
        }
    }

    keys.forEach((key) => {
        if (!key.match(/^\d+$/)) {
            output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
                key, true));
        }
    });
    return output;
}

function formatTypedArray(value) {
    let str = "[ ";

    for (let i = 0; i < value.length; ++i) {
        if (str.length >= config.truncateThreshold - 7) {
            str += "...";
            break;
        }
        str += `${value[i]}, `;
    }
    str += " ]";

    // Removing trailing `, ` if the array was not truncated
    if (str.indexOf(",  ]") !== -1) {
        str = str.replace(",  ]", " ]");
    }

    return str;
}

function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
    let name;
    const propDescriptor = Object.getOwnPropertyDescriptor(value, key);
    let str;

    if (propDescriptor) {
        if (propDescriptor.get) {
            if (propDescriptor.set) {
                str = ctx.stylize("[Getter/Setter]", "special");
            } else {
                str = ctx.stylize("[Getter]", "special");
            }
        } else {
            if (propDescriptor.set) {
                str = ctx.stylize("[Setter]", "special");
            }
        }
    }
    if (visibleKeys.indexOf(key) < 0) {
        name = `[${key}]`;
    }
    if (!str) {
        if (ctx.seen.indexOf(value[key]) < 0) {
            if (recurseTimes === null) {
                str = formatValue(ctx, value[key], null);
            } else {
                str = formatValue(ctx, value[key], recurseTimes - 1);
            }
            if (str.indexOf("\n") > -1) {
                if (array) {
                    str = str.split("\n").map((line) => {
                        return `  ${line}`;
                    }).join("\n").substr(2);
                } else {
                    str = `\n${str.split("\n").map((line) => {
                        return `           ${ line}`;
                    }).join("\n")}`;
                }
            }
        } else {
            str = ctx.stylize("[Circular]", "special");
        }
    }
    if (adone.is.undefined(name)) {
        if (array && key.match(/^\d+$/)) {
            return str;
        }
        name = JSON.stringify(`${key}`);
        if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
            name = name.substr(1, name.length - 2);
            name = ctx.stylize(name, "name");
        } else {
            name = name.replace(/'/g, "\\'")
                .replace(/\\"/g, "\"")
                .replace(/(^"|"$)/g, "'");
            name = ctx.stylize(name, "string");
        }
    }

    return `${name}: ${str}`;
}


function reduceToSingleString(output, base, braces) {
    const length = output.reduce((prev, cur) => {
        return prev + cur.length + 1;
    }, 0);

    if (length > 60) {
        return `${braces[0] +
            (base === "" ? "" : `${base}\n `) 
            } ${ 
            output.join(",\n  ") 
            } ${ 
            braces[1]}`;
    }

    return `${braces[0] + base} ${output.join(", ")} ${braces[1]}`;
}

function isTypedArray(ar) {
    // Unfortunately there's no way to check if an object is a TypedArray
    // We have to check if it's one of these types
    return (adone.is.object(ar) && /\w+Array]$/.test(objectToString(ar)));
}

function objectToString(o) {
    return Object.prototype.toString.call(o);
}
