import { handleBitwiseOperator } from "./operators/bitwise";
const utils = require("../utils");
const MongooseBuffer = require("../types").Buffer;
import SchemaType from "../schematype";

const {
    is
} = adone;

const Binary = MongooseBuffer.Binary;
const CastError = SchemaType.CastError;

const handleSingle = function (val) {
    return this.castForQuery(val);
};

/**
 * Buffer SchemaType constructor
 *
 * @param {String} key
 * @param {Object} options
 * @inherits SchemaType
 * @api public
 */
export default class SchemaBuffer extends SchemaType {
    constructor(key, options) {
        super(key, options, "Buffer");
    }

    /**
     * Check if the given value satisfies a required validator. To satisfy a
     * required validator, a buffer must not be null or undefined and have
     * non-zero length.
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
        return Boolean(value && value.length);
    }

    /**
     * Casts contents
     *
     * @param {Object} value
     * @param {adone.odm.Document} doc document that triggers the casting
     * @param {Boolean} init
     * @api private
     */
    cast(value, doc, init) {
        let ret;
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
            if (is.buffer(value)) {
                return value;
            } else if (!utils.isObject(value)) {
                throw new CastError("buffer", value, this.path);
            }

            // Handle the case where user directly sets a populated
            // path to a plain object; cast to the Model used in
            // the population query.
            const path = doc.$__fullPath(this.path);
            const owner = doc.ownerDocument ? doc.ownerDocument() : doc;
            const pop = owner.populated(path, true);
            ret = new pop.options.model(value);
            ret.$__.wasPopulated = true;
            return ret;
        }

        // documents
        if (value && value._id) {
            value = value._id;
        }

        if (value && value.isMongooseBuffer) {
            return value;
        }

        if (is.buffer(value)) {
            if (!value || !value.isMongooseBuffer) {
                value = new MongooseBuffer(value, [this.path, doc]);
                if (!is.nil(this.options.subtype)) {
                    value._subtype = this.options.subtype;
                }
            }

            return value;
        } else if (value instanceof Binary) {
            ret = new MongooseBuffer(value.value(true), [this.path, doc]);
            if (!is.number(value.subType)) {
                throw new CastError("buffer", value, this.path);
            }
            ret._subtype = value.subType;
            return ret;
        }

        if (is.null(value)) {
            return value;
        }

        const type = typeof value;
        if (type === "string" || type === "number" || is.array(value)) {
            if (type === "number") {
                value = [value];
            }
            ret = new MongooseBuffer(value, [this.path, doc]);
            if (!is.nil(this.options.subtype)) {
                ret._subtype = this.options.subtype;
            }
            return ret;
        }

        throw new CastError("buffer", value, this.path);
    }

    /**
     * Sets the default [subtype](https://studio3t.com/whats-new/best-practices-uuid-mongodb/)
     * for this buffer. You can find a [list of allowed subtypes here](http://api.mongodb.com/python/current/api/bson/binary.html).
     *
     * ####Example:
     *
     *     var s = new Schema({ uuid: { type: Buffer, subtype: 4 });
     *     var M = db.model('M', s);
     *     var m = new M({ uuid: 'test string' });
     *     m.uuid._subtype; // 4
     *
     * @param {Number} subtype the default subtype
     * @return {SchemaType} this
     * @api public
     */
    subtype(subtype) {
        this.options.subtype = subtype;
        return this;
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
                throw new Error(`Can't use ${$conditional} with Buffer.`);
            }
            return handler.call(this, val);
        }
        val = $conditional;
        const casted = this._castForQuery(val);
        return casted ? casted.toObject({ transform: false, virtuals: false }) : casted;
    }
}

/**
 * This schema type's name, to defend against minifiers that mangle
 * function names.
 *
 * @api public
 */
SchemaBuffer.schemaName = "Buffer";

SchemaBuffer.prototype.$conditionalHandlers = utils.options(SchemaType.prototype.$conditionalHandlers, {
    $bitsAllClear: handleBitwiseOperator,
    $bitsAnyClear: handleBitwiseOperator,
    $bitsAllSet: handleBitwiseOperator,
    $bitsAnySet: handleBitwiseOperator,
    $gt: handleSingle,
    $gte: handleSingle,
    $lt: handleSingle,
    $lte: handleSingle
});
