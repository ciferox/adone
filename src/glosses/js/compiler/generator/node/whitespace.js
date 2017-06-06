const { js: { compiler: { types } }, is } = adone;

/**
 * Crawl a node to test if it contains a CallExpression, a Function, or a Helper.
 */

const crawl = (node, state = {}) => {
    if (types.isMemberExpression(node)) {
        crawl(node.object, state);
        if (node.computed) {
            crawl(node.property, state);
        }
    } else if (types.isBinary(node) || types.isAssignmentExpression(node)) {
        crawl(node.left, state);
        crawl(node.right, state);
    } else if (types.isCallExpression(node)) {
        state.hasCall = true;
        crawl(node.callee, state);
    } else if (types.isFunction(node)) {
        state.hasFunction = true;
    } else if (types.isIdentifier(node)) {
        state.hasHelper = state.hasHelper || isHelper(node.callee);
    }

    return state;
};

const isHelper = (node) => {
    if (types.isMemberExpression(node)) {
        return isHelper(node.object) || isHelper(node.property);
    } else if (types.isIdentifier(node)) {
        return node.name === "require" || node.name[0] === "_";
    } else if (types.isCallExpression(node)) {
        return isHelper(node.callee);
    } else if (types.isBinary(node) || types.isAssignmentExpression(node)) {
        return (types.isIdentifier(node.left) && isHelper(node.left)) || isHelper(node.right);
    }
    return false;

};

const isType = (node) => {
    return types.isLiteral(node) || types.isObjectExpression(node) || types.isArrayExpression(node) ||
        types.isIdentifier(node) || types.isMemberExpression(node);
};

/**
 * Tests for node types that need whitespace.
 */
export const nodes = {
    AssignmentExpression(node) {
        const state = crawl(node.right);
        if ((state.hasCall && state.hasHelper) || state.hasFunction) {
            return {
                before: state.hasFunction,
                after: true
            };
        }
    },
    SwitchCase(node, parent) {
        return {
            before: node.consequent.length || parent.cases[0] === node
        };
    },
    LogicalExpression(node) {
        if (types.isFunction(node.left) || types.isFunction(node.right)) {
            return {
                after: true
            };
        }
    },
    Literal(node) {
        if (node.value === "use strict") {
            return {
                after: true
            };
        }
    },
    CallExpression(node) {
        if (types.isFunction(node.callee) || isHelper(node)) {
            return {
                before: true,
                after: true
            };
        }
    },
    VariableDeclaration(node) {
        for (let i = 0; i < node.declarations.length; i++) {
            const declar = node.declarations[i];

            let enabled = isHelper(declar.id) && !isType(declar.init);
            if (!enabled) {
                const state = crawl(declar.init);
                enabled = (isHelper(declar.init) && state.hasCall) || state.hasFunction;
            }

            if (enabled) {
                return {
                    before: true,
                    after: true
                };
            }
        }
    },
    IfStatement(node) {
        if (types.isBlockStatement(node.consequent)) {
            return {
                before: true,
                after: true
            };
        }
    }
};

nodes.ObjectProperty =
    nodes.ObjectTypeProperty =
    nodes.ObjectMethod =
    nodes.SpreadProperty = (node, parent) => {
        if (parent.properties[0] === node) {
            return {
                before: true
            };
        }
    };

/**
 * Returns lists from node types that need whitespace.
 */
export const list = {
    VariableDeclaration(node) {
        return node.declarations.map((x) => x.init);
    },
    ArrayExpression(node) {
        return node.elements;
    },
    ObjectExpression(node) {
        return node.properties;
    }
};

/**
 * Add whitespace tests for nodes and their aliases.
 */
const t = {
    Function: true,
    Class: true,
    Loop: true,
    LabeledStatement: true,
    SwitchStatement: true,
    TryStatement: true
};

for (let [type, amounts] of adone.util.entries(t)) {
    if (is.boolean(amounts)) {
        amounts = { after: amounts, before: amounts };
    }

    for (const i of [type, ...(types.FLIPPED_ALIAS_KEYS[type] || [])]) {
        nodes[i] = () => amounts;
    }
}
