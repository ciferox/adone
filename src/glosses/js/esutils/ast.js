const {
    is
} = adone;

const isExpression = function (node) {
    if (is.nil(node)) {
        return false;
    }
    switch (node.type) {
        case "ArrayExpression":
        case "AssignmentExpression":
        case "BinaryExpression":
        case "CallExpression":
        case "ConditionalExpression":
        case "FunctionExpression":
        case "Identifier":
        case "Literal":
        case "LogicalExpression":
        case "MemberExpression":
        case "NewExpression":
        case "ObjectExpression":
        case "SequenceExpression":
        case "ThisExpression":
        case "UnaryExpression":
        case "UpdateExpression":
            return true;
    }
    return false;
};

const isIterationStatement = function (node) {
    if (is.nil(node)) {
        return false;
    }
    switch (node.type) {
        case "DoWhileStatement":
        case "ForInStatement":
        case "ForStatement":
        case "WhileStatement":
            return true;
    }
    return false;
};

const isStatement = function (node) {
    if (is.nil(node)) {
        return false;
    }
    switch (node.type) {
        case "BlockStatement":
        case "BreakStatement":
        case "ContinueStatement":
        case "DebuggerStatement":
        case "DoWhileStatement":
        case "EmptyStatement":
        case "ExpressionStatement":
        case "ForInStatement":
        case "ForStatement":
        case "IfStatement":
        case "LabeledStatement":
        case "ReturnStatement":
        case "SwitchStatement":
        case "ThrowStatement":
        case "TryStatement":
        case "VariableDeclaration":
        case "WhileStatement":
        case "WithStatement":
            return true;
    }
    return false;
};

const isSourceElement = (node) => isStatement(node) || !is.nil(node) && node.type === "FunctionDeclaration";

const trailingStatement = function (node) {
    switch (node.type) {
        case "IfStatement":
            if (!is.nil(node.alternate)) {
                return node.alternate;
            }
            return node.consequent;

        case "LabeledStatement":
        case "ForStatement":
        case "ForInStatement":
        case "WhileStatement":
        case "WithStatement":
            return node.body;
    }
    return null;
};

const isProblematicIfStatement = function (node) {
    let current;

    if (node.type !== "IfStatement") {
        return false;
    }
    if (is.nil(node.alternate)) {
        return false;
    }
    current = node.consequent;
    do {
        if (current.type === "IfStatement") {
            if (is.nil(current.alternate)) {
                return true;
            }
        }
        current = trailingStatement(current);
    } while (current);

    return false;
};

export default {
    isExpression,
    isStatement,
    isIterationStatement,
    isSourceElement,
    isProblematicIfStatement,

    trailingStatement
};
