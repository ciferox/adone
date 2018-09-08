export default adone.js.compiler.helper.pluginUtils.declare((api) => {
    api.assertVersion(7);

    return {
        manipulateOptions(opts, parserOpts) {
            parserOpts.plugins.push("numericSeparator");
        }
    };
});
