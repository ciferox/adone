const {
    is,
    vendor: { lodash: _ }
} = adone;

export default function defineSqliteTypes(BaseTypes) {
    const warn = BaseTypes.ABSTRACT.warn.bind(undefined, "https://www.sqlite.org/datatype3.html");

    /**
     * @see https://sqlite.org/datatype3.html
     */

    BaseTypes.DATE.types.sqlite = ["DATETIME"];
    BaseTypes.STRING.types.sqlite = ["VARCHAR", "VARCHAR BINARY"];
    BaseTypes.CHAR.types.sqlite = ["CHAR", "CHAR BINARY"];
    BaseTypes.TEXT.types.sqlite = ["TEXT"];
    BaseTypes.TINYINT.types.sqlite = ["TINYINT"];
    BaseTypes.SMALLINT.types.sqlite = ["SMALLINT"];
    BaseTypes.MEDIUMINT.types.sqlite = ["MEDIUMINT"];
    BaseTypes.INTEGER.types.sqlite = ["INTEGER"];
    BaseTypes.BIGINT.types.sqlite = ["BIGINT"];
    BaseTypes.FLOAT.types.sqlite = ["FLOAT"];
    BaseTypes.TIME.types.sqlite = ["TIME"];
    BaseTypes.DATEONLY.types.sqlite = ["DATE"];
    BaseTypes.BOOLEAN.types.sqlite = ["TINYINT"];
    BaseTypes.BLOB.types.sqlite = ["TINYBLOB", "BLOB", "LONGBLOB"];
    BaseTypes.DECIMAL.types.sqlite = ["DECIMAL"];
    BaseTypes.UUID.types.sqlite = ["UUID"];
    BaseTypes.ENUM.types.sqlite = false;
    BaseTypes.REAL.types.sqlite = ["REAL"];
    BaseTypes.DOUBLE.types.sqlite = ["DOUBLE PRECISION"];
    BaseTypes.GEOMETRY.types.sqlite = false;
    BaseTypes.JSON.types.sqlite = ["JSON", "JSONB"];

    class JSONTYPE extends BaseTypes.JSON {
        static parse(data) {
            return JSON.parse(data);
        }
    }

    class DATE extends BaseTypes.DATE {
        static parse(date, options) {
            if (date.indexOf("+") === -1) {
                // For backwards compat. Dates inserted by sequelize < 2.0dev12 will not have a timestamp set
                return new Date(date + options.timezone);
            }
            return new Date(date); // We already have a timezone stored in the string

        }
    }

    class DATEONLY extends BaseTypes.DATEONLY {
        static parse(date) {
            return date;
        }
    }

    class STRING extends BaseTypes.STRING {
        toSql() {
            if (this._binary) {
                return `VARCHAR BINARY(${this._length})`;
            }
            return BaseTypes.STRING.prototype.toSql.call(this);

        }
    }

    class TEXT extends BaseTypes.TEXT {
        toSql() {
            if (this._length) {
                warn("SQLite does not support TEXT with options. Plain `TEXT` will be used instead.");
                this._length = undefined;
            }
            return "TEXT";
        }
    }

    class CHAR extends BaseTypes.CHAR {
        toSql() {
            if (this._binary) {
                return `CHAR BINARY(${this._length})`;
            }
            return BaseTypes.CHAR.prototype.toSql.call(this);
        }
    }

    class NUMBER extends BaseTypes.NUMBER {
        toSql() {
            let result = this.key;

            if (this._unsigned) {
                result += " UNSIGNED";
            }
            if (this._zerofill) {
                result += " ZEROFILL";
            }

            if (this._length) {
                result += `(${this._length}`;
                if (is.number(this._decimals)) {
                    result += `,${this._decimals}`;
                }
                result += ")";
            }
            return result;
        }
    }

    class TINYINT extends BaseTypes.TINYINT {
        toSql() {
            return NUMBER.prototype.toSql.call(this);
        }
    }

    class SMALLINT extends BaseTypes.SMALLINT {
        toSql() {
            return NUMBER.prototype.toSql.call(this);
        }
    }

    class MEDIUMINT extends BaseTypes.MEDIUMINT {
        toSql() {
            return NUMBER.prototype.toSql.call(this);
        }
    }

    class INTEGER extends BaseTypes.INTEGER {
        toSql() {
            return NUMBER.prototype.toSql.call(this);
        }
    }

    class BIGINT extends BaseTypes.BIGINT {
        toSql() {
            return NUMBER.prototype.toSql.call(this);
        }
    }

    class FLOAT extends BaseTypes.FLOAT {
        toSql() {
            return NUMBER.prototype.toSql.call(this);
        }
    }

    class DOUBLE extends BaseTypes.DOUBLE {
        toSql() {
            return NUMBER.prototype.toSql.call(this);
        }
    }

    class REAL extends BaseTypes.REAL {
        toSql() {
            return NUMBER.prototype.toSql.call(this);
        }
    }

    [FLOAT, DOUBLE, REAL].forEach((floating) => {
        floating.parse = function parse(value) {
            if (_.isString(value)) {
                if (value === "NaN") {
                    return NaN;
                } else if (value === "Infinity") {
                    return Infinity;
                } else if (value === "-Infinity") {
                    return -Infinity;
                }
            }
            return value;
        };
    });

    class ENUM extends BaseTypes.ENUM {
        toSql() {
            return "TEXT";
        }
    }

    const types = {
        DATE,
        DATEONLY,
        STRING,
        CHAR,
        NUMBER,
        FLOAT,
        REAL,
        "DOUBLE PRECISION": DOUBLE,
        TINYINT,
        SMALLINT,
        MEDIUMINT,
        INTEGER,
        BIGINT,
        TEXT,
        ENUM,
        JSON: JSONTYPE
    };

    _.forIn(types, (DataType, key) => {
        if (!DataType.key) {
            DataType.key = key;
        }
        if (!DataType.extend) {
            DataType.extend = (oldType) => {
                return new DataType(oldType.options);
            };
        }
    });

    BaseTypes.sqlite = types;

    return types;

}
