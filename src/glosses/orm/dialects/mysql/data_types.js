const { is, vendor: { lodash: _ } } = adone;
const wkx = adone.util.terraformer.WKX;

module.exports = (BaseTypes) => {
    BaseTypes.ABSTRACT.prototype.dialectTypes = "https://dev.mysql.com/doc/refman/5.7/en/data-types.html";

    /**
     * types: [buffer_type, ...]
     * @see buffer_type here https://dev.mysql.com/doc/refman/5.7/en/c-api-prepared-statement-type-codes.html
     * @see hex here https://github.com/sidorares/node-mysql2/blob/master/lib/constants/types.js
     */

    BaseTypes.DATE.types.mysql = ["DATETIME"];
    BaseTypes.STRING.types.mysql = ["VAR_STRING"];
    BaseTypes.CHAR.types.mysql = ["STRING"];
    BaseTypes.TEXT.types.mysql = ["BLOB"];
    BaseTypes.TINYINT.types.mysql = ["TINY"];
    BaseTypes.SMALLINT.types.mysql = ["SHORT"];
    BaseTypes.MEDIUMINT.types.mysql = ["INT24"];
    BaseTypes.INTEGER.types.mysql = ["LONG"];
    BaseTypes.BIGINT.types.mysql = ["LONGLONG"];
    BaseTypes.FLOAT.types.mysql = ["FLOAT"];
    BaseTypes.TIME.types.mysql = ["TIME"];
    BaseTypes.DATEONLY.types.mysql = ["DATE"];
    BaseTypes.BOOLEAN.types.mysql = ["TINY"];
    BaseTypes.BLOB.types.mysql = ["TINYBLOB", "BLOB", "LONGBLOB"];
    BaseTypes.DECIMAL.types.mysql = ["NEWDECIMAL"];
    BaseTypes.UUID.types.mysql = false;
    BaseTypes.ENUM.types.mysql = false;
    BaseTypes.REAL.types.mysql = ["DOUBLE"];
    BaseTypes.DOUBLE.types.mysql = ["DOUBLE"];
    BaseTypes.GEOMETRY.types.mysql = ["GEOMETRY"];
    BaseTypes.JSON.types.mysql = ["JSON"];

    class BLOB extends BaseTypes.BLOB {
        static parse(value, options, next) {
            const data = next();

            if (is.buffer(data) && data.length === 0) {
                return null;
            }

            return data;
        }
    }

    class DECIMAL extends BaseTypes.DECIMAL {
        toSql() {
            let definition = super.toSql();

            if (this._unsigned) {
                definition += " UNSIGNED";
            }

            if (this._zerofill) {
                definition += " ZEROFILL";
            }

            return definition;
        }
    }

    class DATE extends BaseTypes.DATE {
        toSql() {
            return `DATETIME${this._length ? `(${this._length})` : ""}`;
        }

        _stringify(date, options) {
            date = BaseTypes.DATE.prototype._applyTimezone(date, options);
            // Fractional DATETIMEs only supported on MySQL 5.6.4+
            if (this._length) {
                return date.format("YYYY-MM-DD HH:mm:ss.SSS");
            }

            return date.format("YYYY-MM-DD HH:mm:ss");
        }

        static parse(value, options) {
            value = value.string();

            if (is.null(value)) {
                return value;
            }

            if (adone.datetime.tz.zone(options.timezone)) {
                value = adone.datetime.tz(value, options.timezone).toDate();
            } else {
                value = new Date(`${value} ${options.timezone}`);
            }

            return value;
        }
    }

    class DATEONLY extends BaseTypes.DATEONLY {
        static parse(value) {
            return value.string();
        }
    }

    class UUID extends BaseTypes.UUID {
        toSql() {
            return "CHAR(36) BINARY";
        }
    }


    const SUPPORTED_GEOMETRY_TYPES = ["POINT", "LINESTRING", "POLYGON"];

    class GEOMETRY extends BaseTypes.GEOMETRY {
        constructor(type, srid) {
            super(type, srid);
            if (_.isEmpty(this.type)) {
                this.sqlType = this.key;
            } else if (_.includes(SUPPORTED_GEOMETRY_TYPES, this.type)) {
                this.sqlType = this.type;
            } else {
                throw new Error(`Supported geometry types are: ${SUPPORTED_GEOMETRY_TYPES.join(", ")}`);
            }
        }

        parse(value) {
            return this.constructor.parse(value);
        }

        static parse(value) {
            value = value.buffer();

            // Empty buffer, MySQL doesn't support POINT EMPTY
            // check, https://dev.mysql.com/worklog/task/?id=2381
            if (value.length === 0) {
                return null;
            }

            // For some reason, discard the first 4 bytes
            value = value.slice(4);
            return wkx.Geometry.parse(value).toGeoJSON();
        }

        toSql() {
            return this.sqlType;
        }
    }

    class ENUM extends BaseTypes.ENUM {
        toSql(options) {
            return `ENUM(${_.map(this.values, (value) => options.escape(value)).join(", ")})`;
        }
    }

    class JSONTYPE extends BaseTypes.JSON {
        _stringify(value, options) {
            return options.operation === "where" && is.string(value) ? value : JSON.stringify(value);
        }
    }

    const exports = {
        ENUM,
        DATE,
        DATEONLY,
        UUID,
        GEOMETRY,
        DECIMAL,
        BLOB,
        JSON: JSONTYPE
    };

    _.forIn(exports, (DataType, key) => {
        if (!DataType.key) {
            DataType.key = key;
        }
        if (!DataType.extend) {
            DataType.extend = function extend(oldType) {
                return new DataType(oldType.options);
            };
        }
    });

    return exports;
};
