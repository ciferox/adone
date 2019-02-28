const {
    assertion
} = adone;

const flag = require("./flag");
const isProxyEnabled = require("./is_proxy_enabled");
const transferFlags = require("./transfer_flags");

/**
 * ### .overwriteProperty(ctx, name, fn)
 *
 * Overwrites an already existing property getter and provides
 * access to previous value. Must return function to use as getter.
 *
 *     utils.overwriteProperty(chai.Assertion.prototype, 'ok', function (_super) {
 *       return function () {
 *         var obj = utils.flag(this, 'object');
 *         if (obj instanceof Foo) {
 *           new chai.Assertion(obj.name).to.equal('bar');
 *         } else {
 *           _super.call(this);
 *         }
 *       }
 *     });
 *
 *
 * Can also be accessed directly from `chai.Assertion`.
 *
 *     chai.Assertion.overwriteProperty('foo', fn);
 *
 * Then can be used as any other assertion.
 *
 *     expect(myFoo).to.be.ok;
 *
 * @param {Object} ctx object whose property is to be overwritten
 * @param {String} name of property to overwrite
 * @param {Function} getter function that returns a getter function to be used for name
 * @namespace Utils
 * @name overwriteProperty
 * @api public
 */

module.exports = function overwriteProperty(ctx, name, getter) {
    const _get = Object.getOwnPropertyDescriptor(ctx, name);
    let _super = function () { };

    // eslint-disable-next-line yoda
    if (_get && "function" === typeof _get.get) {
        _super = _get.get;
    }

    Object.defineProperty(ctx, name,
        {
            // eslint-disable-next-line func-name-matching
            get: function overwritingPropertyGetter() {
                // Setting the `ssfi` flag to `overwritingPropertyGetter` causes this
                // function to be the starting point for removing implementation frames
                // from the stack trace of a failed assertion.
                //
                // However, we only want to use this function as the starting point if
                // the `lockSsfi` flag isn't set and proxy protection is disabled.
                //
                // If the `lockSsfi` flag is set, then either this assertion has been
                // overwritten by another assertion, or this assertion is being invoked
                // from inside of another assertion. In the first case, the `ssfi` flag
                // has already been set by the overwriting assertion. In the second
                // case, the `ssfi` flag has already been set by the outer assertion.
                //
                // If proxy protection is enabled, then the `ssfi` flag has already been
                // set by the proxy getter.
                if (!isProxyEnabled() && !flag(this, "lockSsfi")) {
                    flag(this, "ssfi", overwritingPropertyGetter);
                }

                // Setting the `lockSsfi` flag to `true` prevents the overwritten
                // assertion from changing the `ssfi` flag. By this point, the `ssfi`
                // flag is already set to the correct starting point for this assertion.
                const origLockSsfi = flag(this, "lockSsfi");
                flag(this, "lockSsfi", true);
                const result = getter(_super).call(this);
                flag(this, "lockSsfi", origLockSsfi);

                // eslint-disable-next-line adone/no-undefined-comp
                if (result !== undefined) {
                    return result;
                }

                const newAssertion = new assertion.Assertion();
                transferFlags(this, newAssertion);
                return newAssertion;
            },
            configurable: true
        });
};
