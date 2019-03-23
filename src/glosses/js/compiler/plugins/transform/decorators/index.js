const {
    is,
    js: { compiler: { helper: { pluginUtils: { declare }, createClassFeaturesPlugin: { createClassFeaturePlugin, FEATURES } } } }
} = adone;

import legacyVisitor from "./transformer-legacy";

export default declare((api, options) => {
    api.assertVersion(7);

    const { legacy = false } = options;
    if (!is.boolean(legacy)) {
        throw new Error("'legacy' must be a boolean.");
    }

    const { decoratorsBeforeExport } = options;
    if (is.undefined(decoratorsBeforeExport)) {
        if (!legacy) {
            throw new Error(
                "The decorators plugin requires a 'decoratorsBeforeExport' option," +
                " whose value must be a boolean. If you want to use the legacy" +
                " decorators semantics, you can set the 'legacy: true' option.",
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

    if (legacy) {
        return {
            name: "proposal-decorators",
            inherits: adone.js.compiler.plugin.syntax.decorators,
            manipulateOptions({ generatorOpts }) {
                generatorOpts.decoratorsBeforeExport = decoratorsBeforeExport;
            },
            visitor: legacyVisitor
        };
    }

    return createClassFeaturePlugin({
        name: "proposal-decorators",

        feature: FEATURES.decorators,
        // loose: options.loose, Not supported

        manipulateOptions({ generatorOpts, parserOpts }) {
            parserOpts.plugins.push(["decorators", { decoratorsBeforeExport }]);
            generatorOpts.decoratorsBeforeExport = decoratorsBeforeExport;
        }
    });
});
