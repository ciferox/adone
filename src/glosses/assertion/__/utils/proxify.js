const {
    is,
    assertion: $assert
} = adone;
const {
    config, __: {
        util
    }
} = $assert;

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

                // If the property is reasonably close to an existing Chai property,
                // suggest that property to the user. Only suggest properties with a
                // distance less than 4.
                let suggestion = null;
                let suggestionDistance = 4;
                util.getProperties(target).forEach((prop) => {
                    if (
                        !Object.prototype.hasOwnProperty(prop)
                        && builtins.indexOf(prop) === -1
                    ) {
                        const dist = adone.text.stringDistanceCapped(
                            property,
                            prop,
                            suggestionDistance
                        );
                        if (dist < suggestionDistance) {
                            suggestion = prop;
                            suggestionDistance = dist;
                        }
                    }
                });

                if (!is.null(suggestion)) {
                    throw Error(`Invalid property: ${property}. Did you mean "${suggestion}"?`);
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

