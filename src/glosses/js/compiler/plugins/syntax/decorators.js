const {
    is,
    js: { compiler: { helper: { pluginUtils: { declare } } } }
} = adone;

export default declare((api, options) => {
    api.assertVersion(7);

    const { legacy = false } = options;
    if (!is.boolean(legacy)) {
        throw new Error("'legacy' must be a boolean.");
    }

    return {
        manipulateOptions(opts, parserOpts) {
            parserOpts.plugins.push(legacy ? "decorators" : "decorators2");
        }
    };
});
