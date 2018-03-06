const {
    js: { compiler: { helper: { pluginUtils } } }
} = adone;

export default pluginUtils.declare((api) => {
    api.assertVersion(7);

    return {
        manipulateOptions(opts, parserOpts) {
            parserOpts.plugins.push("objectRestSpread");
        }
    };
});
