const { vendor: { lodash: { clone: loClone, uniq } }, is, util, lazify } = adone;

const t = exports;

/**
 * Registers `is[Type]` and `assert[Type]` generated functions for a given `type`.
 * Pass `skipAliasCheck` to force it to directly compare `node.type` with `type`.
 */
const registerType = (type) => {
    let is = t[`is${type}`];
    if (!is) {
        is = t[`is${type}`] = function (node, opts) {
            return t.is(type, node, opts);
        };
    }

    t[`assert${type}`] = function (node, opts) {
        opts = opts || {};
        if (!is(node, opts)) {
            throw new Error(`Expected type ${JSON.stringify(type)} with option ${JSON.stringify(opts)}`);
        }
    };
};

//

export {
    STATEMENT_OR_BLOCK_KEYS,
    FLATTENABLE_KEYS,
    FOR_INIT_KEYS,
    COMMENT_KEYS,
    LOGICAL_OPERATORS,
    UPDATE_OPERATORS,
    BOOLEAN_NUMBER_BINARY_OPERATORS,
    EQUALITY_BINARY_OPERATORS,
    COMPARISON_BINARY_OPERATORS,
    BOOLEAN_BINARY_OPERATORS,
    NUMBER_BINARY_OPERATORS,
    BINARY_OPERATORS,
    BOOLEAN_UNARY_OPERATORS,
    NUMBER_UNARY_OPERATORS,
    STRING_UNARY_OPERATORS,
    UNARY_OPERATORS,
    INHERIT_KEYS,
    BLOCK_SCOPED_SYMBOL,
    NOT_LOCAL_BINDING
} from "./constants";

import "./definitions/init";
import { VISITOR_KEYS, ALIAS_KEYS, NODE_FIELDS, BUILDER_KEYS, DEPRECATED_KEYS } from "./definitions";
export { VISITOR_KEYS, ALIAS_KEYS, NODE_FIELDS, BUILDER_KEYS, DEPRECATED_KEYS };

/**
 * Registers `is[Type]` and `assert[Type]` for all types.
 */
for (const type in t.VISITOR_KEYS) {
    registerType(type);
}

/**
 * Flip `ALIAS_KEYS` for faster access in the reverse direction.
 */
t.FLIPPED_ALIAS_KEYS = {};

Object.keys(t.ALIAS_KEYS).forEach((type) => {
    t.ALIAS_KEYS[type].forEach((alias) => {
        const types = t.FLIPPED_ALIAS_KEYS[alias] = t.FLIPPED_ALIAS_KEYS[alias] || [];
        types.push(type);
    });
});

/**
 * Registers `is[Alias]` and `assert[Alias]` functions for all aliases.
 */
Object.keys(t.FLIPPED_ALIAS_KEYS).forEach((type) => {
    t[`${type.toUpperCase()}_TYPES`] = t.FLIPPED_ALIAS_KEYS[type];
    registerType(type);
});

export const TYPES = [
    ...Object.keys(t.VISITOR_KEYS),
    ...Object.keys(t.FLIPPED_ALIAS_KEYS),
    ...Object.keys(t.DEPRECATED_KEYS)
];

/**
 * Test if a `nodeType` is a `targetType` or if `targetType` is an alias of `nodeType`.
 */
export const isType = (nodeType, targetType) => {
    if (nodeType === targetType) {
        return true;
    }

    // This is a fast-path. If the test above failed, but an alias key is found, then the
    // targetType was a primary node type, so there's no need to check the aliases.
    if (t.ALIAS_KEYS[targetType]) {
        return false;
    }

    const aliases = t.FLIPPED_ALIAS_KEYS[targetType];
    if (aliases) {
        if (aliases[0] === nodeType) {
            return true;
        }

        for (const alias of aliases) {
            if (nodeType === alias) {
                return true;
            }
        }
    }

    return false;
};

/**
 * Returns whether `node` is of given `type`.
 *
 * For better performance, use this instead of `is[Type]` when `type` is unknown.
 * Optionally, pass `skipAliasCheck` to directly compare `node.type` with `type`.
 */
const _is = (type, node, opts) => {
    if (!node) {
        return false;
    }

    const matches = isType(node.type, type);
    if (!matches) {
        return false;
    }

    if (is.undefined(opts)) {
        return true;
    }
    return t.shallowEqual(node, opts);
};

export { _is as is };

export const validate = (node, key, val) => {
    if (!node) {
        return;
    }

    const fields = t.NODE_FIELDS[node.type];
    if (!fields) {
        return;
    }

    const field = fields[key];
    if (!field || !field.validate) {
        return;
    }
    if (field.optional && is.nil(val)) {
        return;
    }

    field.validate(node, key, val);
};

Object.keys(t.BUILDER_KEYS).forEach((type) => {
    const keys = t.BUILDER_KEYS[type];

    const builder = (...args) => {
        if (args.length > keys.length) {
            throw new Error(
                `t.${type}: Too many arguments passed. Received ${args.length} but can receive ` +
                `no more than ${keys.length}`
            );
        }

        const node = {};
        node.type = type;

        let i = 0;

        for (const key of keys) {
            const field = t.NODE_FIELDS[type][key];

            let arg = args[i++];
            if (is.undefined(arg)) {
                arg = loClone(field.default);
            }

            node[key] = arg;
        }

        for (const key in node) {
            validate(node, key, node[key]);
        }

        return node;
    };

    t[type] = builder;
    t[type[0].toLowerCase() + type.slice(1)] = builder;
});

/**
 * Description
 */

for (const type in t.DEPRECATED_KEYS) {
    const newType = t.DEPRECATED_KEYS[type];

    const proxy = (fn) => {
        return function (...args) {
            console.trace(`The node type ${type} has been renamed to ${newType}`);
            return fn.apply(this, ...args);
        };
    };

    t[type] = t[type[0].toLowerCase() + type.slice(1)] = proxy(t[newType]);
    t[`is${type}`] = proxy(t[`is${newType}`]);
    t[`assert${type}`] = proxy(t[`assert${newType}`]);
}

/**
 * Test if an object is shallowly equal.
 */
export const shallowEqual = (actual, expected) => {
    const keys = Object.keys(expected);

    for (const key of keys) {
        if (actual[key] !== expected[key]) {
            return false;
        }
    }

    return true;
};

/**
 * Append a node to a member expression.
 */
export const appendToMemberExpression = (member, append, computed) => {
    member.object = t.memberExpression(member.object, member.property, member.computed);
    member.property = append;
    member.computed = Boolean(computed);
    return member;
};

/**
 * Prepend a node to a member expression.
 */
export const prependToMemberExpression = (member, prepend) => {
    member.object = t.memberExpression(prepend, member.object);
    return member;
};

/**
 * Ensure the `key` (defaults to "body") of a `node` is a block.
 * Casting it to a block if it is not.
 */
export const ensureBlock = (node, key = "body") => {
    return node[key] = t.toBlock(node[key], node);
};

/**
 * Create a shallow clone of a `node` excluding `_private` properties.
 */
export const clone = (node) => {
    if (!node) {
        return node;
    }
    const newNode = {};
    for (const key in node) {
        if (key[0] === "_") {
            continue;
        }
        newNode[key] = node[key];
    }
    return newNode;
};

/**
 * Create a shallow clone of a `node` excluding `_private` and location properties.
 */
export const cloneWithoutLoc = (node) => {
    const newNode = clone(node);
    delete newNode.loc;
    return newNode;
};

/**
 * Create a deep clone of a `node` and all of it's child nodes
 * exluding `_private` properties.
 */
export const cloneDeep = (node) => {
    if (!node) {
        return node;
    }
    const newNode = {};

    for (const key in node) {
        if (key[0] === "_") {
            continue;
        }

        let val = node[key];

        if (val) {
            if (val.type) {
                val = t.cloneDeep(val);
            } else if (is.array(val)) {
                val = val.map(t.cloneDeep);
            }
        }

        newNode[key] = val;
    }

    return newNode;
};

/**
 * Build a function that when called will return whether or not the
 * input `node` `MemberExpression` matches the input `match`.
 *
 * For example, given the match `React.createClass` it would match the
 * parsed nodes of `React.createClass` and `React["createClass"]`.
 */
export const buildMatchMemberExpression = (match, allowPartial) => {
    const parts = match.split(".");

    return (member) => {
        // not a member expression
        if (!t.isMemberExpression(member)) {
            return false;
        }

        const search = [member];
        let i = 0;

        while (search.length) {
            const node = search.shift();

            if (allowPartial && i === parts.length) {
                return true;
            }

            if (t.isIdentifier(node)) {
                // this part doesn't match
                if (parts[i] !== node.name) {
                    return false;
                }
            } else if (t.isStringLiteral(node)) {
                // this part doesn't match
                if (parts[i] !== node.value) {
                    return false;
                }
            } else if (t.isMemberExpression(node)) {
                if (node.computed && !t.isStringLiteral(node.property)) {
                    // we can't deal with this
                    return false;
                }
                search.push(node.object);
                search.push(node.property);
                continue;

            } else {
                // we can't deal with this
                return false;
            }

            // too many parts
            if (++i > parts.length) {
                return false;
            }
        }

        return true;
    };
};

/**
 * Remove comment properties from a node.
 */
export const removeComments = (node) => {
    for (const key of t.COMMENT_KEYS) {
        delete node[key];
    }
    return node;
};

const _inheritComments = (key, child, parent) => {
    if (child && parent) {
        child[key] = uniq(
            [].concat(child[key], parent[key])
                .filter(Boolean)
        );
    }
};

export const inheritTrailingComments = (child, parent) => {
    _inheritComments("trailingComments", child, parent);
};

export const inheritLeadingComments = (child, parent) => {
    _inheritComments("leadingComments", child, parent);
};

export const inheritInnerComments = (child, parent) => {
    _inheritComments("innerComments", child, parent);
};

/**
 * Inherit all unique comments from `parent` node to `child` node.
 */
export const inheritsComments = (child, parent) => {
    inheritTrailingComments(child, parent);
    inheritLeadingComments(child, parent);
    inheritInnerComments(child, parent);
    return child;
};

/**
 * Inherit all contextual properties from `parent` node to `child` node.
 */
export const inherits = (child, parent) => {
    if (!child || !parent) {
        return child;
    }

    // optionally inherit specific properties if not null
    for (const key of t.INHERIT_KEYS.optional) {
        if (is.nil(child[key])) {
            child[key] = parent[key];
        }
    }

    // force inherit "private" properties
    for (const key in parent) {
        if (key[0] === "_") {
            child[key] = parent[key];
        }
    }

    // force inherit select properties
    for (const key of t.INHERIT_KEYS.force) {
        child[key] = parent[key];
    }

    t.inheritsComments(child, parent);

    return child;
};

export const isNode = (node) => {
    return Boolean(node && VISITOR_KEYS[node.type]);
};

export const assertNode = (node) => {
    if (!isNode(node)) {
        // $FlowFixMe
        throw new TypeError(`Not a valid node ${node && node.type}`);
    }
};

// Optimize property access.
util.toFastProperties(t);
util.toFastProperties(t.VISITOR_KEYS);

/**
 * A prefix AST traversal implementation implementation.
 */
export const traverseFast = (node, enter, opts) => {
    if (!node) {
        return;
    }

    const keys = t.VISITOR_KEYS[node.type];
    if (!keys) {
        return;
    }

    opts = opts || {};
    enter(node, opts);

    for (const key of keys) {
        const subNode = node[key];

        if (is.array(subNode)) {
            for (const node of subNode) {
                traverseFast(node, enter, opts);
            }
        } else {
            traverseFast(subNode, enter, opts);
        }
    }
};

const CLEAR_KEYS = [
    "tokens",
    "start", "end", "loc",
    "raw", "rawValue"
];

const CLEAR_KEYS_PLUS_COMMENTS = [...t.COMMENT_KEYS, "comments", ...CLEAR_KEYS];

/**
 * Remove all of the _* properties from a node along with the additional metadata
 * properties like location data and raw token data.
 */

export const removeProperties = (node, opts) => {
    opts = opts || {};
    const map = opts.preserveComments ? CLEAR_KEYS : CLEAR_KEYS_PLUS_COMMENTS;
    for (const key of map) {
        if (!is.nil(node[key])) {
            node[key] = undefined;
        }
    }

    for (const key in node) {
        if (key[0] === "_" && !is.nil(node[key])) {
            node[key] = undefined;
        }
    }

    const syms = Object.getOwnPropertySymbols(node);
    for (const sym of syms) {
        node[sym] = null;
    }
};

export const removePropertiesDeep = (tree, opts) => {
    traverseFast(tree, removeProperties, opts);
    return tree;
};

export {
    getBindingIdentifiers,
    getOuterBindingIdentifiers
} from "./retrievers";

export {
    isBinding,
    isReferenced,
    isValidIdentifier,
    isLet,
    isBlockScoped,
    isVar,
    isSpecifierDefault,
    isScope,
    isImmutable,
    isNodesEquivalent
} from "./validators";

export {
    toComputedKey,
    toSequenceExpression,
    toKeyAlias,
    toIdentifier,
    toBindingIdentifierName,
    toStatement,
    toExpression,
    toBlock,
    valueToNode
} from "./converters";

lazify({
    createUnionTypeAnnotation: ["./flow", (x) => x.createUnionTypeAnnotation],
    removeTypeDuplicates: ["./flow", (x) => x.removeTypeDuplicates],
    createTypeAnnotationBasedOnTypeof: ["./flow", (x) => x.createTypeAnnotationBasedOnTypeof],
    react: "./react"
}, exports, require);
