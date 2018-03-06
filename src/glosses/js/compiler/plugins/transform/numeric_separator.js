const {
    js: { compiler: { types: t, helper: { pluginUtils } } }
} = adone;

export default pluginUtils.declare((api) => {
    api.assertVersion(7);

    const replaceNumberArg = function ({ node }) {
        if (node.callee.name !== "Number") {
            return;
        }

        const arg = node.arguments[0];
        if (!t.isStringLiteral(arg)) {
            return;
        }

        arg.value = arg.value.replace(/_/g, "");
    };

    return {
        inherits: adone.js.compiler.plugin.syntax.numericSeparator,

        visitor: {
            CallExpression: replaceNumberArg,
            NewExpression: replaceNumberArg,
            NumericLiteral({ node }) {
                const { extra } = node;
                if (extra && /_/.test(extra.raw)) {
                    extra.raw = extra.raw.replace(/_/g, "");
                }
            }
        }
    };
});
