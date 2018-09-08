import visitor from "./transformer";
import legacyVisitor from "./transformer-legacy";

const {
    is,
    js: { compiler: { helper: { pluginUtils: { declare } } } }
} = adone;

export default declare((api, options) => {
    api.assertVersion(7);

    const { legacy = false, decoratorsBeforeExport } = options;
    if (!is.boolean(legacy)) {
        throw new Error("'legacy' must be a boolean.");
    }

    if (legacy !== true) {
        throw new Error(
            "The new decorators proposal is not supported yet." +
            ' You must pass the `"legacy": true` option to' +
            " @babel/plugin-proposal-decorators",
        );
    }
    if (!is.undefined(decoratorsBeforeExport)) {
        if (legacy && decoratorsBeforeExport) {
            throw new Error(
                "'decoratorsBeforeExport' can't be used with legacy decorators.",
            );
        }
        if (!is.boolean(decoratorsBeforeExport)) {
            throw new Error("'decoratorsBeforeExport' must be a boolean.");
        }
    }

    return {
        inherits: adone.js.compiler.plugin.syntax.decorators,

        manipulateOptions({ generatorOpts }) {
            generatorOpts.decoratorsBeforeExport = decoratorsBeforeExport;
        },

        visitor: legacy ? legacyVisitor : visitor
    };
});
