export default adone.js.compiler.helper.pluginUtils.declare((api) => {
    api.assertVersion(7);

    return {
        name: "syntax-numeric-separator",

        manipulateOptions(opts, parserOpts) {
            parserOpts.plugins.push("numericSeparator");
        }
    };
});
