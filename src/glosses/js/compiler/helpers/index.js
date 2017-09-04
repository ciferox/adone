import helpers from "./common_helpers";

adone.lazify({
    getFunctionArity: "./get_function_arity",
    functionName: "./function_name",
    remapAsyncToGenerator: "./remap_async_to_generator",
    callDelegate: "./call_delegate",
    hoistVariables: "./hoist_variables",
    // explodeAssignableExpression: "./explode_assignable_expression",
    // builderBinaryAssignmentOperatorVisitor: "./builder_binary_assignment_operator_visitor",
    optimiseCallExpression: "./optimise_call_expression",
    ReplaceSupers: "./replace_supers",
    defineMap: "./define_map",
    wrapFunction: "./wrap_function",
    // builderReactJsx: "./builder_react_jsx"
}, exports, require);


export const get = (name) => {
    const fn = helpers[name];
    if (!fn) { 
        throw new ReferenceError(`Unknown helper ${name}`); 
    }

    return fn().expression;
};

export const list = Object.keys(helpers).map((name) => name.replace(/^_/, "")).filter((name) => name !== "__esModule");
