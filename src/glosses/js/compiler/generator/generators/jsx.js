
export const JSXAttribute = function (node) {
    this.print(node.name, node);
    if (node.value) {
        this.token("=");
        this.print(node.value, node);
    }
};

export const JSXIdentifier = function (node) {
    this.word(node.name);
};

export const JSXNamespacedName = function (node) {
    this.print(node.namespace, node);
    this.token(":");
    this.print(node.name, node);
};

export const JSXMemberExpression = function (node) {
    this.print(node.object, node);
    this.token(".");
    this.print(node.property, node);
};

export const JSXSpreadAttribute = function (node) {
    this.token("{");
    this.token("...");
    this.print(node.argument, node);
    this.token("}");
};

export const JSXExpressionContainer = function (node) {
    this.token("{");
    this.print(node.expression, node);
    this.token("}");
};

export const JSXSpreadChild = function (node) {
    this.token("{");
    this.token("...");
    this.print(node.expression, node);
    this.token("}");
};

export const JSXText = function (node) {
    this.token(node.value);
};

export const JSXElement = function (node) {
    const open = node.openingElement;
    this.print(open, node);
    if (open.selfClosing) {
        return;
    }

    this.indent();
    for (const child of node.children) {
        this.print(child, node);
    }
    this.dedent();

    this.print(node.closingElement, node);
};

const spaceSeparator = function () {
    this.space();
};

export const JSXOpeningElement = function (node) {
    this.token("<");
    this.print(node.name, node);
    if (node.attributes.length > 0) {
        this.space();
        this.printJoin(node.attributes, node, { separator: spaceSeparator });
    }
    if (node.selfClosing) {
        this.space();
        this.token("/>");
    } else {
        this.token(">");
    }
};

export const JSXClosingElement = function (node) {
    this.token("</");
    this.print(node.name, node);
    this.token(">");
};

export const JSXEmptyExpression = function () { };
