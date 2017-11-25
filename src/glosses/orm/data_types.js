const {
    is,
    vendor: { lodash: _ },
    sprintf,
    util,
    orm
} = adone;

const {
    x,
    util: {
        Validator: {
            validator
        }
    }
} = orm;

const warnings = {};

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
            adone.warn(`${text}, '\n>> Check:', ${link}`);
        }
    }
}

ABSTRACT.prototype.dialectTypes = "";

class STRING extends ABSTRACT {
    constructor(length, binary) {
        super();

        const options = is.object(length) ? length : { length, binary };

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
            throw new x.ValidationError(sprintf("%j is not a valid string", value));
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
        const options = is.object(length) ? length : { length };
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
            throw new x.ValidationError(sprintf("%j is not a valid string", value));
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
        if (!validator.isFloat(String(value))) {
            throw new x.ValidationError(sprintf(`%j is not a valid ${_.toLower(this.key)}`, value));
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
        const options = is.object(length) ? length : { length };
        super(options);
    }

    validate(value) {
        if (!validator.isInt(String(value))) {
            throw new x.ValidationError(sprintf(`%j is not a valid ${_.toLower(this.key)}`, value));
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
        const options = is.object(length) ? length : { length, decimals };
        super(options);
    }

    validate(value) {
        if (!validator.isFloat(String(value))) {
            throw new x.ValidationError(sprintf("%j is not a valid float", value));
        }

        return true;
    }
}
FLOAT.prototype.key = FLOAT.key = "FLOAT";

class REAL extends NUMBER {
    constructor(length, decimals) {
        const options = is.object(length) ? length : { length, decimals };
        super(options);
    }
}
REAL.prototype.key = REAL.key = "REAL";

class DOUBLE extends NUMBER {
    constructor(length, decimals) {
        const options = is.object(length) ? length : { length, decimals };
        super(options);
    }
}
DOUBLE.prototype.key = DOUBLE.key = "DOUBLE PRECISION";

class DECIMAL extends NUMBER {
    constructor(precision, scale) {
        const options = is.object(precision) ? precision : { precision, scale };
        super(options);
    }

    toSql() {
        if (this._precision || this._scale) {
            return `DECIMAL(${[this._precision, this._scale].filter(_.identity).join(",")})`;
        }

        return "DECIMAL";
    }

    validate(value) {
        if (!validator.isDecimal(String(value))) {
            throw new x.ValidationError(sprintf("%j is not a valid decimal", value));
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
        if (!validator.isBoolean(String(value))) {
            throw new x.ValidationError(sprintf("%j is not a valid boolean", value));
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
        const options = is.object(length) ? length : { length };
        this.options = options;
        this._length = options.length || "";
    }

    toSql() {
        return "DATETIME";
    }

    validate(value) {
        if (!validator.isDate(String(value))) {
            throw new x.ValidationError(sprintf("%j is not a valid date", value));
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
            throw new x.ValidationError(sprintf("%j is not a valid hstore", value));
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
        const options = is.object(length) ? length : { length };
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
            throw new x.ValidationError(sprintf("%j is not a valid blob", value));
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
            throw new x.ValidationError(sprintf("%j is not a valid range", value));
        }

        if (value.length !== 2) {
            throw new x.ValidationError("A range must be an array with two elements");
        }

        return true;
    }
}
RANGE.prototype.key = RANGE.key = "RANGE";

class UUID extends ABSTRACT {
    validate(value, options) {
        if (!_.isString(value) || !validator.isUUID(value) && (!options || !options.acceptStrings)) {
            throw new x.ValidationError(sprintf("%j is not a valid uuid", value));
        }

        return true;
    }
}
UUID.prototype.key = UUID.key = "UUID";

class UUIDV1 extends ABSTRACT {
    validate(value, options) {
        if (!_.isString(value) || !validator.isUUID(value) && (!options || !options.acceptStrings)) {
            throw new x.ValidationError(sprintf("%j is not a valid uuid", value));
        }

        return true;
    }
}
UUIDV1.prototype.key = UUIDV1.key = "UUIDV1";

class UUIDV4 extends ABSTRACT {
    validate(value, options) {
        if (!_.isString(value) || !validator.isUUID(value, 4) && (!options || !options.acceptStrings)) {
            throw new x.ValidationError(sprintf("%j is not a valid uuidv4", value));
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
    constructor(...args) {
        super();
        let options;
        if (args.length === 1) {
            if (is.array(args[0])) {
                // ENUM([thing, another thing, etc])
                options = { values: args[0] };
            } else if (is.object(args[0])) {
                // ENUM({ custom options })
                options = args[0];
            } else {
                // ENUM(just one thing)
                options = { values: args };
            }
        } else {
            // ENUM(thing, another thing, ...etc)
            options = { values: args };
        }
        this.values = options.values;
        this.options = options;
    }

    validate(value) {
        if (!_.includes(this.values, value)) {
            throw new x.ValidationError(sprintf("%j is not a valid choice in %j", value, this.values));
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
            throw new x.ValidationError(sprintf("%j is not a valid array", value));
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
        return `GeomFromText(${options.escape(util.terraformer.WKT.convert(value))})`;
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
        return `GeomFromText(${options.escape(util.terraformer.WKT.convert(value))})`;
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
                    if (is.object(dataType[helper])) {
                        return dataType;
                    }
                    return new dataType[helper](); // ??
                }
            });
        }
    }
}

const DataTypes = {
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

export default DataTypes;
