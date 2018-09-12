// This file contains methods responsible for dealing with/retrieving children or siblings.

import NodePath from "./index";

const {
    is,
    js: { compiler: { types: t } }
} = adone;

export const getOpposite = function () {
    if (this.key === "left") {
        return this.getSibling("right");
    } else if (this.key === "right") {
        return this.getSibling("left");
    }
};

const addCompletionRecords = function (path, paths) {
    if (path) {
        return paths.concat(path.getCompletionRecords());
    }
    return paths;
};

export const getCompletionRecords = function () {
    let paths = [];

    if (this.isIfStatement()) {
        paths = addCompletionRecords(this.get("consequent"), paths);
        paths = addCompletionRecords(this.get("alternate"), paths);
    } else if (this.isDoExpression() || this.isFor() || this.isWhile()) {
        paths = addCompletionRecords(this.get("body"), paths);
    } else if (this.isProgram() || this.isBlockStatement()) {
        paths = addCompletionRecords(this.get("body").pop(), paths);
    } else if (this.isFunction()) {
        return this.get("body").getCompletionRecords();
    } else if (this.isTryStatement()) {
        paths = addCompletionRecords(this.get("block"), paths);
        paths = addCompletionRecords(this.get("handler"), paths);
        paths = addCompletionRecords(this.get("finalizer"), paths);
    } else if (this.isCatchClause()) {
        paths = addCompletionRecords(this.get("body"), paths);
    } else {
        paths.push(this);
    }

    return paths;
};

export const getSibling = function (key) {
    return NodePath.get({
        parentPath: this.parentPath,
        parent: this.parent,
        container: this.container,
        listKey: this.listKey,
        key
    });
};

export const getPrevSibling = function () {
    return this.getSibling(this.key - 1);
};

export const getNextSibling = function () {
    return this.getSibling(this.key + 1);
};

export const getAllNextSiblings = function () {
    let _key = this.key;
    let sibling = this.getSibling(++_key);
    const siblings = [];
    while (sibling.node) {
        siblings.push(sibling);
        sibling = this.getSibling(++_key);
    }
    return siblings;
};

export const getAllPrevSiblings = function () {
    let _key = this.key;
    let sibling = this.getSibling(--_key);
    const siblings = [];
    while (sibling.node) {
        siblings.push(sibling);
        sibling = this.getSibling(--_key);
    }
    return siblings;
};

export const get = function (key, context) {
    if (context === true) {
        context = this.context;
    }
    const parts = key.split(".");
    if (parts.length === 1) {
        // "foo"
        return this._getKey(key, context);
    }
    // "foo.bar"
    return this._getPattern(parts, context);
};

export const _getKey = function (key, context) {
    const node = this.node;
    const container = node[key];

    if (is.array(container)) {
        // requested a container so give them all the paths
        return container.map((_, i) => {
            return NodePath.get({
                listKey: key,
                parentPath: this,
                parent: node,
                container,
                key: i
            }).setContext(context);
        });
    }
    return NodePath.get({
        parentPath: this,
        parent: node,
        container: node,
        key
    }).setContext(context);

};

export const _getPattern = function (parts, context) {
    let path = this;
    for (const part of (parts)) {
        if (part === ".") {
            path = path.parentPath;
        } else {
            if (is.array(path)) {
                path = path[part];
            } else {
                path = path.get(part, context);
            }
        }
    }
    return path;
};

export const getBindingIdentifiers = function (duplicates) {
    return t.getBindingIdentifiers(this.node, duplicates);
};

export const getOuterBindingIdentifiers = function (duplicates) {
    return t.getOuterBindingIdentifiers(this.node, duplicates);
};

// original source - https://github.com/babel/babel/blob/master/packages/babel-types/src/retrievers.js
// path.getBindingIdentifiers returns nodes where the following re-implementation
// returns paths
export const getBindingIdentifierPaths = function (
    duplicates = false,
    outerOnly = false,
) {
    const path = this;
    let search = [].concat(path);
    const ids = Object.create(null);

    while (search.length) {
        const id = search.shift();
        if (!id) {
            continue;
        }
        if (!id.node) {
            continue;
        }

        const keys = t.getBindingIdentifiers.keys[id.node.type];

        if (id.isIdentifier()) {
            if (duplicates) {
                const _ids = (ids[id.node.name] = ids[id.node.name] || []);
                _ids.push(id);
            } else {
                ids[id.node.name] = id;
            }
            continue;
        }

        if (id.isExportDeclaration()) {
            const declaration = id.get("declaration");
            if (declaration.isDeclaration()) {
                search.push(declaration);
            }
            continue;
        }

        if (outerOnly) {
            if (id.isFunctionDeclaration()) {
                search.push(id.get("id"));
                continue;
            }
            if (id.isFunctionExpression()) {
                continue;
            }
        }

        if (keys) {
            for (let i = 0; i < keys.length; i++) {
                const key = keys[i];
                const child = id.get(key);
                if (is.array(child) || child.node) {
                    search = search.concat(child);
                }
            }
        }
    }

    return ids;
};

export const getOuterBindingIdentifierPaths = function (duplicates) {
    return this.getBindingIdentifierPaths(duplicates, true);
};
