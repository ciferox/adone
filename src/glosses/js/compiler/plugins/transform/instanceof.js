const {
    js: { compiler: { types: t, helper: { pluginUtils } } }
} = adone;

export default pluginUtils.declare((api) => {
    api.assertVersion(7);

    return {
        visitor: {
            BinaryExpression(path) {
                const { node } = path;
                if (node.operator === "instanceof") {
                    const helper = this.addHelper("instanceof");
                    const isUnderHelper = path.findParent((path) => {
                        return (
                            (path.isVariableDeclarator() && path.node.id === helper) ||
                            (path.isFunctionDeclaration() &&
                                path.node.id &&
                                path.node.id.name === helper.name)
                        );
                    });

                    if (isUnderHelper) {

                    } else {
                        path.replaceWith(t.callExpression(helper, [node.left, node.right]));
                    }
                }
            }
        }
    };
});
