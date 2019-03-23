export default adone.js.compiler.helper.pluginUtils.declare((api) => {
    api.assertVersion(7);

    return {
        name: "syntax-class-properties",

        manipulateOptions(opts, parserOpts) {
            parserOpts.plugins.push(
                "classProperties",
                "classPrivateProperties",
                "classPrivateMethods",
            );
        }
    };
});
