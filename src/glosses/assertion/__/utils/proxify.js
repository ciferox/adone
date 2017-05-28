const { assertion: $assert } = adone;
const { config, __: { util } } = $assert;

const builtins = ["__flags", "__methods", "_obj", "assert"];

export default function proxify(obj, nonChainableMethodName) {
    if (!util.isProxyEnabled()) {
        return obj;
    }
    return new Proxy(obj, {
        // eslint-disable-next-line func-name-matching
        get: function proxyGetter(target, property) {
            // This check is here because we should not throw errors on Symbol properties
            // such as `Symbol.toStringTag`.
            // The values for which an error should be thrown can be configured using
            // the `config.proxyExcludedKeys` setting.
            if (adone.is.string(property) && config.proxyExcludedKeys.indexOf(property) === -1 &&
                !Reflect.has(target, property)) {
                // Special message for invalid property access of non-chainable methods.
                if (nonChainableMethodName) {
                    throw Error(`Invalid property: ${nonChainableMethodName}.${property}. See docs for proper usage of "${nonChainableMethodName}".`);
                }

                const orderedProperties = util.getProperties(target).filter((property) => {
                    return !Object.prototype.hasOwnProperty(property) &&
                        builtins.indexOf(property) === -1;
                }).sort((a, b) => {
                    return adone.text.stringDistance(property, a) - adone.text.stringDistance(property, b);
                });

                if (orderedProperties.length && adone.text.stringDistance(orderedProperties[0], property) < 4) {
                    // If the property is reasonably close to an existing property,
                    // suggest that property to the user.
                    throw Error(`Invalid property: ${property}. Did you mean "${orderedProperties[0]}"?`);
                } else {
                    throw Error(`Invalid property: ${property}`);
                }
            }

            // Use this proxy getter as the starting point for removing implementation
            // frames from the stack trace of a failed assertion. For property
            // assertions, this prevents the proxy getter from showing up in the stack
            // trace since it's invoked before the property getter. For method and
            // chainable method assertions, this flag will end up getting changed to
            // the method wrapper, which is good since this frame will no longer be in
            // the stack once the method is invoked. Note that Chai builtin assertion
            // properties such as `__flags` are skipped since this is only meant to
            // capture the starting point of an assertion. This step is also skipped
            // if the `lockSsfi` flag is set, thus indicating that this assertion is
            // being called from within another assertion. In that case, the `ssfi`
            // flag is already set to the outer assertion's starting point.
            if (builtins.indexOf(property) === -1 && !util.flag(target, "lockSsfi")) {
                util.flag(target, "ssfi", proxyGetter);
            }

            return Reflect.get(target, property);
        }
    });
}

