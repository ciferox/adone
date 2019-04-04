/* eslint-disable func-style */
const {
    is,
    js: { compiler: { types: t } },
    lodash: { clone }
} = adone;

/**
 * explode() will take a visitor object with all of the various shorthands
 * that we support, and validates & normalizes it into a common format, ready
 * to be used in traversal
 *
 * The various shorthands are:
 * * `Identifier() { ... }` -> `Identifier: { enter() { ... } }`
 * * `"Identifier|NumericLiteral": { ... }` -> `Identifier: { ... }, NumericLiteral: { ... }`
 * * Aliases in `babel-types`: e.g. `Property: { ... }` -> `ObjectProperty: { ... }, ClassProperty: { ... }`
 *
 * Other normalizations are:
 * * `enter` and `exit` functions are wrapped in arrays, to ease merging of
 *   visitors
 */
export default function explode(visitor) {
    if (visitor._exploded) {
        return visitor;
    }
    visitor._exploded = true;

    // normalise pipes
    for (const nodeType in visitor) {
        if (shouldIgnoreKey(nodeType)) {
            continue;
        }

        const parts = nodeType.split("|");
        if (parts.length === 1) {
            continue;
        }

        const fns = visitor[nodeType];
        delete visitor[nodeType];

        for (const part of parts) {
            visitor[part] = fns;
        }
    }

    // verify data structure
    verify(visitor);

    // make sure there's no __esModule type since this is because we're using loose mode
    // and it sets __esModule to be enumerable on all modules :(
    delete visitor.__esModule;

    // ensure visitors are objects
    ensureEntranceObjects(visitor);

    // ensure enter/exit callbacks are arrays
    ensureCallbackArrays(visitor);

    // add aliases
    for (const nodeType in visitor) {
        if (shouldIgnoreKey(nodeType)) {
            continue;
        }

        const fns = visitor[nodeType];

        let aliases = t.FLIPPED_ALIAS_KEYS[nodeType];

        const deprecratedKey = t.DEPRECATED_KEYS[nodeType];
        if (deprecratedKey) {
            console.trace(`Visitor defined for ${nodeType} but it has been renamed to ${deprecratedKey}`);
            aliases = [deprecratedKey];
        }

        if (!aliases) {
            continue;
        }

        // clear it from the visitor
        delete visitor[nodeType];

        for (const alias of aliases) {
            const existing = visitor[alias];
            if (existing) {
                mergePair(existing, fns);
            } else {
                visitor[alias] = clone(fns);
            }
        }
    }

    for (const nodeType in visitor) {
        if (shouldIgnoreKey(nodeType)) {
            continue;
        }

        ensureCallbackArrays(visitor[nodeType]);
    }

    return visitor;
}

export function verify(visitor) {
    if (visitor._verified) {
        return;
    }

    if (is.function(visitor)) {
        // throw new Error(messages.get("traverseVerifyRootFunction"));
        throw new Error("You passed `traverse()` a function when it expected a visitor object, are you sure you didn't mean `{ enter: Function }`?");
    }

    for (const nodeType in visitor) {
        if (nodeType === "enter" || nodeType === "exit") {
            validateVisitorMethods(nodeType, visitor[nodeType]);
        }

        if (shouldIgnoreKey(nodeType)) {
            continue;
        }

        if (t.TYPES.indexOf(nodeType) < 0) {
            // throw new Error(messages.get("traverseVerifyNodeType", nodeType));
            throw new Error(`You gave us a visitor for the node type ${nodeType} but it's not a valid type`);
        }

        const visitors = visitor[nodeType];
        if (typeof visitors === "object") {
            for (const visitorKey in visitors) {
                if (visitorKey === "enter" || visitorKey === "exit") {
                    // verify that it just contains functions
                    validateVisitorMethods(`${nodeType}.${visitorKey}`, visitors[visitorKey]);
                } else {
                    // throw new Error(messages.get("traverseVerifyVisitorProperty", nodeType, visitorKey));
                    throw new Error(`You passed \`traverse()\` a visitor object with the property ${nodeType} that has the invalid property ${visitorKey}`);
                }
            }
        }
    }

    visitor._verified = true;
}

function validateVisitorMethods(path, val) {
    const fns = [].concat(val);
    for (const fn of fns) {
        if (!is.function(fn)) {
            throw new TypeError(`Non-function found defined in ${path} with type ${typeof fn}`);
        }
    }
}

function wrapWithStateOrWrapper(oldVisitor, state, wrapper) {
    const newVisitor = {};

    for (const key in oldVisitor) {
        let fns = oldVisitor[key];

        // not an enter/exit array of callbacks
        if (!is.array(fns)) {
            continue;
        }

        fns = fns.map((fn) => {
            let newFn = fn;

            if (state) {
                newFn = function (path) {
                    return fn.call(state, path, state);
                };
            }

            if (wrapper) {
                newFn = wrapper(state.key, key, newFn);
            }

            return newFn;
        });

        newVisitor[key] = fns;
    }

    return newVisitor;
}

function ensureEntranceObjects(obj) {
    for (const key in obj) {
        if (shouldIgnoreKey(key)) {
            continue;
        }

        const fns = obj[key];
        if (is.function(fns)) {
            obj[key] = { enter: fns };
        }
    }
}

function ensureCallbackArrays(obj) {
    if (obj.enter && !is.array(obj.enter)) {
        obj.enter = [obj.enter];
    }
    if (obj.exit && !is.array(obj.exit)) {
        obj.exit = [obj.exit];
    }
}

function shouldIgnoreKey(key) {
    // internal/hidden key
    if (key[0] === "_") {
        return true;
    }

    // ignore function keys
    if (key === "enter" || key === "exit" || key === "shouldSkip") {
        return true;
    }

    // ignore other options
    if (key === "blacklist" || key === "noScope" || key === "skipKeys") {
        return true;
    }

    return false;
}

function mergePair(dest, src) {
    for (const key in src) {
        dest[key] = [].concat(dest[key] || [], src[key]);
    }
}
