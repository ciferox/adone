export default adone.js.compiler.helper.pluginUtils.declare((api) => {
    api.assertVersion(7);

    return {
        name: "syntax-dynamic-import",

        manipulateOptions(opts, parserOpts) {
            parserOpts.plugins.push("dynamicImport");
        }
    };
});
