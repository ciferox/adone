import SchemaType from "../schematype";
const CastError = SchemaType.CastError;
import { handleBitwiseOperator } from "./operators/bitwise";
const MongooseError = require("../error");
const utils = require("../utils");

const {
    is
} = adone;

const handleSingle = function (val) {
    return this.cast(val);
};

const handleArray = function (val) {
    const _this = this;
    if (!is.array(val)) {
        return [this.cast(val)];
    }
    return val.map((m) => {
        return _this.cast(m);
    });
};

/**
 * Number SchemaType constructor.
 *
 * @param {String} key
 * @param {Object} options
 * @inherits SchemaType
 * @api public
 */
export default class SchemaNumber extends SchemaType {
    constructor(key, options) {
        super(key, options, "Number");
    }

    /**
     * Check if the given value satisfies a required validator.
     *
     * @param {Any} value
     * @param {adone.odm.Document} doc
     * @return {Boolean}
     * @api public
     */
    checkRequiredcheckRequired(value, doc) {
        if (SchemaType._isRef(this, value, doc, true)) {
            return Boolean(value);
        }
        return is.number(value) || value instanceof Number;
    }

    /**
     * Sets a minimum number validator.
     *
     * ####Example:
     *
     *     var s = new Schema({ n: { type: Number, min: 10 })
     *     var M = db.model('M', s)
     *     var m = new M({ n: 9 })
     *     m.save(function (err) {
     *       console.error(err) // validator error
     *       m.n = 10;
     *       m.save() // success
     *     })
     *
     *     // custom error messages
     *     // We can also use the special {MIN} token which will be replaced with the invalid value
     *     var min = [10, 'The value of path `{PATH}` ({VALUE}) is beneath the limit ({MIN}).'];
     *     var schema = new Schema({ n: { type: Number, min: min })
     *     var M = mongoose.model('Measurement', schema);
     *     var s= new M({ n: 4 });
     *     s.validate(function (err) {
     *       console.log(String(err)) // ValidationError: The value of path `n` (4) is beneath the limit (10).
     *     })
     *
     * @param {Number} value minimum number
     * @param {String} [message] optional custom error message
     * @return {SchemaType} this
     * @see Customized Error Messages #error_messages_MongooseError-messages
     * @api public
     */
    min(value, message) {
        if (this.minValidator) {
            this.validators = this.validators.filter(function (v) {
                return v.validator !== this.minValidator;
            }, this);
        }

        if (!is.nil(value)) {
            let msg = message || MongooseError.messages.Number.min;
            msg = msg.replace(/{MIN}/, value);
            this.validators.push({
                validator: this.minValidator = function (v) {
                    return is.nil(v) || v >= value;
                },
                message: msg,
                type: "min",
                min: value
            });
        }

        return this;
    }

    /**
     * Sets a maximum number validator.
     *
     * ####Example:
     *
     *     var s = new Schema({ n: { type: Number, max: 10 })
     *     var M = db.model('M', s)
     *     var m = new M({ n: 11 })
     *     m.save(function (err) {
     *       console.error(err) // validator error
     *       m.n = 10;
     *       m.save() // success
     *     })
     *
     *     // custom error messages
     *     // We can also use the special {MAX} token which will be replaced with the invalid value
     *     var max = [10, 'The value of path `{PATH}` ({VALUE}) exceeds the limit ({MAX}).'];
     *     var schema = new Schema({ n: { type: Number, max: max })
     *     var M = mongoose.model('Measurement', schema);
     *     var s= new M({ n: 4 });
     *     s.validate(function (err) {
     *       console.log(String(err)) // ValidationError: The value of path `n` (4) exceeds the limit (10).
     *     })
     *
     * @param {Number} maximum number
     * @param {String} [message] optional custom error message
     * @return {SchemaType} this
     * @see Customized Error Messages #error_messages_MongooseError-messages
     * @api public
     */
    max(value, message) {
        if (this.maxValidator) {
            this.validators = this.validators.filter(function (v) {
                return v.validator !== this.maxValidator;
            }, this);
        }

        if (!is.nil(value)) {
            let msg = message || MongooseError.messages.Number.max;
            msg = msg.replace(/{MAX}/, value);
            this.validators.push({
                validator: this.maxValidator = function (v) {
                    return is.nil(v) || v <= value;
                },
                message: msg,
                type: "max",
                max: value
            });
        }

        return this;
    }

    /**
     * Casts to number
     *
     * @param {Object} value value to cast
     * @param {adone.odm.Document} doc document that triggers the casting
     * @param {Boolean} init
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
            if (is.number(value)) {
                return value;
            } else if (is.buffer(value) || !utils.isObject(value)) {
                throw new CastError("number", value, this.path);
            }

            // Handle the case where user directly sets a populated
            // path to a plain object; cast to the Model used in
            // the population query.
            const path = doc.$__fullPath(this.path);
            const owner = doc.ownerDocument ? doc.ownerDocument() : doc;
            const pop = owner.populated(path, true);
            const ret = new pop.options.model(value);
            ret.$__.wasPopulated = true;
            return ret;
        }

        let val = value && !is.undefined(value._id) ?
            value._id : // documents
            value;

        if (!isNaN(val)) {
            if (is.null(val)) {
                return val;
            }
            if (val === "") {
                return null;
            }
            if (is.string(val) || is.boolean(val)) {
                val = Number(val);
            }
            if (val instanceof Number) {
                return val;
            }
            if (is.number(val)) {
                return val;
            }
            if (val.toString && !is.array(val) && val.toString() == Number(val)) {
                return new Number(val);
            }
        }

        throw new CastError("number", value, this.path);
    }

    /**
     * Casts contents for queries.
     *
     * @param {String} $conditional
     * @param {any} [value]
     * @api private
     */
    castForQuery($conditional, val) {
        let handler;
        if (arguments.length === 2) {
            handler = this.$conditionalHandlers[$conditional];
            if (!handler) {
                throw new Error(`Can't use ${$conditional} with Number.`);
            }
            return handler.call(this, val);
        }
        val = this._castForQuery($conditional);
        return val;
    }
}

/**
 * This schema type's name, to defend against minifiers that mangle
 * function names.
 *
 * @api public
 */
SchemaNumber.schemaName = "Number";

SchemaNumber.prototype.$conditionalHandlers = utils.options(SchemaType.prototype.$conditionalHandlers, {
    $bitsAllClear: handleBitwiseOperator,
    $bitsAnyClear: handleBitwiseOperator,
    $bitsAllSet: handleBitwiseOperator,
    $bitsAnySet: handleBitwiseOperator,
    $gt: handleSingle,
    $gte: handleSingle,
    $lt: handleSingle,
    $lte: handleSingle,
    $mod: handleArray
});
