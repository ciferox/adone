const { is, assertion: $assert } = adone;
const { __: { util } } = $assert;

export default function overwriteChainableMethod(ctx, name, method, chainingBehavior) {
    const chainableBehavior = ctx.__methods[name];

    const _chainingBehavior = chainableBehavior.chainingBehavior;
    chainableBehavior.chainingBehavior = function overwriteChainableMethodGetter() {
        const result = chainingBehavior(_chainingBehavior).call(this);
        if (!is.undefined(result)) {
            return result;
        }

        const newAssertion = $assert.getAssertion();
        util.transferFlags(this, newAssertion);
        return newAssertion;
    };

    const _method = chainableBehavior.method;
    chainableBehavior.method = function overwriteChainableMethodWrapper(...args) {
        const result = method(_method).apply(this, args);
        if (!is.undefined(result)) {
            return result;
        }

        const newAssertion = $assert.getAssertion();
        util.transferFlags(this, newAssertion);
        return newAssertion;
    };
}
