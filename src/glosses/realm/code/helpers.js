const {
    is,
    js: { compiler: { types: t } }
} = adone;

export const getMemberExpressionName = (node) => {
    let prefix;

    if (t.isMemberExpression(node.object)) {
        prefix = getMemberExpressionName(node.object);
    } else if (t.isIdentifier(node.object) && t.isIdentifier(node.property)) {
        return `${node.object.name}.${node.property.name}`;
    }

    return is.undefined(prefix)
        ? node.property.name
        : `${prefix}.${node.property.name}`;
};
