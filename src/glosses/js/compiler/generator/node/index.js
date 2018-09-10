import * as whitespace from "./whitespace";
import * as parens from "./parentheses";

const {
    is,
    js: { compiler: { types: t } }
} = adone;

const expandAliases = function (obj) {
    const newObj = {};

    const add = function (type, func) {
        const fn = newObj[type];
        newObj[type] = fn
            ? function (node, parent, stack) {
                const result = fn(node, parent, stack);

                return is.nil(result) ? func(node, parent, stack) : result;
            }
            : func;
    };

    for (const type of Object.keys(obj)) {
        const aliases = t.FLIPPED_ALIAS_KEYS[type];
        if (aliases) {
            for (const alias of aliases) {
                add(alias, obj[type]);
            }
        } else {
            add(type, obj[type]);
        }
    }

    return newObj;
};

// Rather than using `t.is` on each object property, we pre-expand any type aliases
// into concrete types so that the 'find' call below can be as fast as possible.
const expandedParens = expandAliases(parens);
const expandedWhitespaceNodes = expandAliases(whitespace.nodes);
const expandedWhitespaceList = expandAliases(whitespace.list);

const find = function (obj, node, parent, printStack) {
    const fn = obj[node.type];
    return fn ? fn(node, parent, printStack) : null;
};

const isOrHasCallExpression = function (node) {
    if (t.isCallExpression(node)) {
        return true;
    }

    if (t.isMemberExpression(node)) {
        return (
            isOrHasCallExpression(node.object) ||
            (!node.computed && isOrHasCallExpression(node.property))
        );
    }
    return false;

};

export const needsWhitespace = function (node, parent, type) {
    if (!node) {
        return 0;
    }

    if (t.isExpressionStatement(node)) {
        node = node.expression;
    }

    let linesInfo = find(expandedWhitespaceNodes, node, parent);

    if (!linesInfo) {
        const items = find(expandedWhitespaceList, node, parent);
        if (items) {
            for (let i = 0; i < items.length; i++) {
                linesInfo = needsWhitespace(items[i], node, type);
                if (linesInfo) {
                    break;
                }
            }
        }
    }

    if (typeof linesInfo === "object" && !is.null(linesInfo)) {
        return linesInfo[type] || 0;
    }

    return 0;
};

export const needsWhitespaceBefore = function (node, parent) {
    return needsWhitespace(node, parent, "before");
};

export const needsWhitespaceAfter = function (node, parent) {
    return needsWhitespace(node, parent, "after");
};

export const needsParens = function (node, parent, printStack) {
    if (!parent) {
        return false;
    }

    if (t.isNewExpression(parent) && parent.callee === node) {
        if (isOrHasCallExpression(node)) {
            return true;
        }
    }

    return find(expandedParens, node, parent, printStack);
};
