// @flow

const { types } = adone.js.compiler;

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

export function NullableTypeAnnotation(node: Object, parent: Object): boolean {
    return types.isArrayTypeAnnotation(parent);
}

export { NullableTypeAnnotation as FunctionTypeAnnotation };

export function UpdateExpression(node: Object, parent: Object): boolean {
    if (types.isMemberExpression(parent) && parent.object === node) {
        // (foo++).test()
        return true;
    }

    return false;
}

export function ObjectExpression(node: Object, parent: Object, printStack: Object[]): boolean {
    return isFirstInStatement(printStack, { considerArrow: true });
}

export function Binary(node: Object, parent: Object): boolean {
    if ((types.isCallExpression(parent) || types.isNewExpression(parent)) && parent.callee === node) {
        return true;
    }

    if (types.isUnaryLike(parent)) {
        return true;
    }

    if (types.isMemberExpression(parent) && parent.object === node) {
        return true;
    }

    if (types.isBinary(parent)) {
        const parentOp = parent.operator;
        const parentPos = PRECEDENCE[parentOp];

        const nodeOp = node.operator;
        const nodePos = PRECEDENCE[nodeOp];

        if (parentPos > nodePos) {
            return true;
        }

        // Logical expressions with the same precedence don't need parens.
        if (parentPos === nodePos && parent.right === node && !types.isLogicalExpression(parent)) {
            return true;
        }
    }

    return false;
}

export function BinaryExpression(node: Object, parent: Object): boolean {
    if (node.operator === "in") {
        // let i = (1 in []);
        if (types.isVariableDeclarator(parent)) {
            return true;
        }

        // for ((1 in []);;);
        if (types.isFor(parent)) {
            return true;
        }
    }

    return false;
}

export function SequenceExpression(node: Object, parent: Object): boolean {
    if (types.isForStatement(parent)) {
        // Although parentheses wouldn"t hurt around sequence
        // expressions in the head of for loops, traditional style
        // dictates that e.g. i++, j++ should not be wrapped with
        // parentheses.
        return false;
    }

    if (types.isExpressionStatement(parent) && parent.expression === node) {
        return false;
    }

    if (types.isReturnStatement(parent)) {
        return false;
    }

    if (types.isThrowStatement(parent)) {
        return false;
    }

    if (types.isSwitchStatement(parent) && parent.discriminant === node) {
        return false;
    }

    if (types.isWhileStatement(parent) && parent.test === node) {
        return false;
    }

    if (types.isIfStatement(parent) && parent.test === node) {
        return false;
    }

    if (types.isForInStatement(parent) && parent.right === node) {
        return false;
    }

    // Otherwise err on the side of overparenthesization, adding
    // explicit exceptions above if this proves overzealous.
    return true;
}

export function YieldExpression(node: Object, parent: Object): boolean {
    return types.isBinary(parent) ||
        types.isUnaryLike(parent) ||
        types.isCallExpression(parent) ||
        types.isMemberExpression(parent) ||
        types.isNewExpression(parent) ||
        (types.isConditionalExpression(parent) && node === parent.test);

}

export { YieldExpression as AwaitExpression };

export function ClassExpression(node: Object, parent: Object, printStack: Object[]): boolean {
    return isFirstInStatement(printStack, { considerDefaultExports: true });
}

export function UnaryLike(node: Object, parent: Object): boolean {
    if (types.isMemberExpression(parent, { object: node })) {
        return true;
    }

    if (types.isCallExpression(parent, { callee: node }) || types.isNewExpression(parent, { callee: node })) {
        return true;
    }

    return false;
}

export function FunctionExpression(node: Object, parent: Object, printStack: Object[]): boolean {
    return isFirstInStatement(printStack, { considerDefaultExports: true });
}

export function ArrowFunctionExpression(node: Object, parent: Object): boolean {
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
}

export function ConditionalExpression(node: Object, parent: Object): boolean {
    if (types.isUnaryLike(parent)) {
        return true;
    }

    if (types.isBinary(parent)) {
        return true;
    }

    if (types.isAwaitExpression(parent)) {
        return true;
    }

    if (types.isConditionalExpression(parent, { test: node })) {
        return true;
    }

    return UnaryLike(node, parent);
}

export function AssignmentExpression(node: Object): boolean {
    if (types.isObjectPattern(node.left)) {
        return true;
    } 
    return ConditionalExpression(...arguments);
    
}

// Walk up the print stack to deterimine if our node can come first
// in statement.
function isFirstInStatement(printStack: Object[], {
    considerArrow = false,
    considerDefaultExports = false
} = {}): boolean {
    let i = printStack.length - 1;
    let node = printStack[i];
    i--;
    let parent = printStack[i];
    while (i > 0) {
        if (types.isExpressionStatement(parent, { expression: node })) {
            return true;
        }

        if (types.isTaggedTemplateExpression(parent)) {
            return true;
        }

        if (considerDefaultExports && types.isExportDefaultDeclaration(parent, { declaration: node })) {
            return true;
        }

        if (considerArrow && types.isArrowFunctionExpression(parent, { body: node })) {
            return true;
        }

        if ((types.isCallExpression(parent, { callee: node })) ||
            (types.isSequenceExpression(parent) && parent.expressions[0] === node) ||
            (types.isMemberExpression(parent, { object: node })) ||
            (types.isConditional(parent, { test: node })) ||
            (types.isBinary(parent, { left: node })) ||
            (types.isAssignmentExpression(parent, { left: node }))) {
            node = parent;
            i--;
            parent = printStack[i];
        } else {
            return false;
        }
    }

    return false;
}
