import {
    hasPlugin,
    validatePlugins,
    mixinPluginNames,
    mixinPlugins
} from "./plugin-utils";
import Parser from "./parser";

import { types as tokTypes } from "./tokenizer/types";
import "./tokenizer/context";

const getParser = function (options, input) {
    let cls = Parser;
    if (options && options.plugins) {
        validatePlugins(options.plugins);
        cls = getParserClass(options.plugins);
    }

    return new cls(options, input);
};

export const parse = function (input, options) {
    if (options && options.sourceType === "unambiguous") {
        options = {
            ...options
        };
        try {
            options.sourceType = "module";
            const parser = getParser(options, input);
            const ast = parser.parse();

            // Rather than try to parse as a script first, we opt to parse as a module and convert back
            // to a script where possible to avoid having to do a full re-parse of the input content.
            if (!parser.sawUnambiguousESM) {
                ast.program.sourceType = "script";
            }
            return ast;
        } catch (moduleError) {
            try {
                options.sourceType = "script";
                return getParser(options, input).parse();
            } catch (scriptError) {
                //
            }

            throw moduleError;
        }
    } else {
        return getParser(options, input).parse();
    }
};

export const parseExpression = function (input, options) {
    const parser = getParser(options, input);
    if (parser.options.strictMode) {
        parser.state.strict = true;
    }
    return parser.getExpression();
};

export { tokTypes };

const parserClassCache = {};

/**
 *  Get a Parser class with plugins applied.
 */
function getParserClass(pluginsFromOptions: PluginList): Class<Parser> {
    const pluginList = mixinPluginNames.filter((name) =>
        hasPlugin(pluginsFromOptions, name),
    );

    const key = pluginList.join("/");
    let cls = parserClassCache[key];
    if (!cls) {
        cls = Parser;
        for (const plugin of pluginList) {
            cls = mixinPlugins[plugin](cls);
        }
        parserClassCache[key] = cls;
    }
    return cls;
}
