const {
    is,
    vendor: { lodash: _ },
    util,
    orm
} = adone;

export default function definePostgresTypes(BaseTypes) {
    const warn = BaseTypes.ABSTRACT.warn.bind(undefined, "http://www.postgresql.org/docs/9.4/static/datatype.html");

    /**
     * @see oid here https://github.com/lib/pq/blob/master/oid/types.go
     */
    BaseTypes.UUID.types.postgres = {
        oids: [2950],
        array_oids: [2951]
    };

    BaseTypes.JSON.types.postgres = {
        oids: [114],
        array_oids: [199]
    };

    BaseTypes.JSONB.types.postgres = {
        oids: [3802],
        array_oids: [3807]
    };

    BaseTypes.TIME.types.postgres = {
        oids: [1083],
        array_oids: [1183]
    };

    class DATEONLY extends BaseTypes.DATEONLY {
        static parse(value) {
            if (value === "infinity") {
                value = Infinity;
            } else if (value === "-infinity") {
                value = -Infinity;
            }

            return value;
        }

        _stringify(value, options) {
            if (value === Infinity) {
                return "Infinity";
            } else if (value === -Infinity) {
                return "-Infinity";
            }

            return super._stringify(value, options);
        }

        _sanitize(value, options) {
            if ((!options || options && !options.raw) && value !== Infinity && value !== -Infinity) {
                if (_.isString(value)) {
                    if (_.toLower(value) === "infinity") {
                        return Infinity;
                    } else if (_.toLower(value) === "-infinity") {
                        return -Infinity;
                    }
                }

                return super._sanitize(value);
            }

            return value;
        }
    }

    BaseTypes.DATEONLY.types.postgres = {
        oids: [1082],
        array_oids: [1182]
    };

    class DECIMAL extends BaseTypes.DECIMAL {
        static parse(value) {
            return value;
        }
    }

    // numeric
    BaseTypes.DECIMAL.types.postgres = {
        oids: [1700],
        array_oids: [1231]
    };

    class STRING extends BaseTypes.STRING {
        toSql() {
            if (this._binary) {
                return "BYTEA";
            }
            return super.toSql(this);
        }
    }

    BaseTypes.STRING.types.postgres = {
        oids: [1043],
        array_oids: [1015]
    };

    class TEXT extends BaseTypes.TEXT {
        toSql() {
            if (this._length) {
                warn("PostgreSQL does not support TEXT with options. Plain `TEXT` will be used instead.");
                this._length = undefined;
            }
            return "TEXT";
        }
    }

    BaseTypes.TEXT.types.postgres = {
        oids: [25],
        array_oids: [1009]
    };

    class CHAR extends BaseTypes.CHAR {
        toSql() {
            if (this._binary) {
                return "BYTEA";
            }
            return super.toSql();
        }
    }

    BaseTypes.CHAR.types.postgres = {
        oids: [18, 1042],
        array_oids: [1002, 1014]
    };

    class BOOLEAN extends BaseTypes.BOOLEAN {
        toSql() {
            return "BOOLEAN";
        }

        _sanitize(value) {
            if (!is.nil(value)) {
                if (is.buffer(value) && value.length === 1) {
                    // Bit fields are returned as buffers
                    value = value[0];
                }

                if (_.isString(value)) {
                    // Only take action on valid boolean strings.
                    value = value === "true" || value === "t" ? true : value === "false" || value === "f" ? false : value;

                } else if (_.isNumber(value)) {
                    // Only take action on valid boolean integers.
                    value = value === 1 ? true : value === 0 ? false : value;
                }
            }

            return value;
        }
    }

    BOOLEAN.parse = BOOLEAN.prototype._sanitize;

    BaseTypes.BOOLEAN.types.postgres = {
        oids: [16],
        array_oids: [1000]
    };

    class DATE extends BaseTypes.DATE {
        toSql() {
            return "TIMESTAMP WITH TIME ZONE";
        }

        validate(value) {
            if (value !== Infinity && value !== -Infinity) {
                return super.validate(value);
            }

            return true;
        }

        _stringify(value, options) {
            if (value === Infinity) {
                return "Infinity";
            } else if (value === -Infinity) {
                return "-Infinity";
            }

            return super._stringify(value, options);
        }

        _sanitize(value, options) {
            if ((!options || options && !options.raw) && !(value instanceof Date) && Boolean(value) && value !== Infinity && value !== -Infinity) {
                if (_.isString(value)) {
                    if (_.toLower(value) === "infinity") {
                        return Infinity;
                    } else if (_.toLower(value) === "-infinity") {
                        return -Infinity;
                    }
                }

                return new Date(value);
            }

            return value;
        }
    }

    BaseTypes.DATE.types.postgres = {
        oids: [1184],
        array_oids: [1185]
    };

    class SMALLINT extends BaseTypes.SMALLINT {
        constructor(length) {
            super(length);
            // POSTGRES does not support any parameters for bigint
            if (this._length || this.options.length || this._unsigned || this._zerofill) {
                warn("PostgreSQL does not support SMALLINT with options. Plain `SMALLINT` will be used instead.");
                this._length = undefined;
                this.options.length = undefined;
                this._unsigned = undefined;
                this._zerofill = undefined;
            }
        }
    }

    // int2
    BaseTypes.SMALLINT.types.postgres = {
        oids: [21],
        array_oids: [1005]
    };

    class INTEGER extends BaseTypes.INTEGER {
        constructor(length) {
            super(length);
            // POSTGRES does not support any parameters for integer
            if (this._length || this.options.length || this._unsigned || this._zerofill) {
                warn("PostgreSQL does not support INTEGER with options. Plain `INTEGER` will be used instead.");
                this._length = undefined;
                this.options.length = undefined;
                this._unsigned = undefined;
                this._zerofill = undefined;
            }
        }

        static parse(value) {
            return parseInt(value, 10);
        }
    }

    // int4
    BaseTypes.INTEGER.types.postgres = {
        oids: [23],
        array_oids: [1007]
    };

    class BIGINT extends BaseTypes.BIGINT {
        constructor(length) {
            super(length);
            // POSTGRES does not support any parameters for bigint
            if (this._length || this.options.length || this._unsigned || this._zerofill) {
                warn("PostgreSQL does not support BIGINT with options. Plain `BIGINT` will be used instead.");
                this._length = undefined;
                this.options.length = undefined;
                this._unsigned = undefined;
                this._zerofill = undefined;
            }
        }
    }

    // int8
    BaseTypes.BIGINT.types.postgres = {
        oids: [20],
        array_oids: [1016]
    };

    class REAL extends BaseTypes.REAL {
        constructor(length, decimals) {
            super(length, decimals);
            // POSTGRES does not support any parameters for real
            if (this._length || this.options.length || this._unsigned || this._zerofill) {
                warn("PostgreSQL does not support REAL with options. Plain `REAL` will be used instead.");
                this._length = undefined;
                this.options.length = undefined;
                this._unsigned = undefined;
                this._zerofill = undefined;
            }
        }
    }

    // float4
    BaseTypes.REAL.types.postgres = {
        oids: [700],
        array_oids: [1021]
    };

    class DOUBLE extends BaseTypes.DOUBLE {
        constructor(length, decimals) {
            super(length, decimals);
            // POSTGRES does not support any parameters for double
            if (this._length || this.options.length || this._unsigned || this._zerofill) {
                warn("PostgreSQL does not support DOUBLE with options. Plain `DOUBLE` will be used instead.");
                this._length = undefined;
                this.options.length = undefined;
                this._unsigned = undefined;
                this._zerofill = undefined;
            }
        }
    }

    // float8
    BaseTypes.DOUBLE.types.postgres = {
        oids: [701],
        array_oids: [1022]
    };

    class FLOAT extends BaseTypes.FLOAT {
        constructor(length, decimals) {
            super(length, decimals);
            // POSTGRES does only support lengths as parameter.
            // Values between 1-24 result in REAL
            // Values between 25-53 result in DOUBLE PRECISION
            // If decimals are provided remove these and print a warning
            if (this._decimals) {
                warn("PostgreSQL does not support FLOAT with decimals. Plain `FLOAT` will be used instead.");
                this._length = undefined;
                this.options.length = undefined;
                this._decimals = undefined;
            }
            if (this._unsigned) {
                warn("PostgreSQL does not support FLOAT unsigned. `UNSIGNED` was removed.");
                this._unsigned = undefined;
            }
            if (this._zerofill) {
                warn("PostgreSQL does not support FLOAT zerofill. `ZEROFILL` was removed.");
                this._zerofill = undefined;
            }
        }
    }

    delete FLOAT.parse; // Float has no separate type in PG

    class BLOB extends BaseTypes.BLOB {
        toSql() {
            if (this._length) {
                warn("PostgreSQL does not support BLOB (BYTEA) with options. Plain `BYTEA` will be used instead.");
                this._length = undefined;
            }
            return "BYTEA";
        }

        _hexify(hex) {
            // bytea hex format http://www.postgresql.org/docs/current/static/datatype-binary.html
            return `E'\\\\x${hex}'`;
        }
    }

    BaseTypes.BLOB.types.postgres = {
        oids: [17],
        array_oids: [1001]
    };

    class GEOMETRY extends BaseTypes.GEOMETRY {
        toSql() {
            let result = this.key;

            if (this.type) {
                result += `(${this.type}`;

                if (this.srid) {
                    result += `,${this.srid}`;
                }

                result += ")";
            }

            return result;
        }

        parse(value) {
            return this.constructor.parse(value);
        }

        static parse(value) {
            const b = Buffer.from(value, "hex");
            return util.terraformer.WKX.Geometry.parse(b).toGeoJSON();
        }

        _stringify(value, options) {
            return `ST_GeomFromGeoJSON(${options.escape(JSON.stringify(value))})`;
        }
    }

    BaseTypes.GEOMETRY.types.postgres = {
        oids: [],
        array_oids: []
    };

    class GEOGRAPHY extends BaseTypes.GEOGRAPHY {
        toSql() {
            let result = "GEOGRAPHY";

            if (this.type) {
                result += `(${this.type}`;

                if (this.srid) {
                    result += `,${this.srid}`;
                }

                result += ")";
            }

            return result;
        }

        parse(value) {
            return this.constructor.parse(value);
        }

        static parse(value) {
            const b = Buffer.from(value, "hex");
            return util.terraformer.WKX.Geometry.parse(b).toGeoJSON();
        }

        _stringify(value, options) {
            return `ST_GeomFromGeoJSON(${options.escape(JSON.stringify(value))})`;
        }
    }

    BaseTypes.GEOGRAPHY.types.postgres = {
        oids: [],
        array_oids: []
    };

    let hstore;
    class HSTORE extends BaseTypes.HSTORE {
        constructor() {
            super();
            if (!hstore) {
                // All datatype files are loaded at import - make sure we don't load the hstore parser before a hstore is instantiated
                hstore = require("./hstore");
            }
        }

        static parse(value) {
            if (!hstore) {
                // All datatype files are loaded at import - make sure we don't load the hstore parser before a hstore is instantiated
                hstore = require("./hstore");
            }
            return hstore.parse(value);
        }

        _stringify(value) {
            if (!hstore) {
                // All datatype files are loaded at import - make sure we don't load the hstore parser before a hstore is instantiated
                hstore = require("./hstore");
            }
            return `'${hstore.stringify(value)}'`;
        }
    }

    HSTORE.prototype.escape = false;

    BaseTypes.HSTORE.types.postgres = {
        oids: [],
        array_oids: []
    };

    const range = require("./range");
    class RANGE extends BaseTypes.RANGE {
        static parse(value, oid, getTypeParser) {
            const parser = getTypeParser(RANGE.oid_map[oid]);

            return range.parse(value, parser);
        }

        _stringify(values, options) {
            if (!is.array(values)) {
                return `'${this.options.subtype.stringify(values, options)}'::${
                    this.toCastType()}`;
            }
            const valuesStringified = values.map((value) => {
                if (_.includes([null, -Infinity, Infinity], value)) {
                    // Pass through "unbounded" bounds unchanged
                    return value;
                } else if (this.options.subtype.stringify) {
                    return this.options.subtype.stringify(value, options);
                }
                return options.escape(value);

            });

            // Array.map does not preserve extra array properties
            valuesStringified.inclusive = values.inclusive;

            return `'${range.stringify(valuesStringified)}'`;
        }
    }
    RANGE.prototype.escape = false;
    RANGE.oid_map = {
        3904: 23, // int4
        3905: 23,
        3906: 1700, // Numeric
        3907: 1700,
        3908: 1114, // timestamp
        3909: 1114,
        3910: 1184, // timestamptz
        3911: 1184,
        3912: 1082, // date
        3913: 1082,
        3926: 20, // int8
        3927: 20
    };

    BaseTypes.RANGE.types.postgres = {
        oids: [3904, 3906, 3908, 3910, 3912, 3926],
        array_oids: [3905, 3907, 3909, 3911, 3913, 3927]
    };

    BaseTypes.ARRAY.prototype.escape = false;
    BaseTypes.ARRAY.prototype._stringify = function _stringify(values, options) {
        let str = `ARRAY[${values.map((value) => {
            if (this.type && this.type.stringify) {
                value = this.type.stringify(value, options);

                if (this.type.escape === false) {
                    return value;
                }
            }
            return options.escape(value);
        }, this).join(",")}]`;

        if (this.type) {
            let castKey = this.toSql();

            if (this.type instanceof BaseTypes.ENUM) {
                castKey = `${orm.util.addTicks(
                    orm.util.generateEnumName(options.field.Model.getTableName(), options.field.fieldName),
                    '"'
                )}[]`;
            }

            str += `::${castKey}`;
        }

        return str;
    };

    class ENUM extends BaseTypes.ENUM {
        static parse(value) {
            return value;
        }
    }

    BaseTypes.ENUM.types.postgres = {
        oids: [],
        array_oids: []
    };

    const types = {
        DECIMAL,
        BLOB,
        STRING,
        CHAR,
        TEXT,
        SMALLINT,
        INTEGER,
        BIGINT,
        BOOLEAN,
        DATE,
        DATEONLY,
        REAL,
        "DOUBLE PRECISION": DOUBLE,
        FLOAT,
        GEOMETRY,
        GEOGRAPHY,
        HSTORE,
        RANGE,
        ENUM
    };

    _.forIn(types, (DataType, key) => {
        if (!DataType.key) {
            DataType.key = key;
        }
        if (!DataType.extend) {
            DataType.extend = (oldType) => new DataType(oldType.options);
        }
    });

    BaseTypes.postgres = types;

    return types;
}
