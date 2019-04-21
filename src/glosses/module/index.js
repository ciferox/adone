adone.lazify({
    getParentPath: "./get_parent_path",
    Module: "./module",
    require: "./require",
    requireAddon: "./require_addon",
    resolve: "./resolve",
    transform: "./transforms"
}, adone.asNamespace(exports), require);

export const COMPILER_PLUGINS = [
    "transform.flowStripTypes",
    ["transform.decorators", { legacy: true }],
    ["transform.classProperties", { loose: true }],
    ["transform.privateMethods", { loose: true }],
    "transform.doExpressions",
    "transform.exportDefaultFrom",
    "transform.partialApplication",
    "transform.modulesCommonjs",
    "transform.numericSeparator"
];
