const { is, js: { compiler: { types: t } } } = adone;

/**
 * Call the provided `callback` with the `NodePath`s of all the parents.
 * When the `callback` returns a truthy value, we return that node path.
 */
export const findParent = function (callback) {
    let path = this;
    for ( ; ; ) {
        path = path.parentPath;
        if (!path) {
            break;
        }
        if (callback(path)) {
            return path;
        }
    }
    return null;
};

/**
 * Description
 */
export const find = function (callback) {
    let path = this;
    for ( ; ; ) {
        if (callback(path)) {
            return path;
        }
        path = path.parentPath;
        if (!path) {
            break;
        }
    }
    return null;
};

/**
 * Get the parent function of the current path.
 */

export const getFunctionParent = function () {
    return this.findParent((path) => path.isFunction() || path.isProgram());
};

/**
 * Walk up the tree until we hit a parent node path in a list.
 */

export const getStatementParent = function () {
    let path = this;
    for ( ; ; ) {
        if (is.array(path.container)) {
            return path;
        }
        path = path.parentPath;
        if (!path) {
            break;
        }
    }
};

/**
 * Get the deepest common ancestor and then from it, get the earliest relationship path
 * to that ancestor.
 *
 * Earliest is defined as being "before" all the other nodes in terms of list container
 * position and visiting key.
 */
export const getEarliestCommonAncestorFrom = function (paths) {
    return this.getDeepestCommonAncestorFrom(paths, (deepest, i, ancestries) => {
        let earliest;
        const keys = t.VISITOR_KEYS[deepest.type];

        for (const ancestry of ancestries) {
            const path = ancestry[i + 1];

            // first path
            if (!earliest) {
                earliest = path;
                continue;
            }

            // handle containers
            if (path.listKey && earliest.listKey === path.listKey) {
                // we're in the same container so check if we're earlier
                if (path.key < earliest.key) {
                    earliest = path;
                    continue;
                }
            }

            // handle keys
            const earliestKeyIndex = keys.indexOf(earliest.parentKey);
            const currentKeyIndex = keys.indexOf(path.parentKey);
            if (earliestKeyIndex > currentKeyIndex) {
                // key appears before so it's earlier
                earliest = path;
            }
        }

        return earliest;
    });
};

/**
 * Get the earliest path in the tree where the provided `paths` intersect.
 *
 * TODO: Possible optimisation target.
 */
export const getDeepestCommonAncestorFrom = function (paths, filter) {
    if (!paths.length) {
        return this;
    }

    if (paths.length === 1) {
        return paths[0];
    }

    // minimum depth of the tree so we know the highest node
    let minDepth = Infinity;

    // last common ancestor
    let lastCommonIndex;
    let lastCommon;

    // get the ancestors of the path, breaking when the parent exceeds ourselves
    const ancestries = paths.map((path) => {
        const ancestry = [];

        do {
            ancestry.unshift(path);
        } while ((path = path.parentPath) && path !== this);

        // save min depth to avoid going too far in
        if (ancestry.length < minDepth) {
            minDepth = ancestry.length;
        }

        return ancestry;
    });

    // get the first ancestry so we have a seed to assess all other ancestries with
    const first = ancestries[0];

    // check ancestor equality
    depthLoop: for (let i = 0; i < minDepth; i++) {
        const shouldMatch = first[i];

        for (const ancestry of ancestries) {
            if (ancestry[i] !== shouldMatch) {
                // we've hit a snag
                break depthLoop;
            }
        }

        // next iteration may break so store these so they can be returned
        lastCommonIndex = i;
        lastCommon = shouldMatch;
    }

    if (lastCommon) {
        if (filter) {
            return filter(lastCommon, lastCommonIndex, ancestries);
        }
        return lastCommon;

    }
    throw new Error("Couldn't find intersection");

};

/**
 * Build an array of node paths containing the entire ancestry of the current node path.
 *
 * NOTE: The current node path is included in this.
 */

export const getAncestry = function () {
    let path = this;
    const paths = [];
    for ( ; ; ) {
        paths.push(path);
        path = path.parentPath;
        if (!path) {
            break;
        }
    }
    return paths;
};

/**
 * A helper to find if `this` path is an ancestor of @param maybeDescendant
 */
export const isAncestor = function (maybeDescendant) {
    return maybeDescendant.isDescendant(this);
};

/**
 * A helper to find if `this` path is a descendant of @param maybeAncestor
 */
export const isDescendant = function (maybeAncestor) {
    return Boolean(this.findParent((parent) => parent === maybeAncestor));
};

export const inType = function (...args) {
    let path = this;
    while (path) {
        for (const type of args) {
            if (path.node.type === type) {
                return true;
            }
        }
        path = path.parentPath;
    }

    return false;
};

/**
 * Checks whether the binding for 'key' is a local binding in its current function context.
 *
 * Checks if the current path either is, or has a direct parent function that is, inside
 * of a function that is marked for shadowing of a binding matching 'key'. Also returns
 * the parent path if the parent path is an arrow, since arrow functions pass through
 * binding values to their parent, meaning they have no local bindings.
 *
 * Shadowing means that when the given binding is transformed, it will read the binding
 * value from the container containing the shadow function, rather than from inside the
 * shadow function.
 *
 * Function shadowing is acheieved by adding a "shadow" property on "FunctionExpression"
 * and "FunctionDeclaration" node types.
 *
 * Node's "shadow" props have the following behavior:
 *
 * - Boolean true will cause the function to shadow both "this" and "arguments".
 * - {this: false} Shadows "arguments" but not "this".
 * - {arguments: false} Shadows "this" but not "arguments".
 *
 * Separately, individual identifiers can be flagged with two flags:
 *
 * - _forceShadow - If truthy, this specific identifier will be bound in the closest
 *    Function that is not flagged "shadow", or the Program.
 * - _shadowedFunctionLiteral - When set to a NodePath, this specific identifier will be bound
 *    to this NodePath/Node or the Program. If this path is not found relative to the
 *    starting location path, the closest function will be used.
 *
 * Please Note, these flags are for private internal use only and should be avoided.
 * Only "shadow" is a public property that other transforms may manipulate.
 */
export const inShadow = function (key) {
    const parentFn = this.isFunction() ? this : this.findParent((p) => p.isFunction());
    if (!parentFn) {
        return;
    }

    if (parentFn.isFunctionExpression() || parentFn.isFunctionDeclaration()) {
        const shadow = parentFn.node.shadow;

        // this is because sometimes we may have a `shadow` value of:
        //
        //   { this: false }
        //
        // we need to catch this case if `inShadow` has been passed a `key`
        if (shadow && (!key || shadow[key] !== false)) {
            return parentFn;
        }
    } else if (parentFn.isArrowFunctionExpression()) {
        return parentFn;
    }

    // normal function, we've found our function context
    return null;
};
