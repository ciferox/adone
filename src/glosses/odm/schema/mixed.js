import SchemaType from "../schematype";
const utils = require("../utils");

const {
    is
} = adone;

/**
 * Mixed SchemaType constructor.
 *
 * @param {String} path
 * @param {Object} options
 * @inherits SchemaType
 * @api public
 */
export default class Mixed extends SchemaType {
    constructor(path, options) {
        super(path, options, "Mixed");

        if (options && options.default) {
            const def = options.default;
            if (is.array(def) && def.length === 0) {
                // make sure empty array defaults are handled
                options.default = Array;
            } else if (!options.shared && utils.isObject(def) && Object.keys(def).length === 0) {
                // prevent odd "shared" objects between documents
                options.default = function () {
                    return {};
                };
            }
        }
    }

    /**
     * Casts `val` for Mixed.
     *
     * _this is a no-op_
     *
     * @param {Object} value to cast
     * @api private
     */
    cast(val) {
        return val;
    }

    /**
     * Casts contents for queries.
     *
     * @param {String} $cond
     * @param {any} [val]
     * @api private
     */
    castForQuery($cond, val) {
        if (arguments.length === 2) {
            return val;
        }
        return $cond;
    }
}

/**
 * This schema type's name, to defend against minifiers that mangle
 * function names.
 *
 * @api public
 */
Mixed.schemaName = "Mixed";
