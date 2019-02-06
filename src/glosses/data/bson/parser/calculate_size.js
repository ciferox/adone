const {
    data: { bson },
    is
} = adone;

const Long = require("../long");
const Double = require("../double");
const Timestamp = require("../timestamp");
const ObjectId = require("../objectid");
const BSONSymbol = require("../symbol");
const BSONRegExp = require("../regexp");
const Code = require("../code");
const Decimal128 = require("../decimal128");
const MinKey = require("../min_key");
const MaxKey = require("../max_key");
const DBRef = require("../db_ref");
const Binary = require("../binary");
const normalizedFunctionString = require("./utils").normalizedFunctionString;


// To ensure that 0.4 of node works correctly
const isDate = (d) => typeof d === "object" && Object.prototype.toString.call(d) === "[object Date]";

/**
 * @ignore
 * @api private
 */
const calculateElement = function (name, value, serializeFunctions, isArray, ignoreUndefined) {
    // If we have toBSON defined, override the current object
    if (value && value.toBSON) {
        value = value.toBSON();
    }

    switch (typeof value) {
        case "string":
            return 1 + Buffer.byteLength(name, "utf8") + 1 + 4 + Buffer.byteLength(value, "utf8") + 1;
        case "number":
            if (
                Math.floor(value) === value &&
                value >= bson.JS_INT_MIN &&
                value <= bson.JS_INT_MAX
            ) {
                if (value >= bson.BSON_INT32_MIN && value <= bson.BSON_INT32_MAX) {
                    // 32 bit
                    return (!is.nil(name) ? Buffer.byteLength(name, "utf8") + 1 : 0) + (4 + 1);
                }
                return (!is.nil(name) ? Buffer.byteLength(name, "utf8") + 1 : 0) + (8 + 1);

            }
            // 64 bit
            return (!is.nil(name) ? Buffer.byteLength(name, "utf8") + 1 : 0) + (8 + 1);

        case "undefined":
            if (isArray || !ignoreUndefined) {
                return (!is.nil(name) ? Buffer.byteLength(name, "utf8") + 1 : 0) + 1;
            }
            return 0;
        case "boolean":
            return (!is.nil(name) ? Buffer.byteLength(name, "utf8") + 1 : 0) + (1 + 1);
        case "object":
            if (
                is.nil(value) ||
                value instanceof MinKey ||
                value instanceof MaxKey ||
                value._bsontype === "MinKey" ||
                value._bsontype === "MaxKey"
            ) {
                return (!is.nil(name) ? Buffer.byteLength(name, "utf8") + 1 : 0) + 1;
            } else if (value instanceof ObjectId || value._bsontype === "ObjectId") {
                return (!is.nil(name) ? Buffer.byteLength(name, "utf8") + 1 : 0) + (12 + 1);
            } else if (value instanceof Date || isDate(value)) {
                return (!is.nil(name) ? Buffer.byteLength(name, "utf8") + 1 : 0) + (8 + 1);
            } else if (!is.undefined(Buffer) && is.buffer(value)) {
                return (
                    (!is.nil(name) ? Buffer.byteLength(name, "utf8") + 1 : 0) + (1 + 4 + 1) + value.length
                );
            } else if (
                value instanceof Long ||
                value instanceof Double ||
                value instanceof Timestamp ||
                value._bsontype === "Long" ||
                value._bsontype === "Double" ||
                value._bsontype === "Timestamp"
            ) {
                return (!is.nil(name) ? Buffer.byteLength(name, "utf8") + 1 : 0) + (8 + 1);
            } else if (value instanceof Decimal128 || value._bsontype === "Decimal128") {
                return (!is.nil(name) ? Buffer.byteLength(name, "utf8") + 1 : 0) + (16 + 1);
            } else if (value instanceof Code || value._bsontype === "Code") {
                // Calculate size depending on the availability of a scope
                if (!is.nil(value.scope) && Object.keys(value.scope).length > 0) {
                    return (
                        (!is.nil(name) ? Buffer.byteLength(name, "utf8") + 1 : 0) +
                        1 +
                        4 +
                        4 +
                        Buffer.byteLength(value.code.toString(), "utf8") +
                        1 +
                        calculateObjectSize(value.scope, serializeFunctions, ignoreUndefined)
                    );
                }
                return (
                    (!is.nil(name) ? Buffer.byteLength(name, "utf8") + 1 : 0) +
                    1 +
                    4 +
                    Buffer.byteLength(value.code.toString(), "utf8") +
                    1
                );

            } else if (value instanceof Binary || value._bsontype === "Binary") {
                // Check what kind of subtype we have
                if (value.subType === Binary.SUBTYPE_BYTE_ARRAY) {
                    return (
                        (!is.nil(name) ? Buffer.byteLength(name, "utf8") + 1 : 0) +
                        (value.position + 1 + 4 + 1 + 4)
                    );
                }
                return (
                    (!is.nil(name) ? Buffer.byteLength(name, "utf8") + 1 : 0) + (value.position + 1 + 4 + 1)
                );

            } else if (value instanceof BSONSymbol || value._bsontype === "Symbol") {
                return (
                    (!is.nil(name) ? Buffer.byteLength(name, "utf8") + 1 : 0) +
                    Buffer.byteLength(value.value, "utf8") +
                    4 +
                    1 +
                    1
                );
            } else if (value instanceof DBRef || value._bsontype === "DBRef") {
                // Set up correct object for serialization
                const orderedValues = Object.assign(
                    {
                        $ref: value.collection,
                        $id: value.oid
                    },
                    value.fields
                );

                // Add db reference if it exists
                if (!is.nil(value.db)) {
                    orderedValues.$db = value.db;
                }

                return (
                    (!is.nil(name) ? Buffer.byteLength(name, "utf8") + 1 : 0) +
                    1 +
                    calculateObjectSize(orderedValues, serializeFunctions, ignoreUndefined)
                );
            } else if (
                value instanceof RegExp ||
                Object.prototype.toString.call(value) === "[object RegExp]"
            ) {
                return (
                    (!is.nil(name) ? Buffer.byteLength(name, "utf8") + 1 : 0) +
                    1 +
                    Buffer.byteLength(value.source, "utf8") +
                    1 +
                    (value.global ? 1 : 0) +
                    (value.ignoreCase ? 1 : 0) +
                    (value.multiline ? 1 : 0) +
                    1
                );
            } else if (value instanceof BSONRegExp || value._bsontype === "BSONRegExp") {
                return (
                    (!is.nil(name) ? Buffer.byteLength(name, "utf8") + 1 : 0) +
                    1 +
                    Buffer.byteLength(value.pattern, "utf8") +
                    1 +
                    Buffer.byteLength(value.options, "utf8") +
                    1
                );
            }
            return (
                (!is.nil(name) ? Buffer.byteLength(name, "utf8") + 1 : 0) +
                calculateObjectSize(value, serializeFunctions, ignoreUndefined) +
                1
            );

        case "function":
            // WTF for 0.4.X where typeof /someregexp/ === 'function'
            if (
                value instanceof RegExp ||
                Object.prototype.toString.call(value) === "[object RegExp]" ||
                String.call(value) === "[object RegExp]"
            ) {
                return (
                    (!is.nil(name) ? Buffer.byteLength(name, "utf8") + 1 : 0) +
                    1 +
                    Buffer.byteLength(value.source, "utf8") +
                    1 +
                    (value.global ? 1 : 0) +
                    (value.ignoreCase ? 1 : 0) +
                    (value.multiline ? 1 : 0) +
                    1
                );
            }
            if (serializeFunctions && !is.nil(value.scope) && Object.keys(value.scope).length > 0) {
                return (
                    (!is.nil(name) ? Buffer.byteLength(name, "utf8") + 1 : 0) +
                    1 +
                    4 +
                    4 +
                    Buffer.byteLength(normalizedFunctionString(value), "utf8") +
                    1 +
                    calculateObjectSize(value.scope, serializeFunctions, ignoreUndefined)
                );
            } else if (serializeFunctions) {
                return (
                    (!is.nil(name) ? Buffer.byteLength(name, "utf8") + 1 : 0) +
                    1 +
                    4 +
                    Buffer.byteLength(normalizedFunctionString(value), "utf8") +
                    1
                );
            }

    }

    return 0;
};

const calculateObjectSize = function (object, serializeFunctions, ignoreUndefined) {
    let totalLength = 4 + 1;

    if (is.array(object)) {
        for (let i = 0; i < object.length; i++) {
            totalLength += calculateElement(
                i.toString(),
                object[i],
                serializeFunctions,
                true,
                ignoreUndefined
            );
        }
    } else {
        // If we have toBSON defined, override the current object

        if (object.toBSON) {
            object = object.toBSON();
        }

        // Calculate size
        for (const key in object) {
            totalLength += calculateElement(key, object[key], serializeFunctions, false, ignoreUndefined);
        }
    }

    return totalLength;
};

module.exports = calculateObjectSize;
