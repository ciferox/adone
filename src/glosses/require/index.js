const {
    module
} = adone;

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
    plugins: module.COMPILER_PLUGINS
};
const mod = new adone.module.Module(require.main ? require.main.filename : adone.std.path.join(process.cwd(), "index.js"), {
    transform: adone.module.Module.transforms.transpile(options)
});
const $require = (path, { transpile = true } = {}) => mod.require(path, {
    transform: transpile ? mod.transform : null
});
$require.cache = mod.cache;
$require.main = mod;
$require.options = options;
$require.resolve = (request) => adone.module.Module._resolveFilename(request, mod);
// $require.unref = module.cache.unref.bind(module.cache);

export default $require;
