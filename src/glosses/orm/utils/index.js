import Logger from "./logger";

const {
    is,
    vendor: { lodash: _ },
    orm
} = adone;

const {
    operator
} = orm;

const operatorsArray = _.values(operator);
const primitives = ["string", "number", "boolean"];
const logger = new Logger();

const util = adone.lazify({
    sqlString: "./sql_string",
    parserStore: "./parser_store",
    Validator: "./validator",
    validateParameter: "./validate_parameter"
}, exports, require);

exports.debug = logger.debug.bind(logger);
exports.deprecate = logger.deprecate.bind(logger);
exports.warn = logger.warn.bind(logger);
exports.getLogger = () => logger;

export const camelizeIf = (str, condition) => {
    let result = str;

    if (condition) {
        result = camelize(str);
    }

    return result;
};

export const underscoredIf = (str, condition) => {
    let result = str;

    if (condition) {
        result = underscore(str);
    }

    return result;
};

export const isPrimitive = (val) => {
    return primitives.indexOf(typeof val) !== -1;
};

// Same concept as _.merge, but don't overwrite properties that have already been assigned
export const mergeDefaults = (a, b) => {
    return _.mergeWith(a, b, (objectValue) => {
    // If it's an object, let _ handle it this time, we will be called again for each property
        if (!_.isPlainObject(objectValue) && !is.undefined(objectValue)) {
            return objectValue;
        }
    });
};

// An alternative to _.merge, which doesn't clone its arguments
// Cloning is a bad idea because options arguments may contain references to sequelize
// models - which again reference database libs which don't like to be cloned (in particular pg-native)
export const merge = (...args) => {
    const result = {};

    for (const obj of args) {
        _.forOwn(obj, (value, key) => {
            if (!is.undefined(value)) {
                if (!result[key]) {
                    result[key] = value;
                } else if (_.isPlainObject(value) && _.isPlainObject(result[key])) {
                    result[key] = merge(result[key], value);
                } else if (is.array(value) && is.array(result[key])) {
                    result[key] = value.concat(result[key]);
                } else {
                    result[key] = value;
                }
            }
        });
    }

    return result;
};

export const lowercaseFirst = (s) => s[0].toLowerCase() + s.slice(1);

export const uppercaseFirst = (s) => s[0].toUpperCase() + s.slice(1);

export const spliceStr = (str, index, count, add) => str.slice(0, index) + add + str.slice(index + count);

export const camelize = (str) => str.trim().replace(/[-_\s]+(.)?/g, (match, c) => c.toUpperCase());

export const underscore = (str) => adone.util.inflection.underscore(str);

export const format = (arr, dialect) => {
    const timeZone = null;
    // Make a clone of the array beacuse format modifies the passed args
    return util.sqlString.format(arr[0], arr.slice(1), timeZone, dialect);
};

export const formatNamedParameters = (sql, parameters, dialect) => {
    const timeZone = null;
    return util.sqlString.formatNamedParameters(sql, parameters, timeZone, dialect);
};

export const cloneDeep = (obj) => {
    obj = obj || {};
    return _.cloneDeepWith(obj, (elem) => {
    // Do not try to customize cloning of arrays or POJOs
        if (is.array(elem) || _.isPlainObject(elem)) {
            return undefined;
        }

        // Don't clone stuff that's an object, but not a plain one - fx example sequelize models and instances
        if (typeof elem === "object") {
            return elem;
        }

        // Preserve special data-types like `fn` across clones. _.get() is used for checking up the prototype chain
        if (elem && is.function(elem.clone)) {
            return elem.clone();
        }
    });
};

/**
 * Expand and normalize finder options
 */
export const mapFinderOptions = (options, Model) => {
    if (Model._hasVirtualAttributes && is.array(options.attributes)) {
        for (const attribute of options.attributes) {
            if (Model._isVirtualAttribute(attribute) && Model.rawAttributes[attribute].type.fields) {
                options.attributes = options.attributes.concat(Model.rawAttributes[attribute].type.fields);
            }
        }
        options.attributes = _.without.apply(_, [options.attributes].concat(Model._virtualAttributes));
        options.attributes = _.uniq(options.attributes);
    }

    mapOptionFieldNames(options, Model);

    return options;
};

/**
 * Used to map field names in attributes and where conditions
 */
export const mapOptionFieldNames = (options, Model) => {
    if (is.array(options.attributes)) {
        options.attributes = options.attributes.map((attr) => {
            // Object lookups will force any variable to strings, we don't want that for special objects etc
            if (!is.string(attr)) {
                return attr;
            }
            // Map attributes to aliased syntax attributes
            if (Model.rawAttributes[attr] && attr !== Model.rawAttributes[attr].field) {
                return [Model.rawAttributes[attr].field, attr];
            }
            return attr;
        });
    }

    if (options.where && _.isPlainObject(options.where)) {
        options.where = mapWhereFieldNames(options.where, Model);
    }

    return options;
};

export const mapWhereFieldNames = (attributes, Model) => {
    if (attributes) {
        getComplexKeys(attributes).forEach((attribute) => {
            const rawAttribute = Model.rawAttributes[attribute];

            if (rawAttribute && rawAttribute.field !== rawAttribute.fieldName) {
                attributes[rawAttribute.field] = attributes[attribute];
                delete attributes[attribute];
            }

            if (
                _.isPlainObject(attributes[attribute])
                && !(
                    rawAttribute
                    && (rawAttribute.type instanceof orm.type.HSTORE || rawAttribute.type instanceof orm.type.JSON)
                )
            ) { // Prevent renaming of HSTORE & JSON fields
                attributes[attribute] = mapOptionFieldNames({
                    where: attributes[attribute]
                }, Model).where;
            }

            if (is.array(attributes[attribute])) {
                attributes[attribute] = attributes[attribute].map((where) => {
                    if (_.isPlainObject(where)) {
                        return mapWhereFieldNames(where, Model);
                    }

                    return where;
                });
            }

        });
    }

    return attributes;
};

/**
 * Used to map field names in values
 */
export const mapValueFieldNames = (dataValues, fields, Model) => {
    const values = {};

    for (const attr of fields) {
        if (!is.undefined(dataValues[attr]) && !Model._isVirtualAttribute(attr)) {
            // Field name mapping
            if (Model.rawAttributes[attr] && Model.rawAttributes[attr].field && Model.rawAttributes[attr].field !== attr) {
                values[Model.rawAttributes[attr].field] = dataValues[attr];
            } else {
                values[attr] = dataValues[attr];
            }
        }
    }

    return values;
};

export const isColString = (value) => {
    return is.string(value) && value.substr(0, 1) === "$" && value.substr(value.length - 1, 1) === "$";
};

export const argsArePrimaryKeys = (args, primaryKeys) => {
    let result = args.length === Object.keys(primaryKeys).length;
    if (result) {
        _.each(args, (arg) => {
            if (result) {
                if (["number", "string"].indexOf(typeof arg) !== -1) {
                    result = true;
                } else {
                    result = arg instanceof Date || is.buffer(arg);
                }
            }
        });
    }
    return result;
};

export const canTreatArrayAsAnd = (arr) => {
    return arr.reduce((treatAsAnd, arg) => {
        if (treatAsAnd) {
            return treatAsAnd;
        }
        return _.isPlainObject(arg);

    }, false);
};

export const combineTableNames = (tableName1, tableName2) => {
    return tableName1.toLowerCase() < tableName2.toLowerCase() ? tableName1 + tableName2 : tableName2 + tableName1;
};

export const singularize = (str) => adone.util.inflection.singularizeWord(str);

export const pluralize = (str) => adone.util.inflection.pluralizeWord(str);

export const removeCommentsFromFunctionString = (s) => {
    s = s.replace(/\s*(\/\/.*)/g, "");
    s = s.replace(/(\/\*[\n\r\s\S]*?\*\/)/mg, "");
    return s;
};

export const now = (dialect) => {
    const now = new Date();
    if (["mysql", "postgres", "sqlite", "mssql"].indexOf(dialect) === -1) {
        now.setMilliseconds(0);
    }
    return now;
};

export const toDefaultValue = (value, dialect) => {
    const { type } = orm;
    if (is.function(value)) {
        const tmp = is.class(value) ? new value() : value();
        if (tmp instanceof type.ABSTRACT) {
            return tmp.toSql();
        }
        return tmp;
    } else if (value instanceof type.UUIDV1) {
        return adone.util.uuid.v1();
    } else if (value instanceof type.UUIDV4) {
        return adone.util.uuid.v4();
    } else if (value instanceof type.NOW) {
        return now(dialect);
    } else if (_.isPlainObject(value) || _.isArray(value)) {
        return _.clone(value);
    }
    return value;

};

/**
 * Determine if the default value provided exists and can be described
 * in a db schema using the DEFAULT directive.
 *
 * @param  {*} value Any default value.
 * @return {boolean} yes / no.
 * @private
 */
export const defaultValueSchemable = (value) => {
    if (is.undefined(value)) {
        return false;
    }

    const { type } = orm;

    // TODO this will be schemable when all supported db
    // have been normalized for this case
    if (value instanceof type.NOW) {
        return false;
    }

    if (value instanceof type.UUIDV1 || value instanceof type.UUIDV4) {
        return false;
    }

    if (_.isFunction(value)) {
        return false;
    }

    return true;
};

export const removeNullValuesFromHash = (hash, omitNull, options) => {
    let result = hash;

    options = options || {};
    options.allowNull = options.allowNull || [];

    if (omitNull) {
        const _hash = {};

        _.forIn(hash, (val, key) => {
            if (options.allowNull.indexOf(key) > -1 || key.match(/Id$/) || !is.nil(val)) {
                _hash[key] = val;
            }
        });

        result = _hash;
    }

    return result;
};

export const stack = () => {
    const orig = Error.prepareStackTrace;
    Error.prepareStackTrace = (_, stack) => stack;
    const err = new Error();
    Error.captureStackTrace(err, stack);
    const errStack = err.stack;
    Error.prepareStackTrace = orig;
    return errStack;
};

export const sliceArgs = (args, begin) => {
    begin = begin || 0;
    const tmp = new Array(args.length - begin);
    for (let i = begin; i < args.length; ++i) {
        tmp[i - begin] = args[i];
    }
    return tmp;
};

// Note: Use the `quoteIdentifier()` and `escape()` methods on the
// `QueryInterface` instead for more portable code.

export const TICK_CHAR = "`";

export const addTicks = (s, tickChar) => {
    tickChar = tickChar || TICK_CHAR;
    return tickChar + removeTicks(s, tickChar) + tickChar;
};

export const removeTicks = (s, tickChar) => {
    tickChar = tickChar || TICK_CHAR;
    return s.replace(new RegExp(tickChar, "g"), "");
};

/**
 * Receives a tree-like object and returns a plain object which depth is 1.
 *
 * - Input:
 *
 *  {
 *    name: 'John',
 *    address: {
 *      street: 'Fake St. 123',
 *      coordinates: {
 *        longitude: 55.6779627,
 *        latitude: 12.5964313
 *      }
 *    }
 *  }
 *
 * - Output:
 *
 *  {
 *    name: 'John',
 *    address.street: 'Fake St. 123',
 *    address.coordinates.latitude: 55.6779627,
 *    address.coordinates.longitude: 12.5964313
 *  }
 *
 * @param value, an Object
 * @return Object, an flattened object
 * @private
 */
export const flattenObjectDeep = (value) => {
    if (!_.isPlainObject(value)) {
        return value;
    }
    const flattenedObj = {};

    const flattenObject = (obj, subPath) => {
        Object.keys(obj).forEach((key) => {
            const pathToProperty = subPath ? `${subPath}.${key}` : `${key}`;
            if (typeof obj[key] === "object") {
                flattenObject(obj[key], flattenedObj, pathToProperty);
            } else {
                flattenedObj[pathToProperty] = _.get(obj, key);
            }
        });
        return flattenedObj;
    };

    return flattenObject(value, undefined);
};

/**
 * Utility functions for representing SQL functions, and columns that should be escaped.
 * Please do not use these functions directly, use Sequelize.fn and Sequelize.col instead.
 * @private
 */
export class SequelizeMethod {}

export class Fn extends SequelizeMethod {
    constructor(fn, args) {
        super();
        this.fn = fn;
        this.args = args;
    }

    clone() {
        return new Fn(this.fn, this.args);
    }
}
export const fn = (fn, ...args) => new Fn(fn, args);

export class Col extends SequelizeMethod {
    constructor(col) {
        super();
        if (arguments.length > 1) {
            col = this.sliceArgs(arguments);
        }
        this.col = col;
    }
}
export const col = (col) => new Col(col);

export class Cast extends SequelizeMethod {
    constructor(val, type, json) {
        super();
        this.val = val;
        this.type = (type || "").trim();
        this.json = json || false;
    }
}
export const cast = (val, type) => new Cast(val, type);

export class Literal extends SequelizeMethod {
    constructor(val) {
        super();
        this.val = val;
    }
}
export const literal = (val) => new Literal(val);

export class Json extends SequelizeMethod {
    constructor(conditionsOrPath, value) {
        super();
        if (_.isObject(conditionsOrPath)) {
            this.conditions = conditionsOrPath;
        } else {
            this.path = conditionsOrPath;
            if (value) {
                this.value = value;
            }
        }
    }
}
export const json = (conditionsOrPath, value) => new Json(conditionsOrPath, value);

export class Where extends SequelizeMethod {
    constructor(attribute, comparator, logic) {
        super();
        if (is.undefined(logic)) {
            logic = comparator;
            comparator = "=";
        }

        this.attribute = attribute;
        this.comparator = comparator;
        this.logic = logic;
    }
}
export const where = (attr, comparator, logic) => new Where(attr, comparator, logic);

export const mapIsolationLevelStringToTedious = (isolationLevel, tedious) => {
    if (!tedious) {
        throw new Error("An instance of tedious lib should be passed to this function");
    }
    const tediousIsolationLevel = tedious.ISOLATION_LEVEL;
    switch (isolationLevel) {
        case "READ_UNCOMMITTED":
            return tediousIsolationLevel.READ_UNCOMMITTED;
        case "READ_COMMITTED":
            return tediousIsolationLevel.READ_COMMITTED;
        case "REPEATABLE_READ":
            return tediousIsolationLevel.REPEATABLE_READ;
        case "SERIALIZABLE":
            return tediousIsolationLevel.SERIALIZABLE;
        case "SNAPSHOT":
            return tediousIsolationLevel.SNAPSHOT;
    }
};

//Collection of helper methods to make it easier to work with symbol operators

/**
 * getOperators
 * @param  {Object} obj
 * @return {Array<Symbol>} All operators properties of obj
 * @private
 */
export const getOperators = (obj) => _.intersection(Object.getOwnPropertySymbols(obj || {}), operatorsArray);

/**
 * getComplexKeys
 * @param  {Object} obj
 * @return {Array<String|Symbol>} All keys including operators
 * @private
 */
export const getComplexKeys = (obj) => getOperators(obj).concat(_.keys(obj));

/**
 * getComplexSize
 * @param  {Object|Array} obj
 * @return {Integer}      Length of object properties including operators if obj is array returns its length
 * @private
 */
export const getComplexSize = (obj) => is.array(obj) ? obj.length : getComplexKeys(obj).length;

/**
 * Returns true if a where clause is empty, even with Symbols
 *
 * @param  {Object} obj
 * @return {Boolean}
 * @private
 */
export const isWhereEmpty = (obj) => _.isEmpty(obj) && getOperators(obj).length === 0;

export const and = (...args) => ({ [operator.and]: args });

export const or = (...args) => ({ [operator.or]: args });

export const checkNamingCollision = (association) => {
    if (association.source.rawAttributes.hasOwnProperty(association.as)) {
        throw new Error(`Naming collision between attribute '${association.as}' and association '${association.as}' on model ${association.source.name}. To remedy this, change either foreignKey or as in your association definition`);
    }
};

export const addForeignKeyConstraints = (newAttribute, source, target, options, key) => {
    // FK constraints are opt-in: users must either set `foreignKeyConstraints`
    // on the association, or request an `onDelete` or `onUpdate` behaviour

    if (options.foreignKeyConstraint || options.onDelete || options.onUpdate) {

    // Find primary keys: composite keys not supported with this approach
        const primaryKeys = _.chain(source.rawAttributes).keys()
            .filter((key) => source.rawAttributes[key].primaryKey)
            .map((key) => source.rawAttributes[key].field || key).value();

        if (primaryKeys.length === 1) {
            if (source._schema) {
                newAttribute.references = {
                    model: source.sequelize.getQueryInterface().QueryGenerator.addSchema({
                        tableName: source.tableName,
                        _schema: source._schema,
                        _schemaDelimiter: source._schemaDelimiter
                    })
                };
            } else {
                newAttribute.references = { model: source.tableName };
            }

            newAttribute.references.key = key || primaryKeys[0];
            newAttribute.onDelete = options.onDelete;
            newAttribute.onUpdate = options.onUpdate;
        }
    }
};

/**
 * Mixin (inject) association methods to model prototype
 *
 * @private
 * @param {Object} Association instance
 * @param {Object} Model prototype
 * @param {Array} Method names to inject
 * @param {Object} Mapping between model and association method names
 */
export const mixinMethods = (association, obj, methods, aliases) => {
    aliases = aliases || {};

    for (const method of methods) {
        // don't override custom methods
        if (!obj[association.accessors[method]]) {
            const realMethod = aliases[method] || method;

            obj[association.accessors[method]] = function () {
                const instance = this;
                const args = [instance].concat(Array.from(arguments));

                return association[realMethod].apply(association, args);
            };
        }
    }
};

/**
 * Returns ENUM name by joining table and column name
 *
 * @param {String} tableName
 * @param {String} columnName
 * @return {String}
 * @private
 */
export const generateEnumName = (tableName, columnName) => {
    return `enum_${tableName}_${columnName}`;
};

/**
 * Returns an new Object which keys are camelized
 * @param {Object} obj
 * @return {String}
 * @private
 */
export const camelizeObjectKeys = (obj) => {
    const newObj = {};
    Object.keys(obj).forEach((key) => {
        newObj[camelize(key)] = obj[key];
    });
    return newObj;
};

/**
 * Assigns own and inherited enumerable string and symbol keyed properties of source
 * objects to the destination object.
 *
 * https://lodash.com/docs/4.17.4#defaults
 *
 * **Note:** This method mutates `object`.
 *
 * @param {Object} object The destination object.
 * @param {...Object} [sources] The source objects.
 * @returns {Object} Returns `object`.
 * @private
 */
export const defaults = function (object) {
    object = Object(object);

    const sources = _.tail(arguments);

    sources.forEach((source) => {
        if (source) {
            source = Object(source);

            getComplexKeys(source).forEach((key) => {
                const value = object[key];
                if (
                    is.undefined(value) || (
                        _.eq(value, Object.prototype[key]) &&
              !Object.prototype.hasOwnProperty.call(object, key)
                    )
                ) {
                    object[key] = source[key];
                }
            });
        }
    });

    return object;
};
