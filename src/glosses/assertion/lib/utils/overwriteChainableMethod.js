/*!
 * assert - overwriteChainableMethod utility
 * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

import * as $assert from "../..";
import transferFlags from "./transferFlags";

/**
 * ### overwriteChainableMethod (ctx, name, method, chainingBehavior)
 *
 * Overwites an already existing chainable method
 * and provides access to the previous function or
 * property.  Must return functions to be used for
 * name.
 *
 *     utils.overwriteChainableMethod(assert.Assertion.prototype, 'length',
 *       function (_super) {
 *       }
 *     , function (_super) {
 *       }
 *     );
 *
 * Can also be accessed directly from `assert.Assertion`.
 *
 *     assert.Assertion.overwriteChainableMethod('foo', fn, fn);
 *
 * Then can be used as any other assertion.
 *
 *     expect(myFoo).to.have.length(3);
 *     expect(myFoo).to.have.length.above(3);
 *
 * @param {Object} ctx object whose method / property is to be overwritten
 * @param {String} name of method / property to overwrite
 * @param {Function} method function that returns a function to be used for name
 * @param {Function} chainingBehavior function that returns a function to be used for property
 * @namespace Utils
 * @name overwriteChainableMethod
 * @api public
 */

const methods = Symbol.for("shani:assert:methods");

export default function (ctx, name, method, chainingBehavior) {
    const chainableBehavior = ctx[methods][name];

    const _chainingBehavior = chainableBehavior.chainingBehavior;
    chainableBehavior.chainingBehavior = function () {
        const result = chainingBehavior(_chainingBehavior).call(this);
        if (result !== undefined) {
            return result;
        }

        const newAssertion = $assert.getAssertion();
        transferFlags(this, newAssertion);
        return newAssertion;
    };

    const _method = chainableBehavior.method;
    chainableBehavior.method = function () {
        const result = method(_method).apply(this, arguments);
        if (result !== undefined) {
            return result;
        }

        const newAssertion = $assert.getAssertion();
        transferFlags(this, newAssertion);
        return newAssertion;
    };
}
