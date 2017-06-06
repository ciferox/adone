const { lazify } = adone;

const plugins = {
    syntax: lazify({
        asyncFunctions: "./syntax/async_functions",
        asyncGenerators: "./syntax/async_generators",
        classProperties: "./syntax/class_properties",
        decorators: "./syntax/decorators",
        flow: "./syntax/flow",
        functionBind: "./syntax/function_bind",
        objectRestSpread: "./syntax/object_rest_spread"
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
        importReplace: "./transform/import_replace"
    }, null, require)
};

lazify({
    externalHelpers: "./external_helpers"
}, plugins, require);

export default plugins;
