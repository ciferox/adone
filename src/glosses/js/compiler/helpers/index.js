import adone from "adone";

// @flow

const e = adone.lazify({
    expressions: "./expressions"
}, null, require);

const helpers = {
    // expressions
    get(name: string) {
        const fn = e.expressions[name];
        if (!fn) {
            throw new ReferenceError(`Unknown helper ${name}`);
        }

        return fn().expression;
    }
};

export default helpers;

adone.lazify({
    remapAsyncToGenerator: "./remap_async_to_generator",
    functionName: "./function_name",
    getFunctionArity: "./get_function_arity"
}, helpers, require);


// $FlowIgnore: strange behaviour with getters
Object.defineProperty(helpers, "list", {
    configurable: true,
    get: () => {
        const value = Object.keys(e.expressions).map((name) => name.replace(/^_/, "")).filter((name) => !["__esModule", "_filename__"].includes(name));
        // $FlowIgnore: "list" is not defined yet
        Object.defineProperty(helpers, "list", {
            configurable: false,
            value
        });
        return value;
    }
});
