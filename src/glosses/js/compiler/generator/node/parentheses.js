const {
    js: { compiler: { types: t } }
} = adone;

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

const isClassExtendsClause = (node, parent) =>
    (t.isClassDeclaration(parent) || t.isClassExpression(parent)) &&
    parent.superClass === node;

export const NullableTypeAnnotation = (node, parent) => t.isArrayTypeAnnotation(parent);

export { NullableTypeAnnotation as FunctionTypeAnnotation };

export const UpdateExpression = function (node, parent) {
    return (
        // (foo++).test(), (foo++)[0]
        t.isMemberExpression(parent, { object: node }) ||
        // (foo++)()
        t.isCallExpression(parent, { callee: node }) ||
        // new (foo++)()
        t.isNewExpression(parent, { callee: node }) ||
        isClassExtendsClause(node, parent)
    );
};

// Walk up the print stack to determine if our node can come first
// in statement.
const isFirstInStatement = function (printStack, { considerArrow = false, considerDefaultExports = false } = {}) {
    let i = printStack.length - 1;
    let node = printStack[i];
    i--;
    let parent = printStack[i];
    while (i > 0) {
        if (
            t.isExpressionStatement(parent, { expression: node }) ||
            t.isTaggedTemplateExpression(parent) ||
            (considerDefaultExports &&
                t.isExportDefaultDeclaration(parent, { declaration: node })) ||
            (considerArrow && t.isArrowFunctionExpression(parent, { body: node }))
        ) {
            return true;
        }

        if (
            t.isCallExpression(parent, { callee: node }) ||
            (t.isSequenceExpression(parent) && parent.expressions[0] === node) ||
            t.isMemberExpression(parent, { object: node }) ||
            t.isConditional(parent, { test: node }) ||
            t.isBinary(parent, { left: node }) ||
            t.isAssignmentExpression(parent, { left: node })
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


export const ObjectExpression = function (
    node,
    parent,
    printStack,
) {
    return isFirstInStatement(printStack, { considerArrow: true });
};

export const DoExpression = function (
    node,
    parent,
    printStack,
) {
    return isFirstInStatement(printStack);
};

export const Binary = function (node, parent) {
    if (
        node.operator === "**" &&
        t.isBinaryExpression(parent, { operator: "**" })
    ) {
        return parent.left === node;
    }

    if (isClassExtendsClause(node, parent)) {
        return true;
    }

    if (
        ((t.isCallExpression(parent) || t.isNewExpression(parent)) &&
            parent.callee === node) ||
        t.isUnaryLike(parent) ||
        (t.isMemberExpression(parent) && parent.object === node) ||
        t.isAwaitExpression(parent)
    ) {
        return true;
    }

    if (t.isBinary(parent)) {
        const parentOp = parent.operator;
        const parentPos = PRECEDENCE[parentOp];

        const nodeOp = node.operator;
        const nodePos = PRECEDENCE[nodeOp];

        if (
            // Logical expressions with the same precedence don't need parens.
            (parentPos === nodePos &&
                parent.right === node &&
                !t.isLogicalExpression(parent)) ||
            parentPos > nodePos
        ) {
            return true;
        }
    }

    return false;
};

export const UnionTypeAnnotation = function (node, parent) {
    return (
        t.isArrayTypeAnnotation(parent) ||
        t.isNullableTypeAnnotation(parent) ||
        t.isIntersectionTypeAnnotation(parent) ||
        t.isUnionTypeAnnotation(parent)
    );
};

export { UnionTypeAnnotation as IntersectionTypeAnnotation };

export const TSAsExpression = function () {
    return true;
};

export const TSTypeAssertion = function () {
    return true;
};

export const BinaryExpression = function (node, parent) {
    // let i = (1 in []);
    // for ((1 in []);;);
    return (
        node.operator === "in" &&
        (t.isVariableDeclarator(parent) || t.isFor(parent))
    );
};

export const SequenceExpression = function (node, parent) {
    if (
        // Although parentheses wouldn"t hurt around sequence
        // expressions in the head of for loops, traditional style
        // dictates that e.g. i++, j++ should not be wrapped with
        // parentheses.
        t.isForStatement(parent) ||
        t.isThrowStatement(parent) ||
        t.isReturnStatement(parent) ||
        (t.isIfStatement(parent) && parent.test === node) ||
        (t.isWhileStatement(parent) && parent.test === node) ||
        (t.isForInStatement(parent) && parent.right === node) ||
        (t.isSwitchStatement(parent) && parent.discriminant === node) ||
        (t.isExpressionStatement(parent) && parent.expression === node)
    ) {
        return false;
    }

    // Otherwise err on the side of overparenthesization, adding
    // explicit exceptions above if this proves overzealous.
    return true;
};

export const YieldExpression = function (node, parent) {
    return (
        t.isBinary(parent) ||
        t.isUnaryLike(parent) ||
        t.isCallExpression(parent) ||
        t.isMemberExpression(parent) ||
        t.isNewExpression(parent) ||
        (t.isConditionalExpression(parent) && node === parent.test) ||
        isClassExtendsClause(node, parent)
    );
};

export { YieldExpression as AwaitExpression };

export const ClassExpression = function (
    node,
    parent,
    printStack,
) {
    return isFirstInStatement(printStack, { considerDefaultExports: true });
};

export const UnaryLike = function (node, parent) {
    return (
        t.isMemberExpression(parent, { object: node }) ||
        t.isCallExpression(parent, { callee: node }) ||
        t.isNewExpression(parent, { callee: node }) ||
        t.isBinaryExpression(parent, { operator: "**", left: node }) ||
        isClassExtendsClause(node, parent)
    );
};

export const FunctionExpression = function (
    node,
    parent,
    printStack,
) {
    return isFirstInStatement(printStack, { considerDefaultExports: true });
};

export const ConditionalExpression = function (node, parent) {
    if (
        t.isUnaryLike(parent) ||
        t.isBinary(parent) ||
        t.isConditionalExpression(parent, { test: node }) ||
        t.isAwaitExpression(parent) ||
        t.isTaggedTemplateExpression(parent) ||
        t.isTSTypeAssertion(parent) ||
        t.isTSAsExpression(parent)
    ) {
        return true;
    }

    return UnaryLike(node, parent);
};

export const ArrowFunctionExpression = function (node, parent) {
    return t.isExportDeclaration(parent) || ConditionalExpression(node, parent);
};

export const AssignmentExpression = function (node) {
    if (t.isObjectPattern(node.left)) {
        return true;
    }
    return ConditionalExpression(...arguments);

};

export const NewExpression = function (node, parent) {
    return isClassExtendsClause(node, parent);
};
