import adone from "adone";

/**
 * Convert a buffer to string, supports buffer array
 *
 * @param {*} value - The input value
 * @param {string} encoding - string encoding
 * @return {*} The result
 * @example
 * ```js
 * var input = [new Buffer('foo'), [new Buffer('bar')]];
 * var res = convertBufferToString(input, 'utf8');
 * expect(res).to.eql(['foo', ['bar']]);
 * ```
 * @private
 */
export function convertBufferToString(value, encoding) {
    if (adone.is.buffer(value)) {
        return value.toString(encoding);
    }
    if (adone.is.array(value)) {
        return value.map((x) => convertBufferToString(x, encoding));
    }
    return value;
}

/**
 * Convert a list of results to node-style
 *
 * @param {Array} arr - The input value
 * @return {Array} The output value
 * @example
 * ```js
 * var input = ['a', 'b', new Error('c'), 'd'];
 * var output = exports.wrapMultiResult(input);
 * expect(output).to.eql([[null, 'a'], [null, 'b'], [new Error('c')], [null, 'd']);
 * ```
 * @private
 */
export function wrapMultiResult(arr) {
    // When using WATCH/EXEC transactions, the EXEC will return
    // a null instead of an array
    if (!arr) {
        return null;
    }
    const result = arr.map((x) => {
        if (x instanceof Error) {
            return [x];
        }
        return [null, x];
    });
    return result;
}

/**
 * Detect the argument is a int
 *
 * @param {string} value
 * @return {boolean} Whether the value is a int
 * @example
 * ```js
 * > isInt('123')
 * true
 * > isInt('123.3')
 * false
 * > isInt('1x')
 * false
 * > isInt(123)
 * true
 * > isInt(true)
 * false
 * ```
 * @private
 */
export function isInt(value) {
    const x = parseFloat(value);
    return !isNaN(value) && (x | 0) === x;
}

/**
 * Return a callback with timeout
 *
 * @param {function} callback
 * @param {number} timeout
 * @return {function}
 */
export function timeout(callback, timeout) {
    let timer;
    const run = function () {
        if (timer) {
            clearTimeout(timer);
            timer = null;
            callback.apply(this, arguments);
        }
    };
    timer = setTimeout(run, timeout, new Error("timeout"));
    return run;
}

/**
 * Convert an object to an array
 *
 * @param {object} obj
 * @return {array}
 * @example
 * ```js
 * > convertObjectToArray({ a: '1' })
 * ['a', '1']
 * ```
 */
export function convertObjectToArray(obj) {
    const result = [];
    let pos = 0;
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            result[pos] = key;
            result[pos + 1] = obj[key];
        }
        pos += 2;
    }
    return result;
}

/**
 * Convert a map to an array
 *
 * @param {Map} map
 * @return {array}
 * @example
 * ```js
 * > convertObjectToArray(new Map([[1, '2']]))
 * [1, '2']
 * ```
 */
export function convertMapToArray(map) {
    const result = [];
    let pos = 0;
    map.forEach((value, key) => {
        result[pos] = key;
        result[pos + 1] = value;
        pos += 2;
    });
    return result;
}

/**
 * Convert a non-string arg to a string
 *
 * @param {*} arg
 * @return {string}
 */
export function toArg(arg) {
    if (arg === null || adone.is.undefined(arg)) {
        return "";
    }
    return String(arg);
}

/**
 * Optimize error stack
 *
 * @param {Error} error - actually error
 * @param {string} friendlyStack - the stack that more meaningful
 * @param {string} filterPath - only show stacks with the specified path
 */
export function optimizeErrorStack(error, friendlyStack, filterPath) {
    const stacks = friendlyStack.split("\n");
    let lines = "";
    let i;
    for (i = 1; i < stacks.length; ++i) {
        if (stacks[i].indexOf(filterPath) === -1) {
            break;
        }
    }
    for (let j = i; j < stacks.length; ++j) {
        lines += "\n" + stacks[j];
    }
    const pos = error.stack.indexOf("\n");
    error.stack = error.stack.slice(0, pos) + lines;
    return error;
}

/**
 * Parse the redis protocol url
 *
 * @param {string} url - the redis protocol url
 * @return {Object}
 */
export function parseURL(url) {
    if (exports.isInt(url)) {
        return { port: url };
    }
    let parsed = adone.std.url.parse(url, true, true);

    if (!parsed.slashes && url[0] !== "/") {
        url = `//${url}`;
        parsed = adone.std.url.parse(url, true, true);
    }

    const result = {};
    if (parsed.auth) {
        result.password = parsed.auth.split(":")[1];
    }
    if (parsed.pathname) {
        if (parsed.protocol === "redis:") {
            if (parsed.pathname.length > 1) {
                result.db = parsed.pathname.slice(1);
            }
        } else {
            result.path = parsed.pathname;
        }
    }
    if (parsed.host) {
        result.host = parsed.hostname;
    }
    if (parsed.port) {
        result.port = parsed.port;
    }
    adone.vendor.lodash.defaults(result, parsed.query);

    return result;
}

/**
 * Error message for connection being disconnected
 */
export const CONNECTION_CLOSED_ERROR_MSG = "Connection is closed.";
