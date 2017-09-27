export default function ({ types: t }) {
    return {
        inherits: adone.js.compiler.plugin.syntax.exponentiationOperator,

        visitor: adone.js.compiler.helper.builderBinaryAssignmentOperatorVisitor({
            operator: "**",

            build(left, right) {
                return t.callExpression(
                    t.memberExpression(t.identifier("Math"), t.identifier("pow")),
                    [left, right],
                );
            }
        })
    };
}
