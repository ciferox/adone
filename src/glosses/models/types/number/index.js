import Any from "../any";
import { isRef } from "../../ref";

const {
    assert,
    is
} = adone;

const internals = {
    precisionRx: /(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/
};

internals.Number = class extends Any {

    constructor() {

        super();
        this._type = "number";
        this._invalids.add(Infinity);
        this._invalids.add(-Infinity);
    }

    _base(value, state, options) {

        const result = {
            errors: null,
            value
        };

        if (is.string(value) &&
            options.convert) {

            const number = parseFloat(value);
            result.value = (isNaN(number) || !isFinite(value)) ? NaN : number;
        }

        const isNumber = is.number(result.value) && !isNaN(result.value);

        if (options.convert && "precision" in this._flags && isNumber) {

            // This is conceptually equivalent to using toFixed but it should be much faster
            const precision = Math.pow(10, this._flags.precision);
            result.value = Math.round(result.value * precision) / precision;
        }

        result.errors = isNumber ? null : this.createError("number.base", null, state, options);
        return result;
    }

    multiple(base) {

        const isRef_ = isRef(base);

        if (!isRef_) {
            assert(is.number(base) && isFinite(base), "multiple must be a number");
            assert(base > 0, "multiple must be greater than 0");
        }

        return this._test("multiple", base, function (value, state, options) {

            const divisor = isRef_ ? base(state.reference || state.parent, options) : base;

            if (isRef_ && (!is.number(divisor) || !isFinite(divisor))) {
                return this.createError("number.ref", { ref: base.key }, state, options);
            }

            if (value % divisor === 0) {
                return value;
            }

            return this.createError("number.multiple", { multiple: base, value }, state, options);
        });
    }

    integer() {

        return this._test("integer", undefined, function (value, state, options) {

            return is.safeInteger(value) ? value : this.createError("number.integer", { value }, state, options);
        });
    }

    negative() {

        return this._test("negative", undefined, function (value, state, options) {

            if (value < 0) {
                return value;
            }

            return this.createError("number.negative", { value }, state, options);
        });
    }

    positive() {

        return this._test("positive", undefined, function (value, state, options) {

            if (value > 0) {
                return value;
            }

            return this.createError("number.positive", { value }, state, options);
        });
    }

    precision(limit) {

        assert(is.safeInteger(limit), "limit must be an integer");
        assert(!("precision" in this._flags), "precision already set");

        const obj = this._test("precision", limit, function (value, state, options) {

            const places = value.toString().match(internals.precisionRx);
            const decimals = Math.max((places[1] ? places[1].length : 0) - (places[2] ? parseInt(places[2], 10) : 0), 0);
            if (decimals <= limit) {
                return value;
            }

            return this.createError("number.precision", { limit, value }, state, options);
        });

        obj._flags.precision = limit;
        return obj;
    }

    port() {

        return this._test("port", undefined, function (value, state, options) {

            if (!is.safeInteger(value) || value < 0 || value > 65535) {
                return this.createError("number.port", { value }, state, options);
            }

            return value;
        });
    }

};


internals.compare = function (type, compare) {

    return function (limit) {

        const isRef_ = isRef(limit);
        const isNumber = is.number(limit) && !isNaN(limit);

        assert(isNumber || isRef_, "limit must be a number or reference");

        return this._test(type, limit, function (value, state, options) {

            let compareTo;
            if (isRef_) {
                compareTo = limit(state.reference || state.parent, options);

                if (!(is.number(compareTo) && !isNaN(compareTo))) {
                    return this.createError("number.ref", { ref: limit.key }, state, options);
                }
            } else {
                compareTo = limit;
            }

            if (compare(value, compareTo)) {
                return value;
            }

            return this.createError(`number.${type}`, { limit: compareTo, value }, state, options);
        });
    };
};


internals.Number.prototype.min = internals.compare("min", (value, limit) => value >= limit);
internals.Number.prototype.max = internals.compare("max", (value, limit) => value <= limit);
internals.Number.prototype.greater = internals.compare("greater", (value, limit) => value > limit);
internals.Number.prototype.less = internals.compare("less", (value, limit) => value < limit);


module.exports = new internals.Number();
