const {
    assertion
} = adone;

const transferFlags = require("./transfer_flags");

/**
 * ### .overwriteChainableMethod(ctx, name, method, chainingBehavior)
 *
 * Overwrites an already existing chainable method
 * and provides access to the previous function or
 * property.  Must return functions to be used for
 * name.
 *
 *     utils.overwriteChainableMethod(chai.Assertion.prototype, 'lengthOf',
 *       function (_super) {
 *       }
 *     , function (_super) {
 *       }
 *     );
 *
 * Can also be accessed directly from `chai.Assertion`.
 *
 *     chai.Assertion.overwriteChainableMethod('foo', fn, fn);
 *
 * Then can be used as any other assertion.
 *
 *     expect(myFoo).to.have.lengthOf(3);
 *     expect(myFoo).to.have.lengthOf.above(3);
 *
 * @param {Object} ctx object whose method / property is to be overwritten
 * @param {String} name of method / property to overwrite
 * @param {Function} method function that returns a function to be used for name
 * @param {Function} chainingBehavior function that returns a function to be used for property
 * @namespace Utils
 * @name overwriteChainableMethod
 * @api public
 */

module.exports = function overwriteChainableMethod(ctx, name, method, chainingBehavior) {
    const chainableBehavior = ctx.__methods[name];

    const _chainingBehavior = chainableBehavior.chainingBehavior;
    // eslint-disable-next-line func-name-matching
    chainableBehavior.chainingBehavior = function overwritingChainableMethodGetter() {
        const result = chainingBehavior(_chainingBehavior).call(this);
        // eslint-disable-next-line adone/no-undefined-comp
        if (result !== undefined) {
            return result;
        }

        const newAssertion = new assertion.Assertion();
        transferFlags(this, newAssertion);
        return newAssertion;
    };

    const _method = chainableBehavior.method;
    // eslint-disable-next-line func-name-matching
    chainableBehavior.method = function overwritingChainableMethodWrapper() {
        const result = method(_method).apply(this, arguments);
        // eslint-disable-next-line adone/no-undefined-comp
        if (result !== undefined) {
            return result;
        }

        const newAssertion = new assertion.Assertion();
        transferFlags(this, newAssertion);
        return newAssertion;
    };
};
