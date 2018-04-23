import { isRef } from "../../ref";
const ObjectType = require("../object");

const {
    is,
    assert
} = adone;

const internals = {};

internals.Func = class extends ObjectType.constructor {
    constructor() {
        super();
        this._flags.func = true;
    }

    arity(n) {
        assert(is.safeInteger(n) && n >= 0, "n must be a positive integer");

        return this._test("arity", n, function (value, state, options) {

            if (value.length === n) {
                return value;
            }

            return this.createError("function.arity", { n }, state, options);
        });
    }

    minArity(n) {
        assert(is.safeInteger(n) && n > 0, "n must be a strict positive integer");

        return this._test("minArity", n, function (value, state, options) {

            if (value.length >= n) {
                return value;
            }

            return this.createError("function.minArity", { n }, state, options);
        });
    }

    maxArity(n) {
        assert(is.safeInteger(n) && n >= 0, "n must be a positive integer");

        return this._test("maxArity", n, function (value, state, options) {

            if (value.length <= n) {
                return value;
            }

            return this.createError("function.maxArity", { n }, state, options);
        });
    }

    ref() {

        return this._test("ref", null, function (value, state, options) {

            if (isRef(value)) {
                return value;
            }

            return this.createError("function.ref", null, state, options);
        });
    }

    class() {

        return this._test("class", null, function (value, state, options) {

            if ((/^\s*class\s/).test(value.toString())) {
                return value;
            }

            return this.createError("function.class", null, state, options);
        });
    }
};

module.exports = new internals.Func();
