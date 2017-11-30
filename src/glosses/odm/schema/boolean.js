const utils = require("../utils");

import SchemaType from "../schematype";
const CastError = SchemaType.CastError;

const {
    is
} = adone;

/**
 * Boolean SchemaType constructor.
 *
 * @param {String} path
 * @param {Object} options
 * @inherits SchemaType
 * @api public
 */
export default class SchemaBoolean extends SchemaType {
    constructor(path, options) {
        super(path, options, "Boolean");
    }

    /**
     * Check if the given value satisfies a required validator. For a boolean
     * to satisfy a required validator, it must be strictly equal to true or to
     * false.
     *
     * @param {Any} value
     * @return {Boolean}
     * @api public
     */
    checkRequired(value) {
        return value === true || value === false;
    }

    /**
     * Casts to boolean
     *
     * @param {Object} value
     * @api private
     */
    cast(value) {
        if (is.null(value)) {
            return value;
        }
        if (!this.options.strictBool) {
            // legacy mode
            if (value === "0") {
                return false;
            }
            if (value === "true") {
                return true;
            }
            if (value === "false") {
                return false;
            }
            return Boolean(value);
        }
        // strict mode (throws if value is not a boolean, instead of converting)
        if (value === true || value === "true" || value === 1 || value === "1") {
            return true;
        }
        if (value === false || value === "false" || value === 0 || value === "0") {
            return false;
        }
        throw new CastError("boolean", value, this.path);
    }

    /**
     * Casts contents for queries.
     *
     * @param {String} $conditional
     * @param {any} val
     * @api private
     */
    castForQuery($conditional, val) {
        let handler;
        if (arguments.length === 2) {
            handler = SchemaBoolean.$conditionalHandlers[$conditional];

            if (handler) {
                return handler.call(this, val);
            }

            return this._castForQuery(val);
        }

        return this._castForQuery($conditional);
    }
}

/**
 * This schema type's name, to defend against minifiers that mangle
 * function names.
 *
 * @api public
 */
SchemaBoolean.schemaName = "Boolean";

SchemaBoolean.$conditionalHandlers = utils.options(SchemaType.prototype.$conditionalHandlers, {});
