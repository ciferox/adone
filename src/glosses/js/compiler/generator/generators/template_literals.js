export const TaggedTemplateExpression = function (node) {
    this.print(node.tag, node);
    this.print(node.quasi, node);
};

export const TemplateElement = function (node, parent) {
    const isFirst = parent.quasis[0] === node;
    const isLast = parent.quasis[parent.quasis.length - 1] === node;

    const value = (isFirst ? "`" : "}") + node.value.raw + (isLast ? "`" : "${");

    this.token(value);
};

export const TemplateLiteral = function (node) {
    const quasis = node.quasis;

    for (let i = 0; i < quasis.length; i++) {
        this.print(quasis[i], node);

        if (i + 1 < quasis.length) {
            this.print(node.expressions[i], node);
        }
    }
};
