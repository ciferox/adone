const {
    js: { compiler: { types: t } }
} = adone;

export default function (
    decorators: Array<Object>,
    scope,
): Array<Object> {
    for (const decorator of decorators) {
        const expression = decorator.expression;
        if (!t.isMemberExpression(expression)) {
            continue;
        }

        const temp = scope.maybeGenerateMemoised(expression.object);
        let ref;

        const nodes = [];

        if (temp) {
            ref = temp;
            nodes.push(t.assignmentExpression("=", temp, expression.object));
        } else {
            ref = expression.object;
        }

        nodes.push(
            t.callExpression(
                t.memberExpression(
                    t.memberExpression(ref, expression.property, expression.computed),
                    t.identifier("bind"),
                ),
                [ref],
            ),
        );

        if (nodes.length === 1) {
            decorator.expression = nodes[0];
        } else {
            decorator.expression = t.sequenceExpression(nodes);
        }
    }

    return decorators;
}
