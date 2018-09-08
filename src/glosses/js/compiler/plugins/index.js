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
        exponentiationOperator: "./syntax/exponentiation_operator",
        exportNamespaceFrom: "./syntax/export_namespace_from",
        dynamicImport: "./syntax/dynamic_import"
    }, null, require),
    transform: lazify({
        asyncToGenerator: "./transform/async_to_generator",
        classProperties: "./transform/class_properties",
        decorators: "./transform/decorators",
        modulesCommonjs: "./transform/modules_commonjs",
        flowStripTypes: "./transform/flow_strip_types",
        functionBind: "./transform/function_bind",
        objectRestSpread: "./transform/object_rest_spread",
        strictMode: "./transform/strict_mode",
        importReplace: "./transform/import_replace",
        classes: "./transform/classes",
        blockScoping: "./transform/block_scoping",
        arrowFunctions: "./transform/arrow_functions",
        forOf: "./transform/for_of",
        parameters: "./transform/parameters",
        destructuring: "./transform/destructuring",
        functionName: "./transform/function_name",
        spread: "./transform/spread",
        shorthandProperties: "./transform/shorthand_properties",
        blockScopedFunctions: "./transform/block_scoped_functions",
        instanceof: "./transform/instanceof",
        regenerator: "./transform/regenerator",
        runtime: "./transform/runtime",
        numericSeparator: "./transform/numeric_separator",
        exponentiationOperator: "./transform/exponentiation_operator",
        exportNamespaceFrom: "./transform/export_namespace_from"
        // templateLiterals: "./transform/template_literals",
        // reactJsx: "./transform/react_jsx",
        // reactDisplayName: "./transform/react_display_name",
    }, null, require)
};

lazify({
    externalHelpers: "./external_helpers"
}, plugins, require);

export default plugins;
