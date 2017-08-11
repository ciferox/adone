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
        exponentiationOperator: "./syntax/exponentiation_operator",
        jsx: "./syntax/jsx"
    }, null, require),
    transform: lazify({
        asyncToGenerator: "./transform/async_to_generator",
        classProperties: "./transform/class_properties",
        decoratorsLegacy: "./transform/decorators_legacy",
        ESModules: "./transform/es_modules",
        flowStripTypes: "./transform/flow_strip_types",
        functionBind: "./transform/function_bind",
        objectRestSpread: "./transform/object_rest_spread",
        strictMode: "./transform/strict_mode",
        importReplace: "./transform/import_replace",
        arrowFunctions: "./transform/arrow_functions",
        parameters: "./transform/parameters",
        blockScoping: "./transform/block_scoping",
        destructuring: "./transform/destructuring",
        exponentiationOperator: "./transform/exponentiation_operator",
        classes: "./transform/classes",
        shorthandProperties: "./transform/shorthand_properties",
        forOf: "./transform/for_of",
        spread: "./transform/spread",
        templateLiterals: "./transform/template_literals",
        runtime: "./transform/runtime",
        regenerator: "./transform/regenerator",
        reactJsx: "./transform/react_jsx",
        reactDisplayName: "./transform/react_display_name",
        blockScopedFunctions: "./transform/block_scoped_functions",
        functionName: "./transform/function_name",
        decorators: "./transform/decorators"
    }, null, require)
};

lazify({
    externalHelpers: "./external_helpers"
}, plugins, require);

export default plugins;
