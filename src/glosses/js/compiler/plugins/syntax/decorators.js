const {
    is
} = adone;

export default adone.js.compiler.helper.pluginUtils.declare((api, options) => {
    api.assertVersion(7);

    const { legacy = false } = options;
    if (!is.boolean(legacy)) {
        throw new Error("'legacy' must be a boolean.");
    }

    const { decoratorsBeforeExport } = options;
    if (is.undefined(decoratorsBeforeExport)) {
        if (!legacy) {
            throw new Error(
                "The '@babel/plugin-syntax-decorators' plugin requires a" +
                " 'decoratorsBeforeExport' option, whose value must be a boolean." +
                " If you want to use the legacy decorators semantics, you can set" +
                " the 'legacy: true' option.",
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
        name: "syntax-decorators",

        manipulateOptions(opts, parserOpts) {
            parserOpts.plugins.push(
                legacy
                    ? "decorators-legacy"
                    : ["decorators", { decoratorsBeforeExport }],
            );
        }
    };
});
