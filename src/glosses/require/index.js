const plugins = [
    // "syntax.asyncGenerators",
    // "transform.flowStripTypes",
    // ["transform.decorators", {
    //     legacy: true
    // }],
    // ["transform.classProperties", { loose: true }],
    // "transform.asyncGeneratorFunctions",
    "transform.modulesCommonjs",
    // "transform.functionBind",
    // "transform.objectRestSpread",
    // "transform.numericSeparator",
    // "transform.exponentiationOperator",
    // "transform.exportNamespaceFrom"
];
// if (process.env.ADONE_COVERAGE) {
//     plugins.unshift(
//         "syntax.flow",
//         "syntax.decorators",
//         "syntax.classProperties",
//         "syntax.objectRestSpread",
//         "syntax.functionBind",
//         "syntax.numericSeparator",
//         "syntax.exponentiationOperator",
//         "syntax.exportNamespaceFrom",
//         "syntax.optionalCatchBinding",
//         adone.js.coverage.plugin
//     );
// }
const options = {
    compact: false,
    only: [/\.js$/],
    sourceMaps: "inline",
    plugins
};
const module = new adone.js.Module(require.main ? require.main.filename : adone.std.path.join(process.cwd(), "index.js"), {
    transform: adone.js.Module.transforms.transpile(options)
});
const $require = (path, { transpile = true, cache = true } = {}) => module.require(path, {
    transform: transpile ? module.transform : null,
    cache
});
$require.cache = module.cache;
$require.main = module;
$require.options = options;
$require.resolve = (request) => adone.js.Module._resolveFilename(request, module);
$require.unref = module.cache.unref.bind(module.cache);

export default $require;
