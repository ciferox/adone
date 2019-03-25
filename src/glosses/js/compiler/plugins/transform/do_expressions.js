const {
    js: { compiler: { helper: { pluginUtils: { declare } } } }
} = adone;

export default declare((api) => {
    api.assertVersion(7);

    return {
        name: "proposal-do-expressions",
        inherits: adone.js.compiler.plugin.syntax.doExpressions,

        visitor: {
            DoExpression: {
                exit(path) {
                    const body = path.node.body.body;
                    if (body.length) {
                        path.replaceExpressionWithStatements(body);
                    } else {
                        path.replaceWith(path.scope.buildUndefinedNode());
                    }
                }
            }
        }
    };
});
