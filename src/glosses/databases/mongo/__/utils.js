const { is, util, database: { mongo: { core, MongoError, ReadPreference } } } = adone;

export const shallowClone = (obj) => {
    const copy = {};
    for (const name in obj) {
        copy[name] = obj[name];
    }
    return copy;
};

// Figure out the read preference
export const getReadPreference = (options) => {
    let r = null;
    if (options.readPreference) {
        r = options.readPreference;
    } else {
        return options;
    }

    if (r instanceof ReadPreference) {
        options.readPreference = new core.ReadPreference(r.mode, r.tags, {
            maxStalenessSeconds: r.maxStalenessSeconds
        });
    } else if (is.string(r)) {
        options.readPreference = new core.ReadPreference(r);
    } else if (r && !(r instanceof ReadPreference) && is.object(r)) {
        const mode = r.mode || r.preference;
        if (mode && is.string(mode)) {
            options.readPreference = new core.ReadPreference(mode, r.tags, {
                maxStalenessSeconds: r.maxStalenessSeconds
            });
        }
    }

    return options;
};


// Set simple property
export const getSingleProperty = (obj, name, value) => {
    Object.defineProperty(obj, name, {
        enumerable: true,
        get() {
            return value;
        }
    });
};

const formatSortValue = (sortDirection) => {
    const value = `${sortDirection}`.toLowerCase();

    switch (value) {
        case "ascending":
        case "asc":
        case "1": {
            return 1;
        }
        case "descending":
        case "desc":
        case "-1": {
            return -1;
        }
        default: {
            throw new Error("Illegal sort clause, must be of the form [['field1', '(ascending|descending)'], ['field2', '(ascending|descending)']]");
        }
    }
};

export const formattedOrderClause = (sortValue) => {
    let orderBy = {};
    if (is.nil(sortValue)) {
        return null;
    }
    if (is.array(sortValue)) {
        if (sortValue.length === 0) {
            return null;
        }

        for (let i = 0; i < sortValue.length; i++) {
            if (sortValue[i].constructor === String) {
                orderBy[sortValue[i]] = 1;
            } else {
                orderBy[sortValue[i][0]] = formatSortValue(sortValue[i][1]);
            }
        }
    } else if (is.object(sortValue)) {
        orderBy = sortValue;
    } else if (is.string(sortValue)) {
        orderBy[sortValue] = 1;
    } else {
        throw new Error("Illegal sort clause, must be of the form [['field1', '(ascending|descending)'], ['field2', '(ascending|descending)']]");
    }

    return orderBy;
};

export const checkCollectionName = (collectionName) => {
    if (!is.string(collectionName)) {
        throw new MongoError("collection name must be a String");
    }

    if (!collectionName || collectionName.includes("..")) {
        throw new MongoError("collection names cannot be empty");
    }

    if (collectionName.includes("$") && is.nil(collectionName.match(/((^\$cmd)|(oplog\.\$main))/))) {
        throw new MongoError("collection names must not contain '$'");
    }

    if (!is.nil(collectionName.match(/^\.|\.$/))) {
        throw new MongoError("collection names must not start or end with '.'");
    }

    // Validate that we are not passing 0x00 in the colletion name
    if (collectionName.includes("\x00")) {
        throw new MongoError("collection names cannot contain a null character");
    }
};

export const handleCallback = (callback, err, value1, value2) => {
    try {
        if (is.nil(callback)) {
            return;
        }
        if (callback) {
            return value2 ? callback(err, value1, value2) : callback(err, value1);
        }
    } catch (err) {
        process.nextTick(() => {
            throw err;
        });
        return false;
    }

    return true;
};

export const toError = (error) => {
    if (error instanceof Error) {
        return error;
    }
    const msg = error.err || error.errmsg || error.errMessage || error;
    const e = MongoError.create({ message: msg, driver: true });

    // Get all object keys
    const keys = is.object(error) ? util.keys(error, { onlyEnumerable: false }) : [];

    for (let i = 0; i < keys.length; i++) {
        try {
            e[keys[i]] = error[keys[i]];
        } catch (err) {
            // continue
        }
    }

    return e;
};

export const normalizeHintField = (hint) => {
    let finalHint = null;

    if (is.string(hint)) {
        finalHint = hint;
    } else if (is.array(hint)) {
        finalHint = {};

        hint.forEach((param) => {
            finalHint[param] = 1;
        });
    } else if (is.object(hint)) {
        finalHint = {};
        for (const name in hint) {
            finalHint[name] = hint[name];
        }
    }

    return finalHint;
};

export const parseIndexOptions = (fieldOrSpec) => {
    const fieldHash = {};
    const indexes = [];
    let keys;

    // Get all the fields accordingly
    if (is.string(fieldOrSpec)) {
        // 'type'
        indexes.push(`${fieldOrSpec}_${1}`);
        fieldHash[fieldOrSpec] = 1;
    } else if (is.array(fieldOrSpec)) {
        fieldOrSpec.forEach((f) => {
            if (is.string(f)) {
                // [{location:'2d'}, 'type']
                indexes.push(`${f}_${1}`);
                fieldHash[f] = 1;
            } else if (is.array(f)) {
                // [['location', '2d'],['type', 1]]
                indexes.push(`${f[0]}_${f[1] || 1}`);
                fieldHash[f[0]] = f[1] || 1;
            } else if (is.object(f)) {
                // [{location:'2d'}, {type:1}]
                keys = Object.keys(f);
                keys.forEach((k) => {
                    indexes.push(`${k}_${f[k]}`);
                    fieldHash[k] = f[k];
                });
            } else {
                // undefined (ignore)
            }
        });
    } else if (is.object(fieldOrSpec)) {
        // {location:'2d', type:1}
        keys = Object.keys(fieldOrSpec);
        keys.forEach((key) => {
            indexes.push(`${key}_${fieldOrSpec[key]}`);
            fieldHash[key] = fieldOrSpec[key];
        });
    }

    return {
        name: indexes.join("_"), keys, fieldHash
    };
};

export const isObject = (arg) => {
    return Object.prototype.toString.call(arg) === "[object Object]";
};

export const debugOptions = (debugFields, options) => {
    const finaloptions = {};
    debugFields.forEach((n) => {
        finaloptions[n] = options[n];
    });

    return finaloptions;
};

export const decorateCommand = (command, options, exclude) => {
    for (const name in options) {
        if (is.nil(exclude[name])) {
            command[name] = options[name];
        }
    }

    return command;
};

export const mergeOptions = (target, source) => {
    for (const name in source) {
        target[name] = source[name];
    }

    return target;
};

// Merge options with translation
export const translateOptions = (target, source) => {
    const translations = {
        // SSL translation options
        sslCA: "ca",
        sslCRL: "crl",
        sslValidate: "rejectUnauthorized",
        sslKey: "key",
        sslCert: "cert",
        sslPass: "passphrase",
        // SocketTimeout translation options
        socketTimeoutMS: "socketTimeout",
        connectTimeoutMS: "connectionTimeout",
        // Replicaset options
        replicaSet: "setName",
        rs_name: "setName",
        secondaryAcceptableLatencyMS: "acceptableLatency",
        connectWithNoPrimary: "secondaryOnlyConnectionAllowed",
        // Mongos options
        acceptableLatencyMS: "localThresholdMS"
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

export const filterOptions = (options, names) => {
    const filterOptions = {};

    for (const name in options) {
        if (names.includes(name)) {
            filterOptions[name] = options[name];
        }
    }

    // Filtered options
    return filterOptions;
};

// Write concern keys
const writeConcernKeys = ["w", "j", "wtimeout", "fsync"];

// Merge the write concern options
export const mergeOptionsAndWriteConcern = (targetOptions, sourceOptions, keys, mergeWriteConcern) => {
    // Mix in any allowed options
    for (let i = 0; i < keys.length; i++) {
        if (!targetOptions[keys[i]] && !is.nil(sourceOptions[keys[i]])) {
            targetOptions[keys[i]] = sourceOptions[keys[i]];
        }
    }

    // No merging of write concern
    if (!mergeWriteConcern) {
        return targetOptions;
    }

    // Found no write Concern options
    let found = false;
    for (let i = 0; i < writeConcernKeys.length; i++) {
        if (targetOptions[writeConcernKeys[i]]) {
            found = true;
            break;
        }
    }

    if (!found) {
        for (let i = 0; i < writeConcernKeys.length; i++) {
            if (sourceOptions[writeConcernKeys[i]]) {
                targetOptions[writeConcernKeys[i]] = sourceOptions[writeConcernKeys[i]];
            }
        }
    }

    return targetOptions;
};

export const MAX_JS_INT = 0x20000000000000;
