/*!
 * Module dependencies.
 */

const StrictModeError = require("./error/strict");
const Types = require("./schema/index");
const util = require("util");
const utils = require("./utils");

const {
    is
} = adone;

const ALLOWED_GEOWITHIN_GEOJSON_TYPES = ["Polygon", "MultiPolygon"];

/**
 * Handles internal casting for query filters.
 *
 * @param {Schema} schema
 * @param {Object} obj Object to cast
 * @param {Object} options the query options
 * @param {Query} context passed to setters
 * @api private
 */
module.exports = function cast(schema, obj, options, context) {
    if (is.array(obj)) {
        throw new Error("Query filter must be an object, got an array ", util.inspect(obj));
    }

    const paths = Object.keys(obj);
    let i = paths.length;
    let _keys;
    let any$conditionals;
    let schematype;
    let nested;
    let path;
    let type;
    let val;

    while (i--) {
        path = paths[i];
        val = obj[path];

        if (path === "$or" || path === "$nor" || path === "$and") {
            var k = val.length;

            while (k--) {
                val[k] = cast(schema, val[k], options, context);
            }
        } else if (path === "$where") {
            type = typeof val;

            if (type !== "string" && type !== "function") {
                throw new Error("Must have a string or function for $where");
            }

            if (type === "function") {
                obj[path] = val.toString();
            }

            continue;
        } else if (path === "$elemMatch") {
            val = cast(schema, val, options, context);
        } else {
            if (!schema) {
                // no casting for Mixed types
                continue;
            }

            schematype = schema.path(path);

            if (!schematype) {
                // Handle potential embedded array queries
                var split = path.split("."),
                    j = split.length,
                    pathFirstHalf,
                    pathLastHalf,
                    remainingConds;

                // Find the part of the var path that is a path of the Schema
                while (j--) {
                    pathFirstHalf = split.slice(0, j).join(".");
                    schematype = schema.path(pathFirstHalf);
                    if (schematype) {
                        break;
                    }
                }

                // If a substring of the input path resolves to an actual real path...
                if (schematype) {
                    // Apply the casting; similar code for $elemMatch in schema/array.js
                    if (schematype.caster && schematype.caster.schema) {
                        remainingConds = {};
                        pathLastHalf = split.slice(j).join(".");
                        remainingConds[pathLastHalf] = val;
                        obj[path] = cast(schematype.caster.schema, remainingConds, options, context)[pathLastHalf];
                    } else {
                        obj[path] = val;
                    }
                    continue;
                }

                if (utils.isObject(val)) {
                    // handle geo schemas that use object notation
                    // { loc: { long: Number, lat: Number }

                    let geo = "";
                    if (val.$near) {
                        geo = "$near";
                    } else if (val.$nearSphere) {
                        geo = "$nearSphere";
                    } else if (val.$within) {
                        geo = "$within";
                    } else if (val.$geoIntersects) {
                        geo = "$geoIntersects";
                    } else if (val.$geoWithin) {
                        geo = "$geoWithin";
                    }

                    if (geo) {
                        const numbertype = new Types.Number("__QueryCasting__");
                        let value = val[geo];

                        if (!is.nil(val.$maxDistance)) {
                            val.$maxDistance = numbertype.castForQueryWrapper({
                                val: val.$maxDistance,
                                context
                            });
                        }
                        if (!is.nil(val.$minDistance)) {
                            val.$minDistance = numbertype.castForQueryWrapper({
                                val: val.$minDistance,
                                context
                            });
                        }

                        if (geo === "$within") {
                            const withinType = value.$center
                                || value.$centerSphere
                                || value.$box
                                || value.$polygon;

                            if (!withinType) {
                                throw new Error(`Bad $within paramater: ${  JSON.stringify(val)}`);
                            }

                            value = withinType;
                        } else if (geo === "$near" &&
                            is.string(value.type) && is.array(value.coordinates)) {
                            // geojson; cast the coordinates
                            value = value.coordinates;
                        } else if ((geo === "$near" || geo === "$nearSphere" || geo === "$geoIntersects") &&
                            value.$geometry && is.string(value.$geometry.type) &&
                            is.array(value.$geometry.coordinates)) {
                            if (!is.nil(value.$maxDistance)) {
                                value.$maxDistance = numbertype.castForQueryWrapper({
                                    val: value.$maxDistance,
                                    context
                                });
                            }
                            if (!is.nil(value.$minDistance)) {
                                value.$minDistance = numbertype.castForQueryWrapper({
                                    val: value.$minDistance,
                                    context
                                });
                            }
                            if (utils.isMongooseObject(value.$geometry)) {
                                value.$geometry = value.$geometry.toObject({
                                    transform: false,
                                    virtuals: false
                                });
                            }
                            value = value.$geometry.coordinates;
                        } else if (geo === "$geoWithin") {
                            if (value.$geometry) {
                                if (utils.isMongooseObject(value.$geometry)) {
                                    value.$geometry = value.$geometry.toObject({ virtuals: false });
                                }
                                const geoWithinType = value.$geometry.type;
                                if (ALLOWED_GEOWITHIN_GEOJSON_TYPES.indexOf(geoWithinType) === -1) {
                                    throw new Error(`Invalid geoJSON type for $geoWithin "${ 
                                        geoWithinType}", must be "Polygon" or "MultiPolygon"`);
                                }
                                value = value.$geometry.coordinates;
                            } else {
                                value = value.$box || value.$polygon || value.$center ||
                                    value.$centerSphere;
                                if (utils.isMongooseObject(value)) {
                                    value = value.toObject({ virtuals: false });
                                }
                            }
                        }

                        _cast(value, numbertype, context);
                        continue;
                    }
                }

                if (options && options.upsert && options.strict && !schema.nested[path]) {
                    if (options.strict === "throw") {
                        throw new StrictModeError(path);
                    }
                    throw new StrictModeError(path, `Path "${path}" is not in ` +
                        "schema, strict mode is `true`, and upsert is `true`.");
                } else if (options && options.strictQuery === "throw") {
                    throw new StrictModeError(path, `Path "${path}" is not in ` +
                        "schema and strictQuery is true.");
                }
            } else if (is.nil(val)) {
                obj[path] = null;
                continue;
            } else if (val.constructor.name === "Object") {
                any$conditionals = Object.keys(val).some((k) => {
                    return k.charAt(0) === "$" && k !== "$id" && k !== "$ref";
                });

                if (!any$conditionals) {
                    obj[path] = schematype.castForQueryWrapper({
                        val,
                        context
                    });
                } else {
                    var ks = Object.keys(val),
                        $cond;

                    k = ks.length;

                    while (k--) {
                        $cond = ks[k];
                        nested = val[$cond];

                        if ($cond === "$not") {
                            if (nested && schematype && !schematype.caster) {
                                _keys = Object.keys(nested);
                                if (_keys.length && _keys[0].charAt(0) === "$") {
                                    for (const key in nested) {
                                        nested[key] = schematype.castForQueryWrapper({
                                            $conditional: key,
                                            val: nested[key],
                                            context
                                        });
                                    }
                                } else {
                                    val[$cond] = schematype.castForQueryWrapper({
                                        $conditional: $cond,
                                        val: nested,
                                        context
                                    });
                                }
                                continue;
                            }
                            cast(schematype.caster ? schematype.caster.schema : schema, nested, options, context);
                        } else {
                            val[$cond] = schematype.castForQueryWrapper({
                                $conditional: $cond,
                                val: nested,
                                context
                            });
                        }
                    }
                }
            } else if (val.constructor.name === "Array" && ["Buffer", "Array"].indexOf(schematype.instance) === -1) {
                const casted = [];
                for (let valIndex = 0; valIndex < val.length; valIndex++) {
                    casted.push(schematype.castForQueryWrapper({
                        val: val[valIndex],
                        context
                    }));
                }

                obj[path] = { $in: casted };
            } else {
                obj[path] = schematype.castForQueryWrapper({
                    val,
                    context
                });
            }
        }
    }

    return obj;
};

function _cast(val, numbertype, context) {
    if (is.array(val)) {
        val.forEach((item, i) => {
            if (is.array(item) || utils.isObject(item)) {
                return _cast(item, numbertype, context);
            }
            val[i] = numbertype.castForQueryWrapper({ val: item, context });
        });
    } else {
        const nearKeys = Object.keys(val);
        let nearLen = nearKeys.length;
        while (nearLen--) {
            const nkey = nearKeys[nearLen];
            const item = val[nkey];
            if (is.array(item) || utils.isObject(item)) {
                _cast(item, numbertype, context);
                val[nkey] = item;
            } else {
                val[nkey] = numbertype.castForQuery({ val: item, context });
            }
        }
    }
}
