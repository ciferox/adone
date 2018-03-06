const {
    js: { compiler: { types: t, helper: { pluginUtils } } }
} = adone;

export default pluginUtils.declare((api) => {
    api.assertVersion(7);

    const statementList = function (key, path) {
        const paths = path.get(key);

        for (const path of paths) {
            const func = path.node;
            if (!path.isFunctionDeclaration()) {
                continue;
            }

            const declar = t.variableDeclaration("let", [
                t.variableDeclarator(func.id, t.toExpression(func))
            ]);

            // hoist it up above everything else
            declar._blockHoist = 2;

            // todo: name this
            func.id = null;

            path.replaceWith(declar);
        }
    };

    return {
        visitor: {
            BlockStatement(path) {
                const { node, parent } = path;
                if (
                    t.isFunction(parent, { body: node }) ||
                    t.isExportDeclaration(parent)
                ) {
                    return;
                }

                statementList("body", path);
            },

            SwitchCase(path) {
                statementList("consequent", path);
            }
        }
    };
});
