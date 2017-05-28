const { is, assertion: $assert } = adone;
const { __: { util } } = $assert;

export default function overwriteMethod(ctx, name, method) {
    const _method = ctx[name];
    let _super = function () {
        throw new Error(`${name} is not a function`);
    };

    if (_method && is.function(_method)) {
        _super = _method;
    }

    const overwritingMethodWrapper = function (...args) {
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
        if (!util.flag(this, "lockSsfi")) {
            util.flag(this, "ssfi", overwritingMethodWrapper);
        }

        // Setting the `lockSsfi` flag to `true` prevents the overwritten assertion
        // from changing the `ssfi` flag. By this point, the `ssfi` flag is already
        // set to the correct starting point for this assertion.
        const origLockSsfi = util.flag(this, "lockSsfi");
        util.flag(this, "lockSsfi", true);
        const result = method(_super).apply(this, args);
        util.flag(this, "lockSsfi", origLockSsfi);

        if (!is.undefined(result)) {
            return result;
        }

        const newAssertion = $assert.getAssertion();
        util.transferFlags(this, newAssertion);
        return newAssertion;
    };

    util.addLengthGuard(overwritingMethodWrapper, name, false);
    ctx[name] = util.proxify(overwritingMethodWrapper, name);
}
