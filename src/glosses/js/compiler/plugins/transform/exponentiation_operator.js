const {
    js: { compiler: { types: t, helper: { pluginUtils, builderBinaryAssignmentOperatorVisitor } } }
} = adone;

export default pluginUtils.declare((api) => {
    api.assertVersion(7);

    return {
        visitor: builderBinaryAssignmentOperatorVisitor({
            operator: "**",

            build(left, right) {
                return t.callExpression(
                    t.memberExpression(t.identifier("Math"), t.identifier("pow")),
                    [left, right],
                );
            }
        })
    };
});
