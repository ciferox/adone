const {
    js: { compiler: { helper: { pluginUtils: { declare } } } }
} = adone;

export default declare((api) => {
    api.assertVersion(7);

    return {
        manipulateOptions(opts, parserOpts) {
            parserOpts.plugins.push("classProperties", "classPrivateProperties");
        }
    };
});
