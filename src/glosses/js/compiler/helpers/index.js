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
    getFunctionArity: "./get_function_arity",
    callDelegate: "./call_delegate",
    hoistVariables: "./hoist_variables",
    explodeAssignableExpression: "./explode_assignable_expression",
    builderBinaryAssignmentOperatorVisitor: "./builder_binary_assignment_operator_visitor",
    optimiseCallExpression: "./optimise_call_expression",
    ReplaceSupers: "./replace_supers",
    defineMap: "./define_map"
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
