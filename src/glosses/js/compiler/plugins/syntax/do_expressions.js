export default adone.js.compiler.helper.pluginUtils.declare((api) => {
    api.assertVersion(7);

    return {
        name: "syntax-do-expressions",

        manipulateOptions(opts, parserOpts) {
            parserOpts.plugins.push("doExpressions");
        }
    };
});
