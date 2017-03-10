/*!
 * overwriteMethod utility
 * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */


import $assert from "../..";
import flag from "./flag";
import proxify from "./proxify";
import transferFlags from "./transferFlags";

/**
 * ### overwriteMethod (ctx, name, fn)
 *
 * Overwites an already existing method and provides
 * access to previous function. Must return function
 * to be used for name.
 *
 *     utils.overwriteMethod(assert.Assertion.prototype, 'equal', function (_super) {
 *       return function (str) {
 *         var obj = utils.flag(this, 'object');
 *         if (obj instanceof Foo) {
 *           assert.getAssertion(obj.value).to.equal(str);
 *         } else {
 *           _super.apply(this, arguments);
 *         }
 *       }
 *     });
 *
 * Can also be accessed directly from `assert.Assertion`.
 *
 *     assert.Assertion.overwriteMethod('foo', fn);
 *
 * Then can be used as any other assertion.
 *
 *     expect(myFoo).to.equal('bar');
 *
 * @param {Object} ctx object whose method is to be overwritten
 * @param {String} name of method to overwrite
 * @param {Function} method function that returns a function to be used for name
 * @namespace Utils
 * @name overwriteMethod
 * @api public
 */

export default function (ctx, name, method) {
    const _method = ctx[name];
    let _super = function () {
        throw new Error(name + " is not a function");
    };

    if (_method && adone.is.function(_method)) {
        _super = _method;
    }

    const fn = function () {
        const keep_ssfi = flag(this, "keep_ssfi");
        const old_ssfi = flag(this, "ssfi");
        if (!keep_ssfi && old_ssfi)
            flag(this, "ssfi", fn);

        flag(this, "keep_ssfi", true);
        const result = method(_super).apply(this, arguments);
        flag(this, "keep_ssfi", false);

        if (result !== undefined) {
            return result;
        }

        const newAssertion = $assert.getAssertion();
        transferFlags(this, newAssertion);
        return newAssertion;
    };

    ctx[name] = proxify(fn, name);
}