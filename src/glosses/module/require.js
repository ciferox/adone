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

const mod = new adone.module.Module(require.main ? require.main.filename : adone.path.join(process.cwd(), "index.js"), {
    transforms: [
        adone.module.transform.compiler()
    ]
});
const $require = (path) => mod.require(path);
$require.cache = mod.cache;
$require.main = mod;
$require.resolve = (request) => adone.module.Module._resolveFilename(request, mod);
$require.uncache = (id) => mod.uncache(id);

export default $require;
