import SchemaType from "../schematype";
const utils = require("../utils");

const {
    is
} = adone;

const handleSingle = function (val) {
    return this.cast(val);
};

const handleArray = function (val) {
    const self = this;
    return val.map((m) => {
        return self.cast(m);
    });
};

export default class SchemaLong extends SchemaType {
    constructor(key, options) {
        super(key, options, "Long");
    }

    /**
     * Implement checkRequired method.
     *
     * @param {any} val
     * @return {Boolean}
     */

    checkRequired(val) {
        return !is.nil(val);
    }

    /**
     * Implement casting.
     *
     * @param {any} val
     * @param {Object} [scope]
     * @param {Boolean} [init]
     * @return {adone.database.mongo.Long|null}
     */
    cast(val, scope, init) {
        if (is.null(val)) {
            return val;
        }
        if (val === "") {
            return null;
        }

        if (val instanceof adone.database.mongo.Long) {
            return val;
        }

        if (val instanceof Number || is.number(val)) {
            return adone.database.mongo.Long.fromNumber(val);
        }

        if (!is.array(val) && val.toString) {
            return adone.database.mongo.Long.fromString(val.toString());
        }

        throw new SchemaType.CastError("Long", val);
    }

    /**
     * Implement query casting, for mongoose 3.0
     *
     * @param {String} $conditional
     * @param {*} [value]
     */
    castForQuery($conditional, value) {
        let handler;
        if (arguments.length === 2) {
            handler = this.$conditionalHandlers[$conditional];
            if (!handler) {
                throw new Error(`Can't use ${$conditional} with Long.`);
            }
            return handler.call(this, value);
        }
        return this.cast($conditional);

    }
}

SchemaLong.schemaName = "Long";

SchemaLong.prototype.$conditionalHandlers = utils.options(SchemaType.prototype.$conditionalHandlers, {
    $lt: handleSingle,
    $lte: handleSingle,
    $gt: handleSingle,
    $gte: handleSingle,
    $ne: handleSingle,
    $in: handleArray,
    $nin: handleArray,
    $mod: handleArray,
    $all: handleArray
});

