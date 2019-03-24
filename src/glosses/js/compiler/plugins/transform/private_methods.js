const {
    js: { compiler: { helper: { pluginUtils: { declare }, createClassFeaturesPlugin: { createClassFeaturePlugin, FEATURES } } } }
} = adone;

export default declare((api, options) => {
    api.assertVersion(7);

    return createClassFeaturePlugin({
        name: "proposal-private-methods",

        feature: FEATURES.privateMethods,
        loose: options.loose,

        manipulateOptions(opts, parserOpts) {
            parserOpts.plugins.push("classPrivateMethods");
        }
    });
});
