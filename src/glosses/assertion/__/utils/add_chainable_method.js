const { is, assertion: $assert } = adone;
const { __: { util } } = $assert;
const call = Function.prototype.call;
const apply = Function.prototype.apply;

export default function addChainableMethod(ctx, name, method, chainingBehavior) {
    if (!is.function(chainingBehavior)) {
        chainingBehavior = function () { };
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
        // eslint-disable-next-line func-name-matching
        get: function chainableMethodGetter() {
            chainableBehavior.chainingBehavior.call(this);

            const chainableMethodWrapper = function (...args) {
                // Setting the `ssfi` flag to `chainableMethodWrapper` causes this
                // function to be the starting point for removing implementation
                // frames from the stack trace of a failed assertion.
                //
                // However, we only want to use this function as the starting point if
                // the `lockSsfi` flag isn't set.
                //
                // If the `lockSsfi` flag is set, then this assertion is being
                // invoked from inside of another assertion. In this case, the `ssfi`
                // flag has already been set by the outer assertion.
                //
                // Note that overwriting a chainable method merely replaces the saved
                // methods in `ctx.__methods` instead of completely replacing the
                // overwritten assertion. Therefore, an overwriting assertion won't
                // set the `ssfi` or `lockSsfi` flags.
                if (!util.flag(this, "lockSsfi")) {
                    util.flag(this, "ssfi", chainableMethodWrapper);
                }

                const result = chainableBehavior.method.apply(this, args);
                if (!is.undefined(result)) {
                    return result;
                }

                const newAssertion = $assert.getAssertion();
                util.transferFlags(this, newAssertion);
                return newAssertion;
            };

            util.addLengthGuard(chainableMethodWrapper, name, true);

            // Inherit all properties from the object by replacing the `Function` prototype
            const prototype = Object.create(this);
            // Restore the `call` and `apply` methods from `Function`
            prototype.call = call;
            prototype.apply = apply;
            Object.setPrototypeOf(chainableMethodWrapper, prototype);

            util.transferFlags(this, chainableMethodWrapper);
            return util.proxify(chainableMethodWrapper);
        },
        configurable: true
    });
}
