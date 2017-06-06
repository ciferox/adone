import * as t from "./index";

const { is } = adone;

export const toComputedKey = (node, key = node.key || node.property) => {
    if (!node.computed) {
        if (t.isIdentifier(key)) {
            key = t.stringLiteral(key.name);
        }
    }
    return key;
};

/**
 * Turn an array of statement `nodes` into a `SequenceExpression`.
 *
 * Variable declarations are turned into simple assignments and their
 * declarations hoisted to the top of the current scope.
 *
 * Expression statements are just resolved to their expression.
 */
export const toSequenceExpression = (nodes, scope) => {
    if (!nodes || !nodes.length) {
        return;
    }

    const declars = [];
    let bailed = false;

    const convert = (nodes) => {
        let ensureLastUndefined = false;
        const exprs = [];

        for (const node of nodes) {
            if (t.isExpression(node)) {
                exprs.push(node);
            } else if (t.isExpressionStatement(node)) {
                exprs.push(node.expression);
            } else if (t.isVariableDeclaration(node)) {
                if (node.kind !== "var") {
                    return bailed = true;
                } // bailed

                for (const declar of node.declarations) {
                    const bindings = t.getBindingIdentifiers(declar);
                    for (const key in bindings) {
                        declars.push({
                            kind: node.kind,
                            id: bindings[key]
                        });
                    }

                    if (declar.init) {
                        exprs.push(t.assignmentExpression("=", declar.id, declar.init));
                    }
                }

                ensureLastUndefined = true;
                continue;
            } else if (t.isIfStatement(node)) {
                const consequent = node.consequent ? convert([node.consequent]) : scope.buildUndefinedNode();
                const alternate = node.alternate ? convert([node.alternate]) : scope.buildUndefinedNode();
                if (!consequent || !alternate) {
                    return bailed = true;
                }

                exprs.push(t.conditionalExpression(node.test, consequent, alternate));
            } else if (t.isBlockStatement(node)) {
                exprs.push(convert(node.body));
            } else if (t.isEmptyStatement(node)) {
                // empty statement so ensure the last item is undefined if we're last
                ensureLastUndefined = true;
                continue;
            } else {
                // bailed, we can't turn this statement into an expression
                return bailed = true;
            }

            ensureLastUndefined = false;
        }

        if (ensureLastUndefined || exprs.length === 0) {
            exprs.push(scope.buildUndefinedNode());
        }

        //

        if (exprs.length === 1) {
            return exprs[0];
        }
        return t.sequenceExpression(exprs);

    };

    const result = convert(nodes);
    if (bailed) {
        return;
    }

    for (let i = 0; i < declars.length; i++) {
        scope.push(declars[i]);
    }

    return result;
};

export const toKeyAlias = (node, key = node.key) => {
    let alias;

    if (node.kind === "method") {
        return `${toKeyAlias.increment()}`;
    } else if (t.isIdentifier(key)) {
        alias = key.name;
    } else if (t.isStringLiteral(key)) {
        alias = JSON.stringify(key.value);
    } else {
        alias = JSON.stringify(t.removePropertiesDeep(t.cloneDeep(key)));
    }

    if (node.computed) {
        alias = `[${alias}]`;
    }

    if (node.static) {
        alias = `static:${alias}`;
    }

    return alias;
};

toKeyAlias.uid = 0;

toKeyAlias.increment = () => {
    if (toKeyAlias.uid >= Number.MAX_SAFE_INTEGER) {
        return toKeyAlias.uid = 0;
    }
    return toKeyAlias.uid++;

};

export const toIdentifier = (name) => {
    name = `${name}`;

    // replace all non-valid identifiers with dashes
    name = name.replace(/[^a-zA-Z0-9$_]/g, "-");

    // remove all dashes and numbers from start of name
    name = name.replace(/^[-0-9]+/, "");

    // camel case
    name = name.replace(/[-\s]+(.)?/g, (match, c) => {
        return c ? c.toUpperCase() : "";
    });

    if (!t.isValidIdentifier(name)) {
        name = `_${name}`;
    }

    return name || "_";
};

export const toBindingIdentifierName = (name) => {
    name = toIdentifier(name);
    if (name === "eval" || name === "arguments") {
        name = `_${name}`;
    }
    return name;
};

export const toStatement = (node, ignore) => {
    if (t.isStatement(node)) {
        return node;
    }

    let mustHaveId = false;
    let newType;

    if (t.isClass(node)) {
        mustHaveId = true;
        newType = "ClassDeclaration";
    } else if (t.isFunction(node)) {
        mustHaveId = true;
        newType = "FunctionDeclaration";
    } else if (t.isAssignmentExpression(node)) {
        return t.expressionStatement(node);
    }

    if (mustHaveId && !node.id) {
        newType = false;
    }

    if (!newType) {
        if (ignore) {
            return false;
        }
        throw new Error(`cannot turn ${node.type} to a statement`);

    }

    node.type = newType;

    return node;
};

export const toExpression = (node) => {
    if (t.isExpressionStatement(node)) {
        node = node.expression;
    }

    // return unmodified node
    // important for things like ArrowFunctions where
    // type change from ArrowFunction to FunctionExpression
    // produces bugs like -> `()=>a` to `function () a`
    // without generating a BlockStatement for it
    // ref: https://github.com/babel/babili/issues/130
    if (t.isExpression(node)) {
        return node;
    }

    // convert all classes and functions
    // ClassDeclaration -> ClassExpression
    // FunctionDeclaration, ObjectMethod, ClassMethod -> FunctionExpression
    if (t.isClass(node)) {
        node.type = "ClassExpression";
    } else if (t.isFunction(node)) {
        node.type = "FunctionExpression";
    }

    // if it's still not an expression
    if (!t.isExpression(node)) {
        throw new Error(`cannot turn ${node.type} to an expression`);
    }

    return node;
};

export const toBlock = (node, parent) => {
    if (t.isBlockStatement(node)) {
        return node;
    }

    if (t.isEmptyStatement(node)) {
        node = [];
    }

    if (!is.array(node)) {
        if (!t.isStatement(node)) {
            if (t.isFunction(parent)) {
                node = t.returnStatement(node);
            } else {
                node = t.expressionStatement(node);
            }
        }

        node = [node];
    }

    return t.blockStatement(node);
};

export const valueToNode = (value) => {
    if (is.undefined(value)) {
        return t.identifier("undefined");
    }

    if (is.boolean(value)) {
        return t.booleanLiteral(value);
    }

    if (is.null(value)) {
        return t.nullLiteral();
    }

    if (is.string(value)) {
        return t.stringLiteral(value);
    }

    if (is.number(value)) {
        return t.numericLiteral(value);
    }

    if (is.regexp(value)) {
        const pattern = value.source;
        const flags = value.toString().match(/\/([a-z]+|)$/)[1];
        return t.regExpLiteral(pattern, flags);
    }

    if (is.array(value)) {
        return t.arrayExpression(value.map(t.valueToNode));
    }

    // object
    if (is.plainObject(value)) {
        const props = [];
        for (const key in value) {
            let nodeKey;
            if (t.isValidIdentifier(key)) {
                nodeKey = t.identifier(key);
            } else {
                nodeKey = t.stringLiteral(key);
            }
            props.push(t.objectProperty(nodeKey, t.valueToNode(value[key])));
        }
        return t.objectExpression(props);
    }

    throw new Error("don't know how to turn this value into a node");
};
