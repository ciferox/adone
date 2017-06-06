// This file contains methods that convert the path node into another node or some other type of data.

const { js: { compiler: { types: t } } } = adone;

export const toComputedKey = function () {
    const node = this.node;

    let key;
    if (this.isMemberExpression()) {
        key = node.property;
    } else if (this.isProperty() || this.isMethod()) {
        key = node.key;
    } else {
        throw new ReferenceError("todo");
    }

    if (!node.computed) {
        if (t.isIdentifier(key)) {
            key = t.stringLiteral(key.name);
        }
    }

    return key;
};

export const ensureBlock = function () {
    return t.ensureBlock(this.node);
};

export const arrowFunctionToShadowed = function () {
    // todo: maybe error
    if (!this.isArrowFunctionExpression()) {
        return;
    }

    this.ensureBlock();

    const { node } = this;
    node.expression = false;
    node.type = "FunctionExpression";
    node.shadow = node.shadow || true;
};
