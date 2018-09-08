const {
    is
} = adone;

export default adone.js.compiler.helper.pluginUtils.declare((api, options) => {
    api.assertVersion(7);

    const { legacy = false } = options;
    if (!is.boolean(legacy)) {
        throw new Error("'legacy' must be a boolean.");
    }

    if (legacy !== true) {
        throw new Error(
            "The new decorators proposal is not supported yet." +
            ' You must pass the `"legacy": true` option to' +
            " @babel/plugin-syntax-decorators",
        );
    }

    const { decoratorsBeforeExport } = options;
    if (is.undefined(decoratorsBeforeExport)) {
        if (!legacy) {
            throw new Error(
                "The '@babel/plugin-syntax-decorators' plugin requires a" +
                " 'decoratorsBeforeExport' option, whose value must be a boolean.",
            );
        }
    } else {
        if (legacy) {
            throw new Error(
                "'decoratorsBeforeExport' can't be used with legacy decorators.",
            );
        }
        if (!is.boolean(decoratorsBeforeExport)) {
            throw new Error("'decoratorsBeforeExport' must be a boolean.");
        }
    }

    return {
        manipulateOptions(opts, parserOpts) {
            parserOpts.plugins.push(
                legacy
                    ? "decorators-legacy"
                    : ["decorators", { decoratorsBeforeExport }],
            );
        }
    };
});
