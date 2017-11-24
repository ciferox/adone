const { is, vendor: { lodash: _ } } = adone;
const util = require("util");
const WKT = adone.util.terraformer.WKT;
const sequelizeErrors = require("./errors");
const warnings = {};
const Validator = require("./utils/validator_extras").validator;
const Utils = require("./utils");

class ABSTRACT {
    toString(options) {
        return this.toSql(options);
    }

    toSql() {
        return this.key;
    }

    stringify(value, options) {
        if (this._stringify) {
            return this._stringify(value, options);
        }
        return value;
    }

    static warn(link, text) {
        if (!warnings[text]) {
            warnings[text] = true;
            Utils.warn(`${text}, '\n>> Check:', ${link}`);
        }
    }
}

ABSTRACT.prototype.dialectTypes = "";

class STRING extends ABSTRACT {
    constructor(length, binary) {
        super();

        const options = typeof length === "object" && length || { length, binary };

        this.options = options;
        this._binary = options.binary;
        this._length = options.length || 255;
    }

    toSql() {
        return `VARCHAR(${this._length})${this._binary ? " BINARY" : ""}`;
    }

    validate(value) {
        if (Object.prototype.toString.call(value) !== "[object String]") {
            if (this.options.binary && is.buffer(value) || _.isNumber(value)) {
                return true;
            }
            throw new sequelizeErrors.ValidationError(util.format("%j is not a valid string", value));
        }

        return true;
    }

    get BINARY() {
        this._binary = true;
        this.options.binary = true;
        return this;
    }
}

STRING.prototype.key = STRING.key = "STRING";

class CHAR extends STRING {
    toSql() {
        return `CHAR(${this._length})${this._binary ? " BINARY" : ""}`;
    }
}
CHAR.prototype.key = CHAR.key = "CHAR";

class TEXT extends ABSTRACT {
    constructor(length) {
        super();
        const options = typeof length === "object" && length || { length };
        if (!(this instanceof TEXT)) {
            return new TEXT(options);
        }
        this.options = options;
        this._length = options.length || "";
    }

    toSql() {
        switch (this._length.toLowerCase()) {
            case "tiny":
                return "TINYTEXT";
            case "medium":
                return "MEDIUMTEXT";
            case "long":
                return "LONGTEXT";
            default:
                return this.key;
        }
    }

    validate(value) {
        if (!_.isString(value)) {
            throw new sequelizeErrors.ValidationError(util.format("%j is not a valid string", value));
        }

        return true;
    }
}
TEXT.prototype.key = TEXT.key = "TEXT";

class NUMBER extends ABSTRACT {
    constructor(options) {
        super();
        this.options = options;
        this._length = options.length;
        this._zerofill = options.zerofill;
        this._decimals = options.decimals;
        this._precision = options.precision;
        this._scale = options.scale;
        this._unsigned = options.unsigned;
    }

    toSql() {
        let result = this.key;
        if (this._length) {
            result += `(${this._length}`;
            if (is.number(this._decimals)) {
                result += `,${this._decimals}`;
            }
            result += ")";
        }
        if (this._unsigned) {
            result += " UNSIGNED";
        }
        if (this._zerofill) {
            result += " ZEROFILL";
        }
        return result;
    }

    validate(value) {
        if (!Validator.isFloat(String(value))) {
            throw new sequelizeErrors.ValidationError(util.format(`%j is not a valid ${_.toLower(this.key)}`, value));
        }

        return true;
    }

    get UNSIGNED() {
        this._unsigned = true;
        this.options.unsigned = true;
        return this;
    }

    get ZEROFILL() {
        this._zerofill = true;
        this.options.zerofill = true;
        return this;
    }
}
NUMBER.prototype.key = NUMBER.key = "NUMBER";

class INTEGER extends NUMBER {
    constructor(length) {
        const options = typeof length === "object" && length || { length };
        super(options);
    }

    validate(value) {
        if (!Validator.isInt(String(value))) {
            throw new sequelizeErrors.ValidationError(util.format(`%j is not a valid ${_.toLower(this.key)}`, value));
        }

        return true;
    }
}
INTEGER.prototype.key = INTEGER.key = "INTEGER";

class TINYINT extends INTEGER { }
TINYINT.prototype.key = TINYINT.key = "TINYINT";

class SMALLINT extends INTEGER { }
SMALLINT.prototype.key = SMALLINT.key = "SMALLINT";


class MEDIUMINT extends INTEGER { }
MEDIUMINT.prototype.key = MEDIUMINT.key = "MEDIUMINT";

class BIGINT extends INTEGER { }
BIGINT.prototype.key = BIGINT.key = "BIGINT";

class FLOAT extends NUMBER {
    constructor(length, decimals) {
        const options = typeof length === "object" && length || { length, decimals };
        super(options);
    }

    validate(value) {
        if (!Validator.isFloat(String(value))) {
            throw new sequelizeErrors.ValidationError(util.format("%j is not a valid float", value));
        }

        return true;
    }
}
FLOAT.prototype.key = FLOAT.key = "FLOAT";

class REAL extends NUMBER {
    constructor(length, decimals) {
        const options = typeof length === "object" && length || { length, decimals };
        super(options);
    }
}
REAL.prototype.key = REAL.key = "REAL";

class DOUBLE extends NUMBER {
    constructor(length, decimals) {
        const options = typeof length === "object" && length || { length, decimals };
        super(options);
    }
}
DOUBLE.prototype.key = DOUBLE.key = "DOUBLE PRECISION";

class DECIMAL extends NUMBER {
    constructor(precision, scale) {
        const options = typeof precision === "object" && precision || { precision, scale };
        super(options);
    }

    toSql() {
        if (this._precision || this._scale) {
            return `DECIMAL(${[this._precision, this._scale].filter(_.identity).join(",")})`;
        }

        return "DECIMAL";
    }

    validate(value) {
        if (!Validator.isDecimal(String(value))) {
            throw new sequelizeErrors.ValidationError(util.format("%j is not a valid decimal", value));
        }

        return true;
    }
}
DECIMAL.prototype.key = DECIMAL.key = "DECIMAL";

for (const floating of [FLOAT, DOUBLE, REAL]) {
    floating.prototype.escape = false;
    floating.prototype._stringify = function _stringify(value) {
        if (isNaN(value)) {
            return "'NaN'";
        } else if (!isFinite(value)) {
            const sign = value < 0 ? "-" : "";
            return `'${sign}Infinity'`;
        }

        return value;
    };
}

class BOOLEAN extends ABSTRACT {
    toSql() {
        return "TINYINT(1)";
    }

    validate(value) {
        if (!Validator.isBoolean(String(value))) {
            throw new sequelizeErrors.ValidationError(util.format("%j is not a valid boolean", value));
        }

        return true;
    }

    _sanitize(value) {
        if (!is.nil(value)) {
            if (is.buffer(value) && value.length === 1) {
                // Bit fields are returned as buffers
                value = value[0];
            }

            if (_.isString(value)) {
                // Only take action on valid boolean strings.
                value = value === "true" ? true : value === "false" ? false : value;

            } else if (_.isNumber(value)) {
                // Only take action on valid boolean integers.
                value = value === 1 ? true : value === 0 ? false : value;
            }
        }

        return value;
    }
}
BOOLEAN.prototype.key = BOOLEAN.key = "BOOLEAN";
BOOLEAN.parse = BOOLEAN.prototype._sanitize;

class TIME extends ABSTRACT {
    toSql() {
        return "TIME";
    }
}
TIME.prototype.key = TIME.key = "TIME";

class DATE extends ABSTRACT {
    constructor(length) {
        super();
        const options = typeof length === "object" && length || { length };
        this.options = options;
        this._length = options.length || "";
    }

    toSql() {
        return "DATETIME";
    }

    validate(value) {
        if (!Validator.isDate(String(value))) {
            throw new sequelizeErrors.ValidationError(util.format("%j is not a valid date", value));
        }

        return true;
    }

    _sanitize(value, options) {
        if ((!options || options && !options.raw) && !(value instanceof Date) && Boolean(value)) {
            return new Date(value);
        }

        return value;
    }

    _isChanged(value, originalValue) {
        if (
            originalValue && Boolean(value) &&
            (
                value === originalValue ||
                value instanceof Date && originalValue instanceof Date && value.getTime() === originalValue.getTime()
            )
        ) {
            return false;
        }

        // not changed when set to same empty value
        if (!originalValue && !value && originalValue === value) {
            return false;
        }

        return true;
    }

    _applyTimezone(date, options) {
        if (options.timezone) {
            if (adone.datetime.tz.zone(options.timezone)) {
                date = adone.datetime(date).tz(options.timezone);
            } else {
                date = adone.datetime(date).utcOffset(options.timezone);
            }
        } else {
            date = adone.datetime(date);
        }

        return date;
    }

    _stringify(date, options) {
        date = this._applyTimezone(date, options);

        // Z here means current timezone, _not_ UTC
        return date.format("YYYY-MM-DD HH:mm:ss.SSS Z");
    }
}
DATE.prototype.key = DATE.key = "DATE";

class DATEONLY extends ABSTRACT {
    toSql() {
        return "DATE";
    }

    _stringify(date) {
        return adone.datetime(date).format("YYYY-MM-DD");
    }

    _sanitize(value, options) {
        if ((!options || options && !options.raw) && Boolean(value)) {
            return adone.datetime(value).format("YYYY-MM-DD");
        }

        return value;
    }

    _isChanged(value, originalValue) {
        if (originalValue && Boolean(value) && originalValue === value) {
            return false;
        }

        // not changed when set to same empty value
        if (!originalValue && !value && originalValue === value) {
            return false;
        }

        return true;
    }
}
DATEONLY.prototype.key = DATEONLY.key = "DATEONLY";

class HSTORE extends ABSTRACT {
    validate(value) {
        if (!_.isPlainObject(value)) {
            throw new sequelizeErrors.ValidationError(util.format("%j is not a valid hstore", value));
        }

        return true;
    }
}
HSTORE.prototype.key = HSTORE.key = "HSTORE";

class JSONTYPE extends ABSTRACT {
    validate() {
        return true;
    }

    _stringify(value) {
        return JSON.stringify(value);
    }
}
JSONTYPE.prototype.key = JSONTYPE.key = "JSON";

class JSONB extends JSONTYPE { }
JSONB.prototype.key = JSONB.key = "JSONB";

class NOW extends ABSTRACT { }
NOW.prototype.key = NOW.key = "NOW";

class BLOB extends ABSTRACT {
    constructor(length) {
        super();
        const options = typeof length === "object" && length || { length };
        this.options = options;
        this._length = options.length || "";
    }

    toSql() {
        switch (this._length.toLowerCase()) {
            case "tiny":
                return "TINYBLOB";
            case "medium":
                return "MEDIUMBLOB";
            case "long":
                return "LONGBLOB";
            default:
                return this.key;
        }
    }

    validate(value) {
        if (!_.isString(value) && !is.buffer(value)) {
            throw new sequelizeErrors.ValidationError(util.format("%j is not a valid blob", value));
        }

        return true;
    }

    _stringify(value) {
        if (!is.buffer(value)) {
            if (is.array(value)) {
                value = Buffer.from(value);
            } else {
                value = Buffer.from(value.toString());
            }
        }
        const hex = value.toString("hex");

        return this._hexify(hex);
    }

    _hexify(hex) {
        return `X'${hex}'`;
    }
}

BLOB.prototype.key = BLOB.key = "BLOB";
BLOB.prototype.escape = false;

const pgRangeSubtypes = {
    integer: "int4range",
    bigint: "int8range",
    decimal: "numrange",
    dateonly: "daterange",
    date: "tstzrange",
    datenotz: "tsrange"
};

const pgRangeCastTypes = {
    integer: "integer",
    bigint: "bigint",
    decimal: "numeric",
    dateonly: "date",
    date: "timestamptz",
    datenotz: "timestamp"
};

class RANGE extends ABSTRACT {
    constructor(subtype) {
        super();
        const options = _.isPlainObject(subtype) ? subtype : { subtype };

        if (!options.subtype) {
            options.subtype = new INTEGER();
        }

        if (_.isFunction(options.subtype)) {
            options.subtype = new options.subtype();
        }

        this._subtype = options.subtype.key;
        this.options = options;
    }

    toSql() {
        return pgRangeSubtypes[this._subtype.toLowerCase()];
    }

    toCastType() {
        return pgRangeCastTypes[this._subtype.toLowerCase()];
    }

    validate(value) {
        if (_.isPlainObject(value) && value.inclusive) {
            value = value.inclusive;
        }

        if (!_.isArray(value)) {
            throw new sequelizeErrors.ValidationError(util.format("%j is not a valid range", value));
        }

        if (value.length !== 2) {
            throw new sequelizeErrors.ValidationError("A range must be an array with two elements");
        }

        return true;
    }
}
RANGE.prototype.key = RANGE.key = "RANGE";

class UUID extends ABSTRACT {
    validate(value, options) {
        if (!_.isString(value) || !Validator.isUUID(value) && (!options || !options.acceptStrings)) {
            throw new sequelizeErrors.ValidationError(util.format("%j is not a valid uuid", value));
        }

        return true;
    }
}
UUID.prototype.key = UUID.key = "UUID";

class UUIDV1 extends ABSTRACT {
    validate(value, options) {
        if (!_.isString(value) || !Validator.isUUID(value) && (!options || !options.acceptStrings)) {
            throw new sequelizeErrors.ValidationError(util.format("%j is not a valid uuid", value));
        }

        return true;
    }
}
UUIDV1.prototype.key = UUIDV1.key = "UUIDV1";

class UUIDV4 extends ABSTRACT {
    validate(value, options) {
        if (!_.isString(value) || !Validator.isUUID(value, 4) && (!options || !options.acceptStrings)) {
            throw new sequelizeErrors.ValidationError(util.format("%j is not a valid uuidv4", value));
        }

        return true;
    }
}
UUIDV4.prototype.key = UUIDV4.key = "UUIDV4";

class VIRTUAL extends ABSTRACT {
    constructor(ReturnType, fields) {
        super();
        if (is.function(ReturnType)) {
            ReturnType = new ReturnType();
        }

        this.returnType = ReturnType;
        this.fields = fields;
    }
}
VIRTUAL.prototype.key = VIRTUAL.key = "VIRTUAL";

class ENUM extends ABSTRACT {
    constructor(value) {
        super();
        const options = typeof value === "object" && !is.array(value) && value || {
            values: Array.prototype.slice.call(arguments).reduce((result, element) => {
                return result.concat(is.array(element) ? element : [element]);
            }, [])
        };
        this.values = options.values;
        this.options = options;
    }

    validate(value) {
        if (!_.includes(this.values, value)) {
            throw new sequelizeErrors.ValidationError(util.format("%j is not a valid choice in %j", value, this.values));
        }

        return true;
    }
}
ENUM.prototype.key = ENUM.key = "ENUM";

class ARRAY extends ABSTRACT {
    constructor(type) {
        super();
        const options = _.isPlainObject(type) ? type : { type };
        this.type = is.function(options.type) ? new options.type() : options.type;
    }

    toSql() {
        return `${this.type.toSql()}[]`;
    }

    validate(value) {
        if (!_.isArray(value)) {
            throw new sequelizeErrors.ValidationError(util.format("%j is not a valid array", value));
        }

        return true;
    }

    static is(obj, type) {
        return obj instanceof ARRAY && obj.type instanceof type;
    }
}

class GEOMETRY extends ABSTRACT {
    constructor(type, srid) {
        super();
        const options = _.isPlainObject(type) ? type : { type, srid };

        this.options = options;
        this.type = options.type;
        this.srid = options.srid;
    }

    _stringify(value, options) {
        return `GeomFromText(${options.escape(WKT.convert(value))})`;
    }
}
GEOMETRY.prototype.key = GEOMETRY.key = "GEOMETRY";
GEOMETRY.prototype.escape = false;

class GEOGRAPHY extends ABSTRACT {
    constructor(type, srid) {
        super();
        const options = _.isPlainObject(type) ? type : { type, srid };

        this.options = options;
        this.type = options.type;
        this.srid = options.srid;
    }

    _stringify(value, options) {
        return `GeomFromText(${options.escape(WKT.convert(value))})`;
    }
}
GEOGRAPHY.prototype.key = GEOGRAPHY.key = "GEOGRAPHY";
GEOGRAPHY.prototype.escape = false;

const helpers = {
    BINARY: [STRING, CHAR],
    UNSIGNED: [NUMBER, TINYINT, SMALLINT, MEDIUMINT, INTEGER, BIGINT, FLOAT, DOUBLE, REAL, DECIMAL],
    ZEROFILL: [NUMBER, TINYINT, SMALLINT, MEDIUMINT, INTEGER, BIGINT, FLOAT, DOUBLE, REAL, DECIMAL],
    PRECISION: [DECIMAL],
    SCALE: [DECIMAL]
};

for (const helper of Object.keys(helpers)) {
    for (const DataType of helpers[helper]) {
        if (!is.propertyOwned(DataType, helper)) {
            Object.defineProperty(DataType, helper, {
                get() {
                    const dataType = new DataType();
                    if (typeof dataType[helper] === "object") {
                        return dataType;
                    }
                    return new dataType[helper](); // ??
                }
            });
        }
    }
}

/**
 * A convenience class holding commonly used data types. The datatypes are used when defining a new model using `Sequelize.define`, like this:
 * ```js
 * sequelize.define('model', {
 *   column: DataTypes.INTEGER
 * })
 * ```
 * When defining a model you can just as easily pass a string as type, but often using the types defined here is beneficial. For example, using `DataTypes.BLOB`, mean
 * that that column will be returned as an instance of `Buffer` when being fetched by sequelize.
 *
 * To provide a length for the data type, you can invoke it like a function: `INTEGER(2)`
 *
 * Some data types have special properties that can be accessed in order to change the data type.
 * For example, to get an unsigned integer with zerofill you can do `DataTypes.INTEGER.UNSIGNED.ZEROFILL`.
 * The order you access the properties in do not matter, so `DataTypes.INTEGER.ZEROFILL.UNSIGNED` is fine as well.
 *
 * * All number types (`INTEGER`, `BIGINT`, `FLOAT`, `DOUBLE`, `REAL`, `DECIMAL`) expose the properties `UNSIGNED` and `ZEROFILL`
 * * The `CHAR` and `STRING` types expose the `BINARY` property
 *
 *
 * Three of the values provided here (`NOW`, `UUIDV1` and `UUIDV4`) are special default values, that should not be used to define types. Instead they are used as shorthands for
 * defining default values. For example, to get a uuid field with a default value generated following v1 of the UUID standard:
 * ```js`
 * sequelize.define('model',` {
 *   uuid: {
 *     type: DataTypes.UUID,
 *     defaultValue: DataTypes.UUIDV1,
 *     primaryKey: true
 *   }
 * })
 * ```
 * There may be times when you want to generate your own UUID conforming to some other algorithm. This is accomplished
 * using the defaultValue property as well, but instead of specifying one of the supplied UUID types, you return a value
 * from a function.
 * ```js
 * sequelize.define('model', {
 *   uuid: {
 *     type: DataTypes.UUID,
 *     defaultValue: function() {
 *       return generateMyId()
 *     },
 *     primaryKey: true
 *   }
 * })
 * ```
 *
 * @property {function(length=255: integer)} STRING A variable length string
 * @property {function(length=255: integer)} CHAR A fixed length string.
 * @property {function([length]: string)} TEXT An unlimited length text column. Available lengths: `tiny`, `medium`, `long`
 * @property {function(length: integer)} TINYINT A 8 bit integer.
 * @property {function(length: integer)} SMALLINT A 16 bit integer.
 * @property {function(length: integer)} MEDIUMINT A 24 bit integer.
 * @property {function(length=255: integer)} INTEGER A 32 bit integer.
 * @property {function(length: integer)} BIGINT A 64 bit integer. Note: an attribute defined as `BIGINT` will be treated like a `string` due this [feature from node-postgres](https://github.com/brianc/node-postgres/pull/353) to prevent precision loss. To have this attribute as a `number`, this is a possible [workaround](https://github.com/sequelize/sequelize/issues/2383#issuecomment-58006083).
 * @property {function(length: integer, decimals: integer)} FLOAT Floating point number (4-byte precision).
 * @property {function(length: integer, decimals: integer)} DOUBLE Floating point number (8-byte precision).
 * @property {function(precision: integer, scale: integer)} DECIMAL Decimal number.
 * @property {function(length: integer, decimals: integer)} REAL Floating point number (4-byte precision).
 * @property {function} BOOLEAN A boolean / tinyint column, depending on dialect
 * @property {function(length: string)} BLOB Binary storage. Available lengths: `tiny`, `medium`, `long`
 * @property {function(values: string[])} ENUM An enumeration. `DataTypes.ENUM('value', 'another value')`.
 * @property {function(length: integer)} DATE A datetime column
 * @property {function} DATEONLY A date only column (no timestamp)
 * @property {function} TIME A time column
 * @property {function} NOW A default value of the current timestamp
 * @property {function} UUID A column storing a unique universal identifier. Use with `UUIDV1` or `UUIDV4` for default values.
 * @property {function} UUIDV1 A default unique universal identifier generated following the UUID v1 standard
 * @property {function} UUIDV4 A default unique universal identifier generated following the UUID v4 standard
 * @property {function} HSTORE A key / value store column. Only available in Postgres.
 * @property {function} JSON A JSON string column. Available in MySQL, Postgres and SQLite
 * @property {function} JSONB A binary storage JSON column. Only available in Postgres.
 * @property {function(type: DataTypes)} ARRAY An array of `type`, e.g. `DataTypes.ARRAY(DataTypes.DECIMAL)`. Only available in Postgres.
 * @property {function(type: DataTypes)} RANGE Range types are data types representing a range of values of some element type (called the range's subtype).
 * Only available in Postgres. See [the Postgres documentation](http://www.postgresql.org/docs/9.4/static/rangetypes.html) for more details
 * @property {function(type: string, srid: string)} GEOMETRY A column storing Geometry information. It is only available in PostgreSQL (with PostGIS) or MySQL.
 * In MySQL, allowable Geometry types are `POINT`, `LINESTRING`, `POLYGON`.
 *
 * GeoJSON is accepted as input and returned as output.
 * In PostGIS, the GeoJSON is parsed using the PostGIS function `ST_GeomFromGeoJSON`.
 * In MySQL it is parsed using the function `GeomFromText`.
 * Therefore, one can just follow the [GeoJSON spec](http://geojson.org/geojson-spec.html) for handling geometry objects.  See the following examples:
 *
 * ```js
 * // Create a new point:
 * const point = { type: 'Point', coordinates: [39.807222,-76.984722]};
 *
 * User.create({username: 'username', geometry: point });
 *
 * // Create a new linestring:
 * const line = { type: 'LineString', 'coordinates': [ [100.0, 0.0], [101.0, 1.0] ] };
 *
 * User.create({username: 'username', geometry: line });
 *
 * // Create a new polygon:
 * const polygon = { type: 'Polygon', coordinates: [
 *                 [ [100.0, 0.0], [101.0, 0.0], [101.0, 1.0],
 *                   [100.0, 1.0], [100.0, 0.0] ]
 *                 ]};
 *
 * User.create({username: 'username', geometry: polygon });

 * // Create a new point with a custom SRID:
 * const point = {
 *   type: 'Point',
 *   coordinates: [39.807222,-76.984722],
 *   crs: { type: 'name', properties: { name: 'EPSG:4326'} }
 * };
 *
 * User.create({username: 'username', geometry: point })
 * ```
 * @property {function(type: string, srid: string)} GEOGRAPHY A geography datatype represents two dimensional spacial objects in an elliptic coord system.
 * @property {function(returnType: DataTypes, fields: string[])} VIRTUAL A virtual value that is not stored in the DB. This could for example be useful if you want to provide a default value in your model that is returned to the user but not stored in the DB.
 *
 * You could also use it to validate a value before permuting and storing it. Checking password length before hashing it for example:
 * ```js
 * sequelize.define('user', {
 *   password_hash: DataTypes.STRING,
 *   password: {
 *     type: DataTypes.VIRTUAL,
 *     set: function (val) {
 *        // Remember to set the data value, otherwise it won't be validated
 *        this.setDataValue('password', val);
 *        this.setDataValue('password_hash', this.salt + val);
 *      },
 *      validate: {
 *         isLongEnough: function (val) {
 *           if (val.length < 7) {
 *             throw new Error("Please choose a longer password")
 *          }
 *       }
 *     }
 *   }
 * })
 * ```
 * In the above code the password is stored plainly in the password field so it can be validated, but is never stored in the DB.
 *
 * VIRTUAL also takes a return type and dependency fields as arguments
 * If a virtual attribute is present in `attributes` it will automatically pull in the extra fields as well.
 * Return type is mostly useful for setups that rely on types like GraphQL.
 * ```js
 * {
 *   active: {
 *     type: new DataTypes.VIRTUAL(DataTypes.BOOLEAN, ['createdAt']),
 *     get: function() {
 *       return this.get('createdAt') > Date.now() - (7 * 24 * 60 * 60 * 1000)
 *     }
 *   }
 * }
 * ```
 */
const DataTypes = module.exports = {
    ABSTRACT,
    STRING,
    CHAR,
    TEXT,
    NUMBER,
    TINYINT,
    SMALLINT,
    MEDIUMINT,
    INTEGER,
    BIGINT,
    FLOAT,
    TIME,
    DATE,
    DATEONLY,
    BOOLEAN,
    NOW,
    BLOB,
    DECIMAL,
    NUMERIC: DECIMAL,
    UUID,
    UUIDV1,
    UUIDV4,
    HSTORE,
    JSON: JSONTYPE,
    JSONB,
    VIRTUAL,
    ARRAY,
    NONE: VIRTUAL,
    ENUM,
    RANGE,
    REAL,
    DOUBLE,
    "DOUBLE PRECISION": DOUBLE,
    GEOMETRY,
    GEOGRAPHY
};

_.each(DataTypes, (dataType) => {
    dataType.types = {};
});

// TODO: lazify
DataTypes.postgres = require("./dialects/postgres/data_types")(DataTypes);
DataTypes.mysql = require("./dialects/mysql/data_types")(DataTypes);
DataTypes.sqlite = require("./dialects/sqlite/data_types")(DataTypes);
DataTypes.mssql = require("./dialects/mssql/data_types")(DataTypes);

module.exports = DataTypes;
