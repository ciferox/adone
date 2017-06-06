const { is } = adone;

export const isExpression = (node) => {
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

export const isIterationStatement = (node) => {
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

export const isStatement = (node) => {
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

export const isSourceElement = (node) => {
    return isStatement(node) || !is.nil(node) && node.type === "FunctionDeclaration";
};

export const trailingStatement = (node) => {
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

export const isProblematicIfStatement = (node) => {
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
