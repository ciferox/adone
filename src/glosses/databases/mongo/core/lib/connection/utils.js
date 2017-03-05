import adone from "adone";

const f = require("util").format;


// Set property function
const setProperty = function (obj, prop, flag, values) {
    Object.defineProperty(obj, prop.name, {
        enumerable: true,
        set (value) {
            if (typeof value != "boolean") throw new Error(f("%s required a boolean", prop.name));
            // Flip the bit to 1
            if (value == true) values.flags |= flag;
            // Flip the bit to 0 if it's set, otherwise ignore
            if (value == false && (values.flags & flag) == flag) values.flags ^= flag;
            prop.value = value;
        }
        , get () { return prop.value; }
    });
};

// Set property function
const getProperty = function (obj, propName, fieldName, values, func) {
    Object.defineProperty(obj, propName, {
        enumerable: true,
        get () {
            // Not parsed yet, parse it
            if (values[fieldName] == null && obj.isParsed && !obj.isParsed()) {
                obj.parse();
            }

            // Do we have a post processing function
            if (typeof func == "function") return func(values[fieldName]);
            // Return raw value
            return values[fieldName];
        }
    });
};

// Set simple property
const getSingleProperty = function (obj, name, value) {
    Object.defineProperty(obj, name, {
        enumerable: true,
        get () {
            return value;
        }
    });
};

// Shallow copy
const copy = function (fObj, tObj) {
    tObj = tObj || {};
    for (const name in fObj) tObj[name] = fObj[name];
    return tObj;
};

const debugOptions = function (debugFields, options) {
    const finaloptions = {};
    debugFields.forEach(function (n) {
        finaloptions[n] = options[n];
    });

    return finaloptions;
};

const retrieveBSON = function () {
    const { data: { bson: { BSON } } } = adone;
    BSON.native = true;

    return BSON;
};

exports.setProperty = setProperty;
exports.getProperty = getProperty;
exports.getSingleProperty = getSingleProperty;
exports.copy = copy;
exports.debugOptions = debugOptions;
exports.retrieveBSON = retrieveBSON;
