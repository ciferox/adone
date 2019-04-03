/* eslint-disable adone/no-typeof */
const {
    is
} = adone;

export const forEach = (obj, fn) => {
    // Don't bother if no value provided
    if (is.nil(obj)) {
        return;
    }

    // Force an array if not already something iterable
    if (typeof obj !== "object") {
        /**
         * eslint no-param-reassign:0
         */
        obj = [obj];
    }

    if (is.array(obj)) {
        // Iterate over array values
        for (let i = 0, l = obj.length; i < l; i++) {
            fn.call(null, obj[i], i, obj);
        }
    } else {
        // Iterate over object keys
        const ents = adone.util.entries(obj, { enumOnly: false }).filter((x) => x[0] !== "constructor");
        for (const [key, method] of ents) {
            fn.call(null, method, key, obj);
        }
    }
};

export const merge = (...args) => {
    const result = {};
    const assignValue = (val, key) => {
        if (typeof result[key] === "object" && typeof val === "object") {
            result[key] = merge(result[key], val);
        } else {
            result[key] = val;
        }
    };

    for (let i = 0, l = args.length; i < l; i++) {
        forEach(args[i], assignValue);
    }
    return result;
};

export const deepMerge = (...args) => {
    const result = {};
    const assignValue = (val, key) => {
        if (typeof result[key] === "object" && typeof val === "object") {
            result[key] = deepMerge(result[key], val);
        } else if (typeof val === "object") {
            result[key] = deepMerge({}, val);
        } else {
            result[key] = val;
        }
    };

    for (let i = 0, l = args.length; i < l; i++) {
        forEach(args[i], assignValue);
    }
    return result;
};

export const extend = (a, b, thisArg) => {
    forEach(b, function assignValue(val, key) {
        if (thisArg && is.function(val)) {
            a[key] = val.bind(thisArg);
        } else {
            a[key] = val;
        }
    });
    return a;
};

export const normalizeHeaderName = (headers, normalizedName) => {
    forEach(headers, (value, name) => {
        if (name !== normalizedName && name.toUpperCase() === normalizedName.toUpperCase()) {
            headers[normalizedName] = value;
            delete headers[name];
        }
    });
};

const encode = (val) => encodeURIComponent(val).
    replace(/%40/gi, "@").
    replace(/%3A/gi, ":").
    replace(/%24/g, "$").
    replace(/%2C/gi, ",").
    replace(/%20/g, "+").
    replace(/%5B/gi, "[").
    replace(/%5D/gi, "]");


const isURLSearchParams = (val) => !is.undefined(URLSearchParams) && val instanceof URLSearchParams;

/**
 * Build a URL by appending params to the end
 *
 * @param {string} url The base of the url (e.g., http://www.google.com)
 * @param {object} [params] The params to be appended
 * @returns {string} The formatted url
 */
export const buildURL = (url, params, paramsSerializer) => {
    /*eslint no-param-reassign:0*/
    if (!params) {
        return url;
    }

    let serializedParams;
    if (paramsSerializer) {
        serializedParams = paramsSerializer(params);
    } else if (isURLSearchParams(params)) {
        serializedParams = params.toString();
    } else {
        const parts = [];

        forEach(params, function serialize(val, key) {
            if (is.nil(val)) {
                return;
            }

            if (is.array(val)) {
                key = `${key}[]`;
            } else {
                val = [val];
            }

            forEach(val, function parseValue(v) {
                if (is.date(v)) {
                    v = v.toISOString();
                } else if (is.object(v)) {
                    v = JSON.stringify(v);
                }
                parts.push(`${encode(key)}=${encode(v)}`);
            });
        });

        serializedParams = parts.join("&");
    }

    if (serializedParams) {
        const hashmarkIndex = url.indexOf("#");
        if (hashmarkIndex !== -1) {
            url = url.slice(0, hashmarkIndex);
        }

        url += (!url.includes("?") ? "?" : "&") + serializedParams;
    }

    return url;
};
