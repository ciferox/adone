const {
    assertion
} = adone;

const addLengthGuard = require("./add_length_guard");
const flag = require("./flag");
const proxify = require("./proxify");
const transferFlags = require("./transfer_flags");

/**
 * ### .overwriteMethod(ctx, name, fn)
 *
 * Overwrites an already existing method and provides
 * access to previous function. Must return function
 * to be used for name.
 *
 *     utils.overwriteMethod(chai.Assertion.prototype, 'equal', function (_super) {
 *       return function (str) {
 *         var obj = utils.flag(this, 'object');
 *         if (obj instanceof Foo) {
 *           new chai.Assertion(obj.value).to.equal(str);
 *         } else {
 *           _super.apply(this, arguments);
 *         }
 *       }
 *     });
 *
 * Can also be accessed directly from `chai.Assertion`.
 *
 *     chai.Assertion.overwriteMethod('foo', fn);
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

module.exports = function overwriteMethod(ctx, name, method) {
    const _method = ctx[name];
    let _super = function () {
        throw new Error(`${name} is not a function`);
    };

    // eslint-disable-next-line yoda
    if (_method && "function" === typeof _method) {
        _super = _method;
    }

    const overwritingMethodWrapper = function () {
        // Setting the `ssfi` flag to `overwritingMethodWrapper` causes this
        // function to be the starting point for removing implementation frames from
        // the stack trace of a failed assertion.
        //
        // However, we only want to use this function as the starting point if the
        // `lockSsfi` flag isn't set.
        //
        // If the `lockSsfi` flag is set, then either this assertion has been
        // overwritten by another assertion, or this assertion is being invoked from
        // inside of another assertion. In the first case, the `ssfi` flag has
        // already been set by the overwriting assertion. In the second case, the
        // `ssfi` flag has already been set by the outer assertion.
        if (!flag(this, "lockSsfi")) {
            flag(this, "ssfi", overwritingMethodWrapper);
        }

        // Setting the `lockSsfi` flag to `true` prevents the overwritten assertion
        // from changing the `ssfi` flag. By this point, the `ssfi` flag is already
        // set to the correct starting point for this assertion.
        const origLockSsfi = flag(this, "lockSsfi");
        flag(this, "lockSsfi", true);
        const result = method(_super).apply(this, arguments);
        flag(this, "lockSsfi", origLockSsfi);

        // eslint-disable-next-line adone/no-undefined-comp
        if (result !== undefined) {
            return result;
        }

        const newAssertion = new assertion.Assertion();
        transferFlags(this, newAssertion);
        return newAssertion;
    };

    addLengthGuard(overwritingMethodWrapper, name, false);
    ctx[name] = proxify(overwritingMethodWrapper, name);
};
