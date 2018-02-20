const {
    is,
    error,
    std
} = adone;

export const convertBufferToString = (value, encoding) => {
    if (is.buffer(value)) {
        return value.toString(encoding);
    }
    if (is.array(value)) {
        return value.map((x) => convertBufferToString(x, encoding));
    }
    return value;
};

export const wrapMultiResult = (arr) => {
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
};

export const isInt = (value) => !isNaN(value) && is.integer(parseFloat(value));

export const timeout = (callback, timeout) => {
    let timer;
    const run = function (...args) {
        if (timer) {
            clearTimeout(timer);
            timer = null;
            callback.apply(this, args);
        }
    };
    timer = setTimeout(run, timeout, new error.Timeout());
    return run;
};

export const convertObjectToArray = (obj) => {
    const result = [];
    const keys = Object.keys(obj);

    for (const key of keys) {
        result.push(key, obj[key]);
    }
    return result;
};

export const convertMapToArray = (map) => {
    const result = [];
    map.forEach((value, key) => {
        result.push(key, value);
    });
    return result;
};

export const toArg = (arg) => {
    if (is.nil(arg)) {
        return "";
    }
    return String(arg);
};

export const optimizeErrorStack = (error, friendlyStack, filterPath) => {
    const stacks = friendlyStack.split("\n");
    let lines = "";
    let i;
    for (i = 1; i < stacks.length; ++i) {
        if (!stacks[i].includes(filterPath)) {
            break;
        }
    }
    for (let j = i; j < stacks.length; ++j) {
        lines += `\n${stacks[j]}`;
    }
    const pos = error.stack.indexOf("\n");
    error.stack = error.stack.slice(0, pos) + lines;
    return error;
};

export const parseURL = (url) => {
    if (isInt(url)) {
        return { port: url };
    }
    let parsed = std.url.parse(url, true, true);

    if (!parsed.slashes && url[0] !== "/") {
        url = `//${url}`;
        parsed = std.url.parse(url, true, true);
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

    return { ...parsed.query, ...result };
};

export const packObject = (array) => {
    const result = {};
    const { length } = array;

    for (let i = 1; i < length; i += 2) {
        result[array[i - 1]] = array[i];
    }

    return result;
};

export const CONNECTION_CLOSED_ERROR_MSG = "Connection is closed.";
