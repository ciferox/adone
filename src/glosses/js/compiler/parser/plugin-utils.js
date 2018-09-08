const {
    is
} = adone;

export const hasPlugin = (plugins, name) => plugins.some((plugin) => is.array(plugin) ? plugin[0] === name : plugin === name);

export const getPluginOption = function (plugins, name, option) {
    const plugin = plugins.find((plugin) => {
        if (is.array(plugin)) {
            return plugin[0] === name;
        }
        return plugin === name;
    });

    if (plugin && is.array(plugin)) {
        return plugin[1][option];
    }

    return null;
};

const PIPELINE_PROPOSALS = ["minimal"];

export const validatePlugins = function (plugins) {
    if (hasPlugin(plugins, "decorators")) {
        if (hasPlugin(plugins, "decorators-legacy")) {
            throw new Error(
                "Cannot use the decorators and decorators-legacy plugin together",
            );
        }
        const decoratorsBeforeExport = getPluginOption(
            plugins,
            "decorators",
            "decoratorsBeforeExport",
        );

        if (is.nil(decoratorsBeforeExport)) {
            throw new Error(
                "The 'decorators' plugin requires a" +
                " 'decoratorsBeforeExport' option, whose value must be a boolean.",
            );
        } else if (!is.boolean(decoratorsBeforeExport)) {
            throw new Error("'decoratorsBeforeExport' must be a boolean.");
        }
    }

    if (hasPlugin(plugins, "flow") && hasPlugin(plugins, "typescript")) {
        throw new Error("Cannot combine flow and typescript plugins.");
    }

    if (hasPlugin(plugins, "pipelineOperator") &&
        !PIPELINE_PROPOSALS.includes(getPluginOption(plugins, "pipelineOperator", "proposal"))) {
        throw new Error(
            `'pipelineOperator' requires 'proposal' option whose value should be one of: ${PIPELINE_PROPOSALS.join(", ")}`,
        );
    }
};

// These plugins are defined using a mixin which extends the parser class.

import estree from "./plugins/estree";
import flow from "./plugins/flow";
import jsx from "./plugins/jsx";
import typescript from "./plugins/typescript";

// NOTE: estree must load first; flow and typescript must load last.
export const mixinPluginNames = ["estree", "jsx", "flow", "typescript"];
export const mixinPlugins = {
    estree,
    jsx,
    flow,
    typescript
};
