const { is, assertion: $assert } = adone;
const { __: { util } } = $assert;

export default function overwriteProperty(ctx, name, getter) {
    const _get = Object.getOwnPropertyDescriptor(ctx, name);
    let _super = function () { };

    if (_get && adone.is.function(_get.get)) {
        _super = _get.get;
    }


    Object.defineProperty(ctx, name, {
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
            if (!util.isProxyEnabled() && !util.flag(this, "lockSsfi")) {
                util.flag(this, "ssfi", overwritingPropertyGetter);
            }

            // Setting the `lockSsfi` flag to `true` prevents the overwritten
            // assertion from changing the `ssfi` flag. By this point, the `ssfi`
            // flag is already set to the correct starting point for this assertion.
            const origLockSsfi = util.flag(this, "lockSsfi");
            util.flag(this, "lockSsfi", true);
            const result = getter(_super).call(this);
            util.flag(this, "lockSsfi", origLockSsfi);

            if (!is.undefined(result)) {
                return result;
            }

            const newAssertion = $assert.getAssertion();
            util.transferFlags(this, newAssertion);
            return newAssertion;
        },
        configurable: true
    });
}
