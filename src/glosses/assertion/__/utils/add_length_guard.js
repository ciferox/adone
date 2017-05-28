const fnLengthDesc = Object.getOwnPropertyDescriptor(() => {}, "length");

export default function addLengthGuard(fn, assertionName, isChainable) {
    if (!fnLengthDesc.configurable) {
        return fn;
    }

    Object.defineProperty(fn, "length", {
        get() {
            if (isChainable) {
                throw Error(`Invalid property: ${assertionName}.length. Due to a compatibility issue, "length" cannot directly follow "${assertionName}". Use "${assertionName}.lengthOf" instead.`);
            }

            throw Error(`Invalid property: ${assertionName}.length. See docs for proper usage of "${assertionName}".`);
        }
    });

    return fn;
}
