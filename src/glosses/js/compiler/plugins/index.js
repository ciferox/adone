const { lazify } = adone;

const plugins = {
    check: lazify({
        constants: "./check/constants"
    }, null, require),
    syntax: lazify({
        asyncFunctions: "./syntax/async_functions",
        asyncGenerators: "./syntax/async_generators",
        classProperties: "./syntax/class_properties",
        decorators: "./syntax/decorators",
        flow: "./syntax/flow",
        functionBind: "./syntax/function_bind",
        objectRestSpread: "./syntax/object_rest_spread",
        // jsx: "./syntax/jsx"
        numericSeparator: "./syntax/numeric_separator",
        exponentiationOperator: "./syntax/exponentiation_operator"
    }, null, require),
    transform: lazify({
        asyncToGenerator: "./transform/async_to_generator",
        classProperties: "./transform/class_properties",
        decorators: "./transform/decorators",
        es2015ModulesCommonjs: "./transform/es2015_modules_commonjs",
        flowStripTypes: "./transform/flow_strip_types",
        functionBind: "./transform/function_bind",
        objectRestSpread: "./transform/object_rest_spread",
        strictMode: "./transform/strict_mode",
        importReplace: "./transform/import_replace",
        es2015Classes: "./transform/es2015_classes",
        es2015BlockScoping: "./transform/es2015_block_scoping",
        es2015ArrowFunctions: "./transform/es2015_arrow_functions",
        es2015ForOf: "./transform/es2015_for_of",
        es2015Parameters: "./transform/es2015_parameters",
        es2015Destructuring: "./transform/es2015_destructuring",
        es2015FunctionName: "./transform/es2015_function_name",
        es2015Spread: "./transform/es2015_spread",
        es2015ShorthandProperties: "./transform/es2015_shorthand_properties",
        es2015BlockScopedFunctions: "./transform/es2015_block_scoped_functions",
        es2015Instanceof: "./transform/es2015_instanceof",
        regenerator: "./transform/regenerator",
        runtime: "./transform/runtime",
        numericSeparator: "./transform/numeric_separator",
        exponentiationOperator: "./transform/exponentiation_operator"
        // templateLiterals: "./transform/template_literals",
        // reactJsx: "./transform/react_jsx",
        // reactDisplayName: "./transform/react_display_name",
    }, null, require)
};

lazify({
    externalHelpers: "./external_helpers"
}, plugins, require);

export default plugins;
