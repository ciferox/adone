const { js: { compiler: { types } } } = adone;

const PRECEDENCE = {
    "||": 0,
    "&&": 1,
    "|": 2,
    "^": 3,
    "&": 4,
    "==": 5,
    "===": 5,
    "!=": 5,
    "!==": 5,
    "<": 6,
    ">": 6,
    "<=": 6,
    ">=": 6,
    in: 6,
    instanceof: 6,
    ">>": 7,
    "<<": 7,
    ">>>": 7,
    "+": 8,
    "-": 8,
    "*": 9,
    "/": 9,
    "%": 9,
    "**": 10
};

export const NullableTypeAnnotation = (node, parent) => {
    return types.isArrayTypeAnnotation(parent);
};

export { NullableTypeAnnotation as FunctionTypeAnnotation };

export const UpdateExpression = (node, parent) => {
    // (foo++).test()
    return types.isMemberExpression(parent) && parent.object === node;
};

const isFirstInStatement = (printStack, {
    considerArrow = false,
    considerDefaultExports = false
  } = {}) => {
    let i = printStack.length - 1;
    let node = printStack[i];
    i--;
    let parent = printStack[i];
    while (i > 0) {
        if (
            types.isExpressionStatement(parent, { expression: node }) ||
            types.isTaggedTemplateExpression(parent) ||
            considerDefaultExports && types.isExportDefaultDeclaration(parent, { declaration: node }) ||
            considerArrow && types.isArrowFunctionExpression(parent, { body: node })
        ) {
            return true;
        }

        if (
            types.isCallExpression(parent, { callee: node }) ||
            (types.isSequenceExpression(parent) && parent.expressions[0] === node) ||
            types.isMemberExpression(parent, { object: node }) ||
            types.isConditional(parent, { test: node }) ||
            types.isBinary(parent, { left: node }) ||
            types.isAssignmentExpression(parent, { left: node })
        ) {
            node = parent;
            i--;
            parent = printStack[i];
        } else {
            return false;
        }
    }

    return false;
};

export const ObjectExpression = (node, parent, printStack) => {
    return isFirstInStatement(printStack, { considerArrow: true });
};

export const DoExpression = (node, parent, printStack) => {
    return isFirstInStatement(printStack);
};

export const Binary = (node, parent) => {
    if (
        ((types.isCallExpression(parent) || types.isNewExpression(parent)) && parent.callee === node) ||
        types.isUnaryLike(parent) ||
        (types.isMemberExpression(parent) && parent.object === node) ||
        types.isAwaitExpression(parent)
    ) {
        return true;
    }

    if (types.isBinary(parent)) {
        const parentOp = parent.operator;
        const parentPos = PRECEDENCE[parentOp];

        const nodeOp = node.operator;
        const nodePos = PRECEDENCE[nodeOp];

        if (
            // Logical expressions with the same precedence don't need parens.
            (parentPos === nodePos && parent.right === node && !types.isLogicalExpression(parent)) ||
            parentPos > nodePos
        ) {
            return true;
        }
    }

    return false;
};

export const BinaryExpression = (node, parent) => {
    // let i = (1 in []);
    // for ((1 in []);;);
    return node.operator === "in" && (types.isVariableDeclarator(parent) || types.isFor(parent));
};

export const SequenceExpression = (node, parent) => {

    if (
        // Although parentheses wouldn"t hurt around sequence
        // expressions in the head of for loops, traditional style
        // dictates that e.g. i++, j++ should not be wrapped with
        // parentheses.
        types.isForStatement(parent) ||
        types.isThrowStatement(parent) ||
        types.isReturnStatement(parent) ||
        (types.isIfStatement(parent) && parent.test === node) ||
        (types.isWhileStatement(parent) && parent.test === node) ||
        (types.isForInStatement(parent) && parent.right === node) ||
        (types.isSwitchStatement(parent) && parent.discriminant === node) ||
        (types.isExpressionStatement(parent) && parent.expression === node)
    ) {
        return false;
    }

    // Otherwise err on the side of overparenthesization, adding
    // explicit exceptions above if this proves overzealous.
    return true;
};

export const YieldExpression = (node, parent) => {
    return types.isBinary(parent) ||
        types.isUnaryLike(parent) ||
        types.isCallExpression(parent) ||
        types.isMemberExpression(parent) ||
        types.isNewExpression(parent) ||
        (types.isConditionalExpression(parent) && node === parent.test);

};

export { YieldExpression as AwaitExpression };

export const ClassExpression = (node, parent, printStack) => {
    return isFirstInStatement(printStack, { considerDefaultExports: true });
};

export const UnaryLike = (node, parent) => {
    return types.isMemberExpression(parent, { object: node }) ||
        types.isCallExpression(parent, { callee: node }) ||
        types.isNewExpression(parent, { callee: node });
};

export const FunctionExpression = (node, parent, printStack) => {
    return isFirstInStatement(printStack, { considerDefaultExports: true });
};

export const ArrowFunctionExpression = (node, parent) => {
    if (
        // export default (function () {});
        types.isExportDeclaration(parent) ||
        types.isBinaryExpression(parent) ||
        types.isLogicalExpression(parent) ||
        types.isUnaryExpression(parent) ||
        types.isTaggedTemplateExpression(parent)
    ) {
        return true;
    }

    return UnaryLike(node, parent);
};

export const ConditionalExpression = (node, parent) => {
    if (
        types.isUnaryLike(parent) ||
        types.isBinary(parent) ||
        types.isConditionalExpression(parent, { test: node }) ||
        types.isAwaitExpression(parent)
    ) {
        return true;
    }

    return UnaryLike(node, parent);
};

export const AssignmentExpression = (...args) => {
    const [node] = args;
    if (types.isObjectPattern(node.left)) {
        return true;
    }
    return ConditionalExpression(...args);
};
