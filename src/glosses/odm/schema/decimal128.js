import SchemaType from "../schematype";
const CastError = SchemaType.CastError;
const Decimal128Type = require("../types/decimal128");
const utils = require("../utils");

const {
    is
} = adone;

const handleSingle = function (val) {
    return this.cast(val);
};

/**
 * Decimal128 SchemaType constructor.
 *
 * @param {String} key
 * @param {Object} options
 * @inherits SchemaType
 * @api public
 */
export default class Decimal128 extends SchemaType {
    constructor(key, options) {
        super(key, options, "Decimal128");
    }
    /**
 * Check if the given value satisfies a required validator.
 *
 * @param {Any} value
 * @param {adone.odm.Document} doc
 * @return {Boolean}
 * @api public
 */
    checkRequired(value, doc) {
        if (SchemaType._isRef(this, value, doc, true)) {
            return Boolean(value);
        }
        return value instanceof Decimal128Type;
    }

    /**
     * Casts to Decimal128
     *
     * @param {Object} value
     * @param {Object} doc
     * @param {Boolean} init whether this is an initialization cast
     * @api private
     */
    cast(value, doc, init) {
        if (SchemaType._isRef(this, value, doc, init)) {
            // wait! we may need to cast this to a document

            if (is.nil(value)) {
                return value;
            }

            if (value instanceof adone.odm.Document) {
                value.$__.wasPopulated = true;
                return value;
            }

            // setting a populated path
            if (value instanceof Decimal128Type) {
                return value;
            } else if (is.buffer(value) || !utils.isObject(value)) {
                throw new CastError("Decimal128", value, this.path);
            }

            // Handle the case where user directly sets a populated
            // path to a plain object; cast to the Model used in
            // the population query.
            const path = doc.$__fullPath(this.path);
            const owner = doc.ownerDocument ? doc.ownerDocument() : doc;
            const pop = owner.populated(path, true);
            let ret = value;
            if (!doc.$__.populated ||
                !doc.$__.populated[path] ||
                !doc.$__.populated[path].options ||
                !doc.$__.populated[path].options.options ||
                !doc.$__.populated[path].options.options.lean) {
                ret = new pop.options.model(value);
                ret.$__.wasPopulated = true;
            }

            return ret;
        }

        if (is.nil(value)) {
            return value;
        }

        if (typeof value === "object" && is.string(value.$numberDecimal)) {
            return Decimal128Type.fromString(value.$numberDecimal);
        }

        if (value instanceof Decimal128Type) {
            return value;
        }

        if (is.string(value)) {
            return Decimal128Type.fromString(value);
        }

        if (is.buffer(value)) {
            return new Decimal128Type(value);
        }

        throw new CastError("Decimal128", value, this.path);
    }

}

/**
 * This schema type's name, to defend against minifiers that mangle
 * function names.
 *
 * @api public
 */
Decimal128.schemaName = "Decimal128";

Decimal128.prototype.$conditionalHandlers = utils.options(SchemaType.prototype.$conditionalHandlers, {
    $gt: handleSingle,
    $gte: handleSingle,
    $lt: handleSingle,
    $lte: handleSingle
});
