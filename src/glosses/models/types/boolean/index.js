import Any from "../any";
import { flatten } from "../../utils";

const {
    assert,
    is
} = adone;

const internals = adone.lazify({
    Set: "../../set"
}, exports, require);


internals.Boolean = class extends Any {
    constructor() {

        super();
        this._type = "boolean";
        this._flags.insensitive = true;
        this._inner.truthySet = new internals.Set();
        this._inner.falsySet = new internals.Set();
    }

    _base(value, state, options) {

        const result = {
            value
        };

        if (is.string(value) &&
            options.convert) {

            const normalized = this._flags.insensitive ? value.toLowerCase() : value;
            result.value = (normalized === "true" ? true
                : (normalized === "false" ? false : value));
        }

        if (!is.boolean(result.value)) {
            result.value = (this._inner.truthySet.has(value, null, null, this._flags.insensitive) ? true
                : (this._inner.falsySet.has(value, null, null, this._flags.insensitive) ? false : value));
        }

        result.errors = (is.boolean(result.value)) ? null : this.createError("boolean.base", null, state, options);
        return result;
    }

    truthy(...values) {

        const obj = this.clone();
        values = flatten(values);
        for (let i = 0; i < values.length; ++i) {
            const value = values[i];

            assert(!is.undefined(value), "Cannot call truthy with undefined");
            obj._inner.truthySet.add(value);
        }
        return obj;
    }

    falsy(...values) {

        const obj = this.clone();
        values = flatten(values);
        for (let i = 0; i < values.length; ++i) {
            const value = values[i];

            assert(!is.undefined(value), "Cannot call falsy with undefined");
            obj._inner.falsySet.add(value);
        }
        return obj;
    }

    insensitive(enabled) {

        const insensitive = is.undefined(enabled) ? true : Boolean(enabled);

        if (this._flags.insensitive === insensitive) {
            return this;
        }

        const obj = this.clone();
        obj._flags.insensitive = insensitive;
        return obj;
    }

    describe() {

        const description = Any.prototype.describe.call(this);
        description.truthy = [true].concat(this._inner.truthySet.values());
        description.falsy = [false].concat(this._inner.falsySet.values());
        return description;
    }
};


module.exports = new internals.Boolean();
