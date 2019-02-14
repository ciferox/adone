const {
    is
} = adone;

const Long = require("./long");
const Double = require("./double");
const Timestamp = require("./timestamp");
const ObjectId = require("./objectid");
const BSONRegExp = require("./regexp");
const Symbol = require("./symbol");
const Int32 = require("./int_32");
const Code = require("./code");
const Decimal128 = require("./decimal128");
const MinKey = require("./min_key");
const MaxKey = require("./max_key");
const DBRef = require("./db_ref");
const Binary = require("./binary");

/**
 * @namespace EJSON
 */

// all the types where we don't need to do any special processing and can just pass the EJSON
//straight to type.fromExtendedJSON
const keysToCodecs = {
    $oid: ObjectId,
    $binary: Binary,
    $symbol: Symbol,
    $numberInt: Int32,
    $numberDecimal: Decimal128,
    $numberDouble: Double,
    $numberLong: Long,
    $minKey: MinKey,
    $maxKey: MaxKey,
    $regularExpression: BSONRegExp,
    $timestamp: Timestamp
};

// MAX INT32 boundaries
const BSON_INT32_MAX = 0x7fffffff;


const BSON_INT32_MIN = -0x80000000;


const BSON_INT64_MAX = 0x7fffffffffffffff;


const BSON_INT64_MIN = -0x8000000000000000;


const deserializeValue = function (self, key, value, options) {
    if (is.number(value)) {
        if (options.relaxed) {
            return value;
        }

        // if it's an integer, should interpret as smallest BSON integer
        // that can represent it exactly. (if out of range, interpret as double.)
        if (Math.floor(value) === value) {
            if (value >= BSON_INT32_MIN && value <= BSON_INT32_MAX) {
                return new Int32(value);
            }
            if (value >= BSON_INT64_MIN && value <= BSON_INT64_MAX) {
                return Long.fromNumber(value);
            }
        }

        // If the number is a non-integer or out of integer range, should interpret as BSON Double.
        return new Double(value);
    }

    // from here on out we're looking for bson types, so bail if its not an object
    if (is.nil(value) || typeof value !== "object") {
        return value;
    }

    // upgrade deprecated undefined to null
    if (value.$undefined) {
        return null;
    }

    const keys = Object.keys(value).filter((k) => k.startsWith("$") && !is.nil(value[k]));
    for (let i = 0; i < keys.length; i++) {
        const c = keysToCodecs[keys[i]];
        if (c) {
            return c.fromExtendedJSON(value, options);
        }
    }

    if (!is.nil(value.$date)) {
        const d = value.$date;
        const date = new Date();

        if (is.string(d)) {
            date.setTime(Date.parse(d));
        } else if (d instanceof Long) {
            date.setTime(d.toNumber());
        } else if (is.number(d) && options.relaxed) {
            date.setTime(d);
        }
        return date;
    }

    if (!is.nil(value.$code)) {
        const copy = Object.assign({}, value);
        if (value.$scope) {
            copy.$scope = deserializeValue(self, null, value.$scope);
        }

        return Code.fromExtendedJSON(value);
    }

    if (!is.nil(value.$ref) || !is.nil(value.$dbPointer)) {
        const v = value.$ref ? value : value.$dbPointer;

        // we run into this in a "degenerate EJSON" case (with $id and $ref order flipped)
        // because of the order JSON.parse goes through the document
        if (v instanceof DBRef) {
            return v;
        }

        const dollarKeys = Object.keys(v).filter((k) => k.startsWith("$"));
        let valid = true;
        dollarKeys.forEach((k) => {
            if (["$ref", "$id", "$db"].indexOf(k) === -1) {
                valid = false;
            }
        });

        // only make DBRef if $ keys are all valid
        if (valid) {
            return DBRef.fromExtendedJSON(v);
        }
    }

    return value;
};

/**
 * Parse an Extended JSON string, constructing the JavaScript value or object described by that
 * string.
 *
 * @memberof EJSON
 * @param {string} text
 * @param {object} [options] Optional settings
 * @param {boolean} [options.relaxed=true] Attempt to return native JS types where possible, rather than BSON types (if true)
 * @return {object}
 *
 * @example
 * const { EJSON } = require('bson');
 * const text = '{ "int32": { "$numberInt": "10" } }';
 *
 * // prints { int32: { [String: '10'] _bsontype: 'Int32', value: '10' } }
 * console.log(EJSON.parse(text, { relaxed: false }));
 *
 * // prints { int32: 10 }
 * console.log(EJSON.parse(text));
 */
const parse = function (text, options) {
    options = Object.assign({}, { relaxed: true }, options);

    // relaxed implies not strict
    if (is.boolean(options.relaxed)) {
        options.strict = !options.relaxed;
    }
    if (is.boolean(options.strict)) {
        options.relaxed = !options.strict;
    }

    return JSON.parse(text, (key, value) => deserializeValue(this, key, value, options));
};

//
// Serializer
//

/**
 * Converts a BSON document to an Extended JSON string, optionally replacing values if a replacer
 * function is specified or optionally including only the specified properties if a replacer array
 * is specified.
 *
 * @memberof EJSON
 * @param {object} value The value to convert to extended JSON
 * @param {function|array} [replacer] A function that alters the behavior of the stringification process, or an array of String and Number objects that serve as a whitelist for selecting/filtering the properties of the value object to be included in the JSON string. If this value is null or not provided, all properties of the object are included in the resulting JSON string
 * @param {string|number} [space] A String or Number object that's used to insert white space into the output JSON string for readability purposes.
 * @param {object} [options] Optional settings
 * @param {boolean} [options.relaxed=true] Enabled Extended JSON's `relaxed` mode
 * @returns {string}
 *
 * @example
 * const { EJSON } = require('bson');
 * const Int32 = require('mongodb').Int32;
 * const doc = { int32: new Int32(10) };
 *
 * // prints '{"int32":{"$numberInt":"10"}}'
 * console.log(EJSON.stringify(doc, { relaxed: false }));
 *
 * // prints '{"int32":10}'
 * console.log(EJSON.stringify(doc));
 */
const stringify = function (value, replacer, space, options) {
    if (!is.nil(space) && typeof space === "object") {
        options = space;
        space = 0;
    }
    if (!is.nil(replacer) && typeof replacer === "object" && !is.array(replacer)) {
        options = replacer;
        replacer = null;
        space = 0;
    }
    options = Object.assign({}, { relaxed: true }, options);

    const doc = is.array(value)
        ? serializeArray(value, options)
        : serializeDocument(value, options);

    return JSON.stringify(doc, replacer, space);
};

/**
 * Serializes an object to an Extended JSON string, and reparse it as a JavaScript object.
 *
 * @memberof EJSON
 * @param {object} bson The object to serialize
 * @param {object} [options] Optional settings passed to the `stringify` function
 * @return {object}
 */
const serialize = function (bson, options) {
    options = options || {};
    return JSON.parse(stringify(bson, options));
};

/**
 * Deserializes an Extended JSON object into a plain JavaScript object with native/BSON types
 *
 * @memberof EJSON
 * @param {object} ejson The Extended JSON object to deserialize
 * @param {object} [options] Optional settings passed to the parse method
 * @return {object}
 */
const deserialize = function (ejson, options) {
    options = options || {};
    return parse(JSON.stringify(ejson), options);
};

const getISOString = function (date) {
    const isoStr = date.toISOString();
    // we should only show milliseconds in timestamp if they're non-zero
    return date.getUTCMilliseconds() !== 0 ? isoStr : `${isoStr.slice(0, -5)}Z`;
};

const serializeValue = function (value, options) {
    if (is.array(value)) {
        return serializeArray(value, options);
    }

    if (is.undefined(value)) {
        return null;
    }

    if (value instanceof Date) {
        const dateNum = value.getTime();

        // is it in year range 1970-9999?

        const inRange = dateNum > -1 && dateNum < 253402318800000;

        return options.relaxed && inRange
            ? { $date: getISOString(value) }
            : { $date: { $numberLong: value.getTime().toString() } };
    }

    if (is.number(value) && !options.relaxed) {
        // it's an integer
        if (Math.floor(value) === value) {
            const int32Range = value >= BSON_INT32_MIN && value <= BSON_INT32_MAX;


            const int64Range = value >= BSON_INT64_MIN && value <= BSON_INT64_MAX;

            // interpret as being of the smallest BSON integer type that can represent the number exactly
            if (int32Range) {
                return { $numberInt: value.toString() };
            }
            if (int64Range) {
                return { $numberLong: value.toString() };
            }
        }
        return { $numberDouble: value.toString() };
    }

    if (value instanceof RegExp) {
        let flags = value.flags;
        if (is.undefined(flags)) {
            flags = value.toString().match(/[gimuy]*$/)[0];
        }

        const rx = new BSONRegExp(value.source, flags);
        return rx.toExtendedJSON();
    }

    if (!is.nil(value) && typeof value === "object") {
        return serializeDocument(value, options);
    }
    return value;
};

const serializeArray = function (array, options) {
    return array.map((v) => serializeValue(v, options));
};

const serializeDocument = function (doc, options) {
    if (is.nil(doc) || typeof doc !== "object") {
        throw new Error("not an object instance");
    }

    // the "document" is a BSON type
    if (doc._bsontype) {
        if (is.function(doc.toExtendedJSON)) {
            // TODO: the two cases below mutate the original document! Bad.  I don't know
            // enough about these two BSON types to know how to safely clone these objects, but
            // someone who knows MongoDB better should fix this to clone instead of mutating input objects.
            if (doc._bsontype === "Code" && doc.scope) {
                doc.scope = serializeDocument(doc.scope, options);
            } else if (doc._bsontype === "DBRef" && doc.oid) {
                doc.oid = serializeDocument(doc.oid, options);
            }

            return doc.toExtendedJSON(options);
        }
        // TODO: should we throw an exception if there's a BSON type that has no toExtendedJSON method?
    }

    // Recursively serialize this document's property values. 
    const _doc = {};
    for (const name in doc) {
        _doc[name] = serializeValue(doc[name], options);
    }

    return _doc;
};

module.exports = {
    parse,
    deserialize,
    serialize,
    stringify
};
