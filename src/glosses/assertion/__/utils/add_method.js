const { is, assertion: $assert } = adone;
const { __: { util } } = $assert;

export default function addMethod(ctx, name, method) {
    const methodWrapper = function (...args) {
        // Setting the `ssfi` flag to `methodWrapper` causes this function to be the
        // starting point for removing implementation frames from the stack trace of
        // a failed assertion.
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
            util.flag(this, "ssfi", methodWrapper);
        }

        const result = method.apply(this, args);
        if (!is.undefined(result)) {
            return result;
        }

        const newAssertion = $assert.getAssertion();
        util.transferFlags(this, newAssertion);
        return newAssertion;
    };

    util.addLengthGuard(methodWrapper, name, false);
    ctx[name] = util.proxify(methodWrapper, name);
}
