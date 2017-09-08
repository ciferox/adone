const { is, assertion: $assert, noop } = adone;
const { __: { util } } = $assert;

export default function addProperty(ctx, name, getter = noop) {
    Object.defineProperty(ctx, name, {
        // eslint-disable-next-line func-name-matching
        get: function propertyGetter() {
            // Setting the `ssfi` flag to `propertyGetter` causes this function to
            // be the starting point for removing implementation frames from the
            // stack trace of a failed assertion.
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
                util.flag(this, "ssfi", propertyGetter);
            }

            const result = getter.call(this);
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
