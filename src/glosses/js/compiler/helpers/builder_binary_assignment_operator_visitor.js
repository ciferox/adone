const { js: { compiler: { types: t, helpers: { explodeAssignableExpression: explode } } } } = adone;

export default function (opts) {
    const visitor = {};

    const isAssignment = (node) => node && node.operator === `${opts.operator}=`;

    const buildAssignment = (left, right) => t.assignmentExpression("=", left, right);

    visitor.ExpressionStatement = function (path, file) {
        // hit the `AssignmentExpression` one below
        if (path.isCompletionRecord()) {
            return;
        }

        const expr = path.node.expression;
        if (!isAssignment(expr)) {
            return;
        }

        const nodes = [];
        const exploded = explode(expr.left, nodes, file, path.scope, true);

        nodes.push(t.expressionStatement(
            buildAssignment(exploded.ref, opts.build(exploded.uid, expr.right))
        ));

        path.replaceWithMultiple(nodes);
    };

    visitor.AssignmentExpression = function (path, file) {
        const { node, scope } = path;
        if (!isAssignment(node)) {
            return;
        }

        const nodes = [];
        const exploded = explode(node.left, nodes, file, scope);
        nodes.push(buildAssignment(exploded.ref, opts.build(exploded.uid, node.right)));
        path.replaceWithMultiple(nodes);
    };

    visitor.BinaryExpression = function (path) {
        const { node } = path;
        if (node.operator === opts.operator) {
            path.replaceWith(opts.build(node.left, node.right));
        }
    };

    return visitor;
}
