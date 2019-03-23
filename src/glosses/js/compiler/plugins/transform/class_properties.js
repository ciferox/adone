const {
    js: { compiler: { helper: { pluginUtils: { declare }, createClassFeaturesPlugin: { createClassFeaturePlugin, FEATURES } } } }
} = adone;

export default declare((api, options) => {
    api.assertVersion(7);

    return createClassFeaturePlugin({
        name: "proposal-class-properties",

        feature: FEATURES.fields,
        loose: options.loose,

        manipulateOptions(opts, parserOpts) {
            parserOpts.plugins.push("classProperties", "classPrivateProperties");
        }
    });
});
