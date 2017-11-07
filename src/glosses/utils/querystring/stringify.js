const {
    is,
    util: {
        querystring: {
            formats,
            escape
        }
    }
} = adone;

const arrayPrefixGenerators = {
    brackets: (prefix) => `${prefix}[]`,
    indices: (prefix, key) => `${prefix}[${key}]`,
    repeat: (prefix) => prefix
};

const toISO = Date.prototype.toISOString;

const defaults = {
    delimiter: "&",
    encode: true,
    encoder: escape,
    encodeValuesOnly: false,
    serializeDate: function serializeDate(date) { // eslint-disable-line func-name-matching
        return toISO.call(date);
    },
    skipNulls: false,
    strictNullHandling: false
};

const _stringify = ( // eslint-disable-line func-name-matching
    object,
    prefix,
    generateArrayPrefix,
    strictNullHandling,
    skipNulls,
    encoder,
    filter,
    sort,
    allowDots,
    serializeDate,
    formatter,
    encodeValuesOnly
) => {
    let obj = object;
    if (is.function(filter)) {
        obj = filter(prefix, obj);
    } else if (obj instanceof Date) {
        obj = serializeDate(obj);
    } else if (is.null(obj)) {
        if (strictNullHandling) {
            return encoder && !encodeValuesOnly ? encoder(prefix, defaults.encoder) : prefix;
        }

        obj = "";
    }

    if (is.string(obj) || is.number(obj) || is.boolean(obj) || is.buffer(obj)) {
        if (encoder) {
            const keyValue = encodeValuesOnly ? prefix : encoder(prefix, defaults.encoder);
            return [`${formatter(keyValue)}=${formatter(encoder(obj, defaults.encoder))}`];
        }
        return [`${formatter(prefix)}=${formatter(String(obj))}`];
    }

    let values = [];

    if (is.undefined(obj)) {
        return values;
    }

    let objKeys;
    if (is.array(filter)) {
        objKeys = filter;
    } else {
        const keys = Object.keys(obj);
        objKeys = sort ? keys.sort(sort) : keys;
    }

    for (let i = 0; i < objKeys.length; ++i) {
        const key = objKeys[i];

        if (skipNulls && is.null(obj[key])) {
            continue;
        }

        if (is.array(obj)) {
            values = values.concat(_stringify(
                obj[key],
                generateArrayPrefix(prefix, key),
                generateArrayPrefix,
                strictNullHandling,
                skipNulls,
                encoder,
                filter,
                sort,
                allowDots,
                serializeDate,
                formatter,
                encodeValuesOnly
            ));
        } else {
            values = values.concat(_stringify(
                obj[key],
                prefix + (allowDots ? `.${key}` : `[${key}]`),
                generateArrayPrefix,
                strictNullHandling,
                skipNulls,
                encoder,
                filter,
                sort,
                allowDots,
                serializeDate,
                formatter,
                encodeValuesOnly
            ));
        }
    }

    return values;
};

export default function stringify(object, opts) {
    let obj = object;
    const options = opts ? { ...opts } : {};

    if (!is.null(options.encoder) && !is.undefined(options.encoder) && !is.function(options.encoder)) {
        throw new TypeError("Encoder has to be a function.");
    }

    const delimiter = is.undefined(options.delimiter) ? defaults.delimiter : options.delimiter;
    const strictNullHandling = is.boolean(options.strictNullHandling) ? options.strictNullHandling : defaults.strictNullHandling;
    const skipNulls = is.boolean(options.skipNulls) ? options.skipNulls : defaults.skipNulls;
    const encode = is.boolean(options.encode) ? options.encode : defaults.encode;
    const encoder = is.function(options.encoder) ? options.encoder : defaults.encoder;
    const sort = is.function(options.sort) ? options.sort : null;
    const allowDots = is.undefined(options.allowDots) ? false : options.allowDots;
    const serializeDate = is.function(options.serializeDate) ? options.serializeDate : defaults.serializeDate;
    const encodeValuesOnly = is.boolean(options.encodeValuesOnly) ? options.encodeValuesOnly : defaults.encodeValuesOnly;
    if (is.undefined(options.format)) {
        options.format = formats.default;
    } else if (!Object.prototype.hasOwnProperty.call(formats.formatters, options.format)) {
        throw new TypeError("Unknown format option provided.");
    }
    const formatter = formats.formatters[options.format];
    let objKeys;
    let filter;

    if (is.function(options.filter)) {
        filter = options.filter;
        obj = filter("", obj);
    } else if (is.array(options.filter)) {
        filter = options.filter;
        objKeys = filter;
    }

    let keys = [];

    if (!is.object(obj)) {
        return "";
    }

    let arrayFormat;
    if (options.arrayFormat in arrayPrefixGenerators) {
        arrayFormat = options.arrayFormat;
    } else if ("indices" in options) {
        arrayFormat = options.indices ? "indices" : "repeat";
    } else {
        arrayFormat = "indices";
    }

    const generateArrayPrefix = arrayPrefixGenerators[arrayFormat];

    if (!objKeys) {
        objKeys = Object.keys(obj);
    }

    if (sort) {
        objKeys.sort(sort);
    }

    for (let i = 0; i < objKeys.length; ++i) {
        const key = objKeys[i];

        if (skipNulls && is.null(obj[key])) {
            continue;
        }

        keys = keys.concat(_stringify(
            obj[key],
            key,
            generateArrayPrefix,
            strictNullHandling,
            skipNulls,
            encode ? encoder : null,
            filter,
            sort,
            allowDots,
            serializeDate,
            formatter,
            encodeValuesOnly
        ));
    }

    const joined = keys.join(delimiter);
    const prefix = options.addQueryPrefix === true ? "?" : "";

    return joined.length > 0 ? prefix + joined : "";
}
