/*!
 * addChainingMethod utility
 * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/*!
 * Module dependencies
 */


import * as $assert from "../..";
import flag from "./flag";
import proxify from "./proxify";
import transferFlags from "./transferFlags";

/*!
 * Module variables
 */

// Cache `Function` properties
const call = Function.prototype.call;
const apply = Function.prototype.apply;

/**
 * ### addChainableMethod (ctx, name, method, chainingBehavior)
 *
 * Adds a method to an object, such that the method can also be chained.
 *
 *     utils.addChainableMethod(assert.Assertion.prototype, 'foo', function (str) {
 *       var obj = utils.flag(this, 'object');
 *       assert.getAssertion(obj).to.be.equal(str);
 *     });
 *
 * Can also be accessed directly from `assert.Assertion`.
 *
 *     assert.Assertion.addChainableMethod('foo', fn, chainingBehavior);
 *
 * The result can then be used as both a method assertion, executing both `method` and
 * `chainingBehavior`, or as a language chain, which only executes `chainingBehavior`.
 *
 *     expect(fooStr).to.be.foo('bar');
 *     expect(fooStr).to.be.foo.equal('foo');
 *
 * @param {Object} ctx object to which the method is added
 * @param {String} name of method to add
 * @param {Function} method function to be used for `name`, when called
 * @param {Function} chainingBehavior function to be called every time the property is accessed
 * @namespace Utils
 * @name addChainableMethod
 * @api public
 */

export default function (ctx, name, method, chainingBehavior) {
    if (!adone.is.function(chainingBehavior)) {
        chainingBehavior = adone.noop;
    }

    const chainableBehavior = {
        method,
        chainingBehavior
    };

    // save the methods so we can overwrite them later, if we need to.
    if (!ctx.__methods) {
        ctx.__methods = {};
    }
    ctx.__methods[name] = chainableBehavior;

    Object.defineProperty(ctx, name, {
        get() {
            chainableBehavior.chainingBehavior.call(this);

            const assert = function assert() {
                const old_ssfi = flag(this, "ssfi");
                if (old_ssfi) {
                    flag(this, "ssfi", assert);
                }
                const result = chainableBehavior.method.apply(this, arguments);

                if (result !== undefined) {
                    return result;
                }

                const newAssertion = $assert.getAssertion();
                transferFlags(this, newAssertion);
                return newAssertion;
            };

            // Inherit all properties from the object by replacing the `Function` prototype
            const prototype = assert.__proto__ = Object.create(this);
            // Restore the `call` and `apply` methods from `Function`
            prototype.call = call;
            prototype.apply = apply;

            transferFlags(this, assert);
            return proxify(assert);
        },
        configurable: true
    });
}
