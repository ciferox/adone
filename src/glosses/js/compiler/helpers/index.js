const { lazify } = adone;

const e = lazify({
    expressions: "./expressions"
}, null, require);

const helpers = {
    // expressions
    get(name) {
        const fn = e.expressions[name];
        if (!fn) {
            throw new ReferenceError(`Unknown helper ${name}`);
        }

        return fn().expression;
    }
};

export default helpers;

lazify({
    remapAsyncToGenerator: "./remap_async_to_generator",
    functionName: "./function_name",
    getFunctionArity: "./get_function_arity"
}, helpers, require);


// $FlowIgnore: strange behaviour with getters
Object.defineProperty(helpers, "list", {
    configurable: true,
    get: () => {
        const value = Object.keys(e.expressions)
            .map((name) => name.replace(/^_/, ""))
            .filter((name) => !["__esModule", "_filename__"].includes(name));

        Object.defineProperty(helpers, "list", {
            configurable: false,
            value
        });
        return value;
    }
});
