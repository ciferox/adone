const { js: { compiler: { types: t } } } = adone;
const { react } = t;

export const ReferencedIdentifier = {
    types: ["Identifier", "JSXIdentifier"],
    checkPath({ node, parent }, opts) {
        if (!t.isIdentifier(node, opts) && !t.isJSXMemberExpression(parent, opts)) {
            if (t.isJSXIdentifier(node, opts)) {
                if (react.isCompatTag(node.name)) {
                    return false;
                }
            } else {
        // not a JSXIdentifier or an Identifier
                return false;
            }
        }

    // check if node is referenced
        return t.isReferenced(node, parent);
    }
};

export const ReferencedMemberExpression = {
    types: ["MemberExpression"],
    checkPath({ node, parent }) {
        return t.isMemberExpression(node) && t.isReferenced(node, parent);
    }
};

export const BindingIdentifier = {
    types: ["Identifier"],
    checkPath({ node, parent }) {
        return t.isIdentifier(node) && t.isBinding(node, parent);
    }
};

export const Statement = {
    types: ["Statement"],
    checkPath({ node, parent }) {
        if (t.isStatement(node)) {
            if (t.isVariableDeclaration(node)) {
                if (t.isForXStatement(parent, { left: node })) {
                    return false;
                }
                if (t.isForStatement(parent, { init: node })) {
                    return false;
                }
            }

            return true;
        }
        return false;

    }
};

export const Expression = {
    types: ["Expression"],
    checkPath(path) {
        if (path.isIdentifier()) {
            return path.isReferencedIdentifier();
        }
        return t.isExpression(path.node);

    }
};

export const Scope = {
    types: ["Scopable"],
    checkPath(path) {
        return t.isScope(path.node, path.parent);
    }
};

export const Referenced = {
    checkPath(path) {
        return t.isReferenced(path.node, path.parent);
    }
};

export const BlockScoped = {
    checkPath(path) {
        return t.isBlockScoped(path.node);
    }
};

export const Var = {
    types: ["VariableDeclaration"],
    checkPath(path) {
        return t.isVar(path.node);
    }
};

export const User = {
    checkPath(path) {
        return path.node && Boolean(path.node.loc);
    }
};

export const Generated = {
    checkPath(path) {
        return !path.isUser();
    }
};

export const Pure = {
    checkPath(path, opts) {
        return path.scope.isPure(path.node, opts);
    }
};

export const Flow = {
    types: ["Flow", "ImportDeclaration", "ExportDeclaration", "ImportSpecifier"],
    checkPath({ node }) {
        if (t.isFlow(node)) {
            return true;
        } else if (t.isImportDeclaration(node)) {
            return node.importKind === "type" || node.importKind === "typeof";
        } else if (t.isExportDeclaration(node)) {
            return node.exportKind === "type";
        } else if (t.isImportSpecifier(node)) {
            return node.importKind === "type" || node.importKind === "typeof";
        }
        return false;

    }
};
