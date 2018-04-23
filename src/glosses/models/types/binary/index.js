import Any from "../any";

const {
    assert,
    is
} = adone;

const internals = {};


internals.Binary = class extends Any {

    constructor() {

        super();
        this._type = "binary";
    }

    _base(value, state, options) {

        const result = {
            value
        };

        if (is.string(value) && options.convert) {

            try {
                result.value = Buffer.from(value, this._flags.encoding);
            } catch (e) {
                //
            }
        }

        result.errors = is.buffer(result.value) ? null : this.createError("binary.base", null, state, options);
        return result;
    }

    encoding(encoding) {
        assert(Buffer.isEncoding(encoding), `Invalid encoding: ${encoding}`);

        if (this._flags.encoding === encoding) {
            return this;
        }

        const obj = this.clone();
        obj._flags.encoding = encoding;
        return obj;
    }

    min(limit) {
        assert(is.safeInteger(limit) && limit >= 0, "limit must be a positive integer");

        return this._test("min", limit, function (value, state, options) {

            if (value.length >= limit) {
                return value;
            }

            return this.createError("binary.min", { limit, value }, state, options);
        });
    }

    max(limit) {
        assert(is.safeInteger(limit) && limit >= 0, "limit must be a positive integer");

        return this._test("max", limit, function (value, state, options) {

            if (value.length <= limit) {
                return value;
            }

            return this.createError("binary.max", { limit, value }, state, options);
        });
    }

    length(limit) {
        assert(is.safeInteger(limit) && limit >= 0, "limit must be a positive integer");

        return this._test("length", limit, function (value, state, options) {

            if (value.length === limit) {
                return value;
            }

            return this.createError("binary.length", { limit, value }, state, options);
        });
    }

};

module.exports = new internals.Binary();
