const { js: { compiler: { types: t } } } = adone;

export default function (callee, thisNode, args) {
    if (args.length === 1 && t.isSpreadElement(args[0]) &&
        t.isIdentifier(args[0].argument, { name: "arguments" })) {
        // eg. super(...arguments);
        return t.callExpression(
            t.memberExpression(callee, t.identifier("apply")),
            [thisNode, args[0].argument]
        );
    }
    return t.callExpression(
        t.memberExpression(callee, t.identifier("call")),
        [thisNode, ...args]
    );
}
