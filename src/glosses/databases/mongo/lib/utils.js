const MongoError = require("../core").MongoError;

const shallowClone = function(obj) {
    const copy = {};
    for (const name in obj) copy[name] = obj[name];
    return copy;
};

// Set simple property
const getSingleProperty = function(obj, name, value) {
    Object.defineProperty(obj, name, {
        enumerable: true,
        get() {
            return value;
        }
    });
};

const formatSortValue = exports.formatSortValue = function(sortDirection) {
    const value = ("" + sortDirection).toLowerCase();

    switch (value) {
        case "ascending":
        case "asc":
        case "1":
            return 1;
        case "descending":
        case "desc":
        case "-1":
            return -1;
        default:
            throw new Error("Illegal sort clause, must be of the form "
                    + "[['field1', '(ascending|descending)'], "
                    + "['field2', '(ascending|descending)']]");
    }
};

const formattedOrderClause = exports.formattedOrderClause = function(sortValue) {
    let orderBy = {};
    if (sortValue == null) return null;
    if (Array.isArray(sortValue)) {
        if (sortValue.length === 0) {
            return null;
        }

        for (let i = 0; i < sortValue.length; i++) {
            if (sortValue[i].constructor == String) {
                orderBy[sortValue[i]] = 1;
            } else {
                orderBy[sortValue[i][0]] = formatSortValue(sortValue[i][1]);
            }
        }
    } else if (sortValue != null && typeof sortValue == "object") {
        orderBy = sortValue;
    } else if (typeof sortValue == "string") {
        orderBy[sortValue] = 1;
    } else {
        throw new Error("Illegal sort clause, must be of the form " +
      "[['field1', '(ascending|descending)'], ['field2', '(ascending|descending)']]");
    }

    return orderBy;
};

const checkCollectionName = function checkCollectionName (collectionName) {
    if ("string" !== typeof collectionName) {
        throw Error("collection name must be a String");
    }

    if (!collectionName || collectionName.indexOf("..") != -1) {
        throw Error("collection names cannot be empty");
    }

    if (collectionName.indexOf("$") != -1 &&
      collectionName.match(/((^\$cmd)|(oplog\.\$main))/) == null) {
        throw Error("collection names must not contain '$'");
    }

    if (collectionName.match(/^\.|\.$/) != null) {
        throw Error("collection names must not start or end with '.'");
    }

  // Validate that we are not passing 0x00 in the colletion name
    if (!!~collectionName.indexOf("\x00")) {
        throw new Error("collection names cannot contain a null character");
    }
};

const handleCallback = function(callback, err, value1, value2) {
    try {
        if (callback == null) return;
        if (callback) {
            return value2 ? callback(err, value1, value2) :  callback(err, value1);
        }
    } catch (err) {
        process.nextTick(function() { throw err; });
        return false;
    }

    return true;
};

/**
 * Wrap a Mongo error document in an Error instance
 * @ignore
 * @api private
 */
const toError = function(error) {
    if (error instanceof Error) return error;

    const msg = error.err || error.errmsg || error.errMessage || error;
    const e = MongoError.create({message: msg, driver: true});

  // Get all object keys
    const keys = typeof error == "object"
    ? Object.keys(error)
    : [];

    for (let i = 0; i < keys.length; i++) {
        try {
            e[keys[i]] = error[keys[i]];
        } catch (err) {
      // continue
        }
    }

    return e;
};

/**
 * @ignore
 */
const normalizeHintField = function normalizeHintField(hint) {
    let finalHint = null;

    if (typeof hint == "string") {
        finalHint = hint;
    } else if (Array.isArray(hint)) {
        finalHint = {};

        hint.forEach(function(param) {
            finalHint[param] = 1;
        });
    } else if (hint != null && typeof hint == "object") {
        finalHint = {};
        for (const name in hint) {
            finalHint[name] = hint[name];
        }
    }

    return finalHint;
};

/**
 * Create index name based on field spec
 *
 * @ignore
 * @api private
 */
const parseIndexOptions = function(fieldOrSpec) {
    const fieldHash = {};
    const indexes = [];
    let keys;

  // Get all the fields accordingly
    if ("string" == typeof fieldOrSpec) {
    // 'type'
        indexes.push(fieldOrSpec + "_" + 1);
        fieldHash[fieldOrSpec] = 1;
    } else if (Array.isArray(fieldOrSpec)) {
        fieldOrSpec.forEach(function(f) {
            if ("string" == typeof f) {
        // [{location:'2d'}, 'type']
                indexes.push(f + "_" + 1);
                fieldHash[f] = 1;
            } else if (Array.isArray(f)) {
        // [['location', '2d'],['type', 1]]
                indexes.push(f[0] + "_" + (f[1] || 1));
                fieldHash[f[0]] = f[1] || 1;
            } else if (isObject(f)) {
        // [{location:'2d'}, {type:1}]
                keys = Object.keys(f);
                keys.forEach(function(k) {
                    indexes.push(k + "_" + f[k]);
                    fieldHash[k] = f[k];
                });
            } else {
        // undefined (ignore)
            }
        });
    } else if (isObject(fieldOrSpec)) {
    // {location:'2d', type:1}
        keys = Object.keys(fieldOrSpec);
        keys.forEach(function(key) {
            indexes.push(key + "_" + fieldOrSpec[key]);
            fieldHash[key] = fieldOrSpec[key];
        });
    }

    return {
        name: indexes.join("_"), keys, fieldHash
    };
};

const isObject = exports.isObject = function (arg) {
    return "[object Object]" == toString.call(arg);
};

const debugOptions = function(debugFields, options) {
    const finaloptions = {};
    debugFields.forEach(function(n) {
        finaloptions[n] = options[n];
    });

    return finaloptions;
};

const decorateCommand = function(command, options, exclude) {
    for (const name in options) {
        if (exclude[name] == null) command[name] = options[name];
    }

    return command;
};

const mergeOptions = function(target, source) {
    for (const name in source) {
        target[name] = source[name];
    }

    return target;
};

// Merge options with translation
const translateOptions = function(target, source) {
    const translations = {
    // SSL translation options
        "sslCA": "ca", "sslValidate": "rejectUnauthorized", "sslKey": "key", "sslCert": "cert", "sslPass": "passphrase",
    // SocketTimeout translation options
        "socketTimeoutMS": "socketTimeout", "connectTimeoutMS": "connectionTimeout",
    // Replicaset options
        "replicaSet": "setName", "rs_name": "setName", "secondaryAcceptableLatencyMS": "acceptableLatency",
        "connectWithNoPrimary": "secondaryOnlyConnectionAllowed",
    // Mongos options
        "acceptableLatencyMS": "localThresholdMS"
    };

    for (const name in source) {
        if (translations[name]) {
            target[translations[name]] = source[name];
        } else {
            target[name] = source[name];
        }
    }

    return target;
};

const filterOptions = function(options, names) {
    const filterOptions =  {};

    for (const name in options) {
        if (names.indexOf(name) != -1) filterOptions[name] = options[name];
    }

  // Filtered options
    return filterOptions;
};

// Object.assign method or polyfille
const assign = Object.assign ? Object.assign : function assign(target) {
    if (target === undefined || target === null) {
        throw new TypeError("Cannot convert first argument to object");
    }

    const to = Object(target);
    for (let i = 1; i < arguments.length; i++) {
        const nextSource = arguments[i];
        if (nextSource === undefined || nextSource === null) {
            continue;
        }

        const keysArray = Object.keys(Object(nextSource));
        for (let nextIndex = 0, len = keysArray.length; nextIndex < len; nextIndex++) {
            const nextKey = keysArray[nextIndex];
            const desc = Object.getOwnPropertyDescriptor(nextSource, nextKey);
            if (desc !== undefined && desc.enumerable) {
                to[nextKey] = nextSource[nextKey];
            }
        }
    }
    return to;
};

exports.filterOptions = filterOptions;
exports.mergeOptions = mergeOptions;
exports.translateOptions = translateOptions;
exports.shallowClone = shallowClone;
exports.getSingleProperty = getSingleProperty;
exports.checkCollectionName = checkCollectionName;
exports.toError = toError;
exports.formattedOrderClause = formattedOrderClause;
exports.parseIndexOptions = parseIndexOptions;
exports.normalizeHintField = normalizeHintField;
exports.handleCallback = handleCallback;
exports.decorateCommand = decorateCommand;
exports.isObject = isObject;
exports.debugOptions = debugOptions;
exports.MAX_JS_INT = 0x20000000000000;
exports.assign = assign;
