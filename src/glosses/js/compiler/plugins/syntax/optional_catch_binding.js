export default adone.js.compiler.helper.pluginUtils.declare((api) => {
    api.assertVersion(7);

    return {
        name: "syntax-optional-catch-binding",

        manipulateOptions(opts, parserOpts) {
            parserOpts.plugins.push("optionalCatchBinding");
        }
    };
});
