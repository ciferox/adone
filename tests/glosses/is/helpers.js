const { is } = adone;

export const test = (predicate, options) => {
    const args = options.args || [];
    args.unshift(null);
    if (options.valid) {
        options.valid.forEach((valid) => {
            args[0] = valid;
            if (is[predicate](...args) !== true) {
                const warning = `is.${predicate}(${args.join(", ")}) failed but should have passed`;
                throw new Error(warning);
            }
        });
    }
    if (options.invalid) {
        options.invalid.forEach((invalid) => {
            args[0] = invalid;
            if (is[predicate](...args) !== false) {
                const warning = `is.${predicate}(${args.join(", ")}) passed but should have failed`;
                throw new Error(warning);
            }
        });
    }
};
