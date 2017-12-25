import SchemaType from "../schematype";
const CastError = SchemaType.CastError;
const oid = require("../types/objectid");
const utils = require("../utils");

const {
    is
} = adone;

const handleSingle = function (val) {
    return this.cast(val);
};

const defaultId = () => new oid();

const resetId = function (v) {
    if (v === void 0) {
        const _v = new oid();
        this.$__._id = _v;
        return _v;
    }

    if (this instanceof adone.odm.Document) {
        this.$__._id = v;
    }
    return v;
};

/**
 * ObjectId SchemaType constructor.
 *
 * @param {String} key
 * @param {Object} options
 * @inherits SchemaType
 * @api public
 */
export default class ObjectId extends SchemaType {
    constructor(key, options) {
        super(key, options, "ObjectId");
        const isKeyHexStr = is.string(key) && key.length === 24 && /^a-f0-9$/i.test(key);
        const suppressWarning = options && options.suppressWarning;
        if ((isKeyHexStr || is.undefined(key)) && !suppressWarning) {
            console.warn("mongoose: To create a new ObjectId please try " +
                "`Mongoose.Types.ObjectId` instead of using " +
                "`Mongoose.Schema.ObjectId`. Set the `suppressWarning` option if " +
                "you're trying to create a hex char path in your schema.");
            console.trace();
        }
    }

    /**
     * Adds an auto-generated ObjectId default if turnOn is true.
     * @param {Boolean} turnOn auto generated ObjectId defaults
     * @api public
     * @return {SchemaType} this
     */
    auto(turnOn) {
        if (turnOn) {
            this.default(defaultId);
            this.set(resetId);
        }

        return this;
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
        return value instanceof oid;
    }

    /**
     * Casts to ObjectId
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
            if (value instanceof oid) {
                return value;
            } else if ((value.constructor.name || "").toLowerCase() === "objectid") {
                return new oid(value.toHexString());
            } else if (is.buffer(value) || !utils.isObject(value)) {
                throw new CastError("ObjectId", value, this.path);
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

        if (value instanceof oid) {
            return value;
        }

        if (value._id) {
            if (value._id instanceof oid) {
                return value._id;
            }
            if (value._id.toString instanceof Function) {
                try {
                    return new oid(value._id.toString());
                } catch (e) {
                    //
                }
            }
        }

        if (value.toString instanceof Function) {
            try {
                return new oid(value.toString());
            } catch (err) {
                throw new CastError("ObjectId", value, this.path);
            }
        }

        throw new CastError("ObjectId", value, this.path);
    }

    /**
     * Casts contents for queries.
     *
     * @param {String} $conditional
     * @param {any} [val]
     * @api private
     */
    castForQuery($conditional, val) {
        let handler;
        if (arguments.length === 2) {
            handler = this.$conditionalHandlers[$conditional];
            if (!handler) {
                throw new Error(`Can't use ${$conditional} with ObjectId.`);
            }
            return handler.call(this, val);
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
ObjectId.schemaName = "ObjectId";

ObjectId.prototype.$conditionalHandlers = utils.options(SchemaType.prototype.$conditionalHandlers, {
    $gt: handleSingle,
    $gte: handleSingle,
    $lt: handleSingle,
    $lte: handleSingle
});
