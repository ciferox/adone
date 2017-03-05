/*!
 * addMethod utility
 * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */
import $assert from "../..";
import flag from "./flag";
import proxify from "./proxify";
import transferFlags from "./transferFlags";

/**
 * ### .addMethod (ctx, name, method)
 *
 * Adds a method to the prototype of an object.
 *
 *     utils.addMethod(assert.Assertion.prototype, 'foo', function (str) {
 *       var obj = utils.flag(this, 'object');
 *       assert.getAssertion(obj).to.be.equal(str);
 *     });
 *
 * Can also be accessed directly from `assert.Assertion`.
 *
 *     assert.Assertion.addMethod('foo', fn);
 *
 * Then can be used as any other assertion.
 *
 *     expect(fooStr).to.be.foo('bar');
 *
 * @param {Object} ctx object to which the method is added
 * @param {String} name of method to add
 * @param {Function} method function to be used for name
 * @namespace Utils
 * @name addMethod
 * @api public
 */

export default function (ctx, name, method) {
    const fn = function () {
        const keep_ssfi = flag(this, "keep_ssfi");
        const old_ssfi = flag(this, "ssfi");
        if (!keep_ssfi && old_ssfi)
            flag(this, "ssfi", fn);

        const result = method.apply(this, arguments);
        if (result !== undefined)
            return result;

        const newAssertion = $assert.getAssertion();
        transferFlags(this, newAssertion);
        return newAssertion;
    };

    ctx[name] = proxify(fn, name);
}
