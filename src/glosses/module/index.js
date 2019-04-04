adone.lazify({
    getParentPath: "./get_parent_path",
    Module: "./module",
    resolve: "./resolve"
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
