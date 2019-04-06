const {
    is,
    js: { compiler: { types: t } },
    lodash: { clone },
    util
} = adone;

const shouldIgnoreKey = (key) => {
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
};

const mergePair = (dest, src) => {
    for (const key in src) {
        dest[key] = [].concat(dest[key] || [], src[key]);
    }
};


const validateVisitorMethods = (path, val) => {
    const fns = util.arrify(val);
    for (const fn of fns) {
        if (!is.function(fn)) {
            throw new TypeError(`Non-function found defined in ${path} with type ${typeof fn}`);
        }
    }
};

const ensureEntranceObjects = (obj) => {
    for (const key in obj) {
        if (shouldIgnoreKey(key)) {
            continue;
        }

        const fns = obj[key];
        if (is.function(fns)) {
            obj[key] = { enter: fns };
        }
    }
};

const ensureCallbackArrays = (obj) => {
    if (obj.enter && !is.array(obj.enter)) {
        obj.enter = [obj.enter];
    }
    if (obj.exit && !is.array(obj.exit)) {
        obj.exit = [obj.exit];
    }
};


const verify = (visitors) => {
    if (visitors._verified) {
        return;
    }

    for (const nodeType in visitors) {
        if (nodeType === "enter" || nodeType === "exit") {
            validateVisitorMethods(nodeType, visitors[nodeType]);
        }

        if (shouldIgnoreKey(nodeType)) {
            continue;
        }

        if (!t.TYPES.includes(nodeType)) {
            throw new Error(`You gave us a visitor for the node type ${nodeType} but it's not a valid type`);
        }

        const gates = visitors[nodeType];
        if (is.plainObject(gates)) {
            for (const visitorKey in gates) {
                if (visitorKey === "enter" || visitorKey === "exit") {
                    // verify that it just contains functions
                    validateVisitorMethods(`${nodeType}.${visitorKey}`, gates[visitorKey]);
                } else {
                    throw new Error(`You passed 'traverse()' a visitor object with the property ${nodeType} that has the invalid property ${visitorKey}`);
                }
            }
        }
    }

    visitors._verified = true;
};

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
export default function explode(visitors) {
    if (visitors._exploded) {
        return visitors;
    }
    visitors._exploded = true;

    // normalise pipes
    for (const nodeType in visitors) {
        if (shouldIgnoreKey(nodeType)) {
            continue;
        }

        const parts = nodeType.split("|");
        if (parts.length === 1) {
            continue;
        }

        const fns = visitors[nodeType];
        delete visitors[nodeType];

        for (const part of parts) {
            visitors[part] = fns;
        }
    }

    // verify data structure
    verify(visitors);

    // make sure there's no __esModule type since this is because we're using loose mode
    // and it sets __esModule to be enumerable on all modules :(
    delete visitors.__esModule;

    // ensure visitors are objects
    ensureEntranceObjects(visitors);

    // ensure enter/exit callbacks are arrays
    ensureCallbackArrays(visitors);

    // add aliases
    for (const nodeType in visitors) {
        if (shouldIgnoreKey(nodeType)) {
            continue;
        }

        const fns = visitors[nodeType];

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
        delete visitors[nodeType];

        for (const alias of aliases) {
            const existing = visitors[alias];
            if (existing) {
                mergePair(existing, fns);
            } else {
                visitors[alias] = clone(fns);
            }
        }
    }

    for (const nodeType in visitors) {
        if (shouldIgnoreKey(nodeType)) {
            continue;
        }

        ensureCallbackArrays(visitors[nodeType]);
    }

    return visitors;
}
