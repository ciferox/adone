const { is } = adone;

const objToAst = (t, obj) => {
    if (is.number(obj)) {
        return t.numericLiteral(obj);
    }
    if (is.array(obj)) {
        return t.arrayExpression(obj.map((x) => objToAst(t, x)));
    }
    return t.objectExpression(Object.entries(obj).map(([k, v]) => {
        return t.objectProperty(t.identifier(k), objToAst(t, v));
    }));
};

const skip = Symbol("skip");
const skipNode = (node) => {
    node[skip] = true;
    return node;
};
const isSkipped = (node) => node[skip] === true || !node.loc;
const ignoreRegexp = /ignore coverage/;
const shouldBeIgnored = (node) => {
    if (!node.leadingComments) {
        return false;
    }
    for (const n of node.leadingComments) {
        if (ignoreRegexp.test(n.value)) {
            return true;
        }
    }
    return false;
};

export default ({ types: t }) => {
    const cov = t.memberExpression(
        t.identifier("global"),
        t.callExpression(
            t.memberExpression(t.memberExpression(t.identifier("global"), t.identifier("Symbol")), t.identifier("for")),
            [t.stringLiteral("adone:coverage")]
        ),
        true
    );
    return {
        visitor: {
            Program: {
                enter(path, state) {
                    const id = path.scope.generateUidIdentifier("cov");
                    const covStats = {
                        b: [],
                        s: [],
                        f: [],
                        bMap: [],
                        sMap: [],
                        fMap: [],
                        ignored: []
                    };
                    const notify = (path, type) => {
                        if (isSkipped(path.node)) {
                            return null;
                        }
                        const { start, end } = path.node.loc;
                        if (!covStats[type]) {
                            covStats[type] = [];
                        }
                        const index = covStats[type].length;
                        covStats[type].push(0);
                        covStats[`${type}Map`].push({ start, end });

                        const node = t.expressionStatement(
                            t.updateExpression(
                                "++",
                                t.memberExpression(
                                    t.memberExpression(
                                        id,
                                        t.identifier(type)
                                    ),
                                    t.numericLiteral(index),
                                    true // computed
                                ),
                                true // prefix
                            )
                        );
                        skipNode(node);
                        return node;
                    };
                    const notifyBranch = (path) => notify(path, "b");
                    const notifyFunction = (path) => notify(path, "f");
                    const notifyStatement = (path) => notify(path, "s");
                    const ignore = (node) => {
                        if (!node.loc) {
                            return;
                        }
                        const { start, end } = node.loc;
                        covStats.ignored.push({ start, end });
                    };
                    path.traverse({
                        BlockStatement(path) {
                            if (shouldBeIgnored(path.node)) {
                                path.skip();
                                ignore(path.node);
                            }
                        },
                        ArrowFunctionExpression(path) {
                            if (isSkipped(path.node)) {
                                return;
                            }
                            if (shouldBeIgnored(path.node)) {
                                path.skip();
                                ignore(path.node);
                                return;
                            }
                            if (path.node.expression) {
                                const { loc } = path.node.body;
                                const ret = t.returnStatement(path.node.body);
                                skipNode(ret);
                                path.node.body = t.blockStatement([ret]);
                                path.node.body.loc = loc;
                                path.node.expression = false;
                            }
                            const body = path.get("body");
                            body.unshiftContainer("body", notifyFunction(body));
                        },
                        BreakStatement(path) {
                            if (isSkipped(path.node)) {
                                return;
                            }
                            if (shouldBeIgnored(path.node)) {
                                path.skip();
                                ignore(path.node);
                                return;
                            }
                            path.insertBefore(notifyStatement(path));
                        },
                        ContinueStatement(path) {
                            if (isSkipped(path.node)) {
                                return;
                            }
                            if (shouldBeIgnored(path.node)) {
                                path.skip();
                                ignore(path.node);
                                return;
                            }
                            path.insertBefore(notifyStatement(path));
                        },
                        DebuggerStatement(path) {
                            if (isSkipped(path.node)) {
                                return;
                            }
                            if (shouldBeIgnored(path.node)) {
                                path.skip();
                                ignore(path.node);
                                return;
                            }
                            path.insertBefore(notifyStatement(path));
                        },
                        ReturnStatement(path) {
                            if (isSkipped(path.node)) {
                                return;
                            }
                            if (shouldBeIgnored(path.node)) {
                                path.skip();
                                ignore(path.node);
                                return;
                            }
                            path.insertBefore(notifyStatement(path));
                        },
                        ThrowStatement(path) {
                            if (isSkipped(path.node)) {
                                return;
                            }
                            if (shouldBeIgnored(path.node)) {
                                path.skip();
                                ignore(path.node);
                                return;
                            }
                            path.insertBefore(notifyStatement(path));
                        },
                        TryStatement(path) {
                            if (isSkipped(path.node)) {
                                return;
                            }
                            if (shouldBeIgnored(path.node)) {
                                path.skip();
                                ignore(path.node);
                                return;
                            }
                            path.insertBefore(notifyStatement(path));
                            if (path.has("handler")) {
                                const handlerBody = path.get("handler.body");
                                if (!shouldBeIgnored(handlerBody.node)) {
                                    handlerBody.unshiftContainer("body", notifyBranch(handlerBody));
                                }
                            }
                        },
                        ExpressionStatement(path) {
                            if (isSkipped(path.node)) {
                                return;
                            }
                            if (shouldBeIgnored(path.node)) {
                                path.skip();
                                ignore(path.node);
                                return;
                            }
                            path.insertBefore(notifyStatement(path));
                        },
                        IfStatement(path) {
                            if (isSkipped(path.node)) {
                                return;
                            }
                            if (shouldBeIgnored(path.node)) {
                                path.skip();
                                ignore(path.node);
                                return;
                            }
                            if (!t.isIfStatement(path.parent)) {
                                path.insertBefore(notifyStatement(path));
                            }
                            const consequent = path.get("consequent");
                            if (!t.isBlockStatement(consequent.node)) {
                                path.node.consequent = t.blockStatement([consequent.node]);
                                if (!shouldBeIgnored(consequent.node)) {
                                    path.get("consequent").unshiftContainer("body", notifyBranch(consequent));
                                }
                            } else if (!shouldBeIgnored(consequent.node)) {
                                consequent.unshiftContainer("body", notifyBranch(consequent));
                            }
                            if (path.has("alternate")) {
                                const alternate = path.get("alternate");
                                if (t.isIfStatement(alternate.node)) {
                                    if (shouldBeIgnored(alternate.node)) {
                                        ignore(alternate.node);
                                    }
                                    alternate.replaceWith(t.blockStatement([
                                        alternate.node
                                    ]));
                                } else if (!t.isBlockStatement(alternate.node)) {
                                    path.node.alternate = t.blockStatement([alternate.node]);
                                    if (!shouldBeIgnored(alternate.node)) {
                                        path.get("alternate").unshiftContainer("body", notifyBranch(alternate));
                                    }
                                } else if (!shouldBeIgnored(alternate.node)) {
                                    alternate.unshiftContainer("body", notifyBranch(alternate));
                                }
                            }
                        },
                        ForStatement(path) {
                            if (isSkipped(path.node)) {
                                return;
                            }
                            if (shouldBeIgnored(path.node)) {
                                path.skip();
                                ignore(path.node);
                                return;
                            }
                            path.insertBefore(notifyStatement(path));
                            if (path.has("update")) {
                                const update = path.get("update");
                                if (!shouldBeIgnored(update.node)) {
                                    path.node.update = t.sequenceExpression([
                                        notifyBranch(update).expression,
                                        path.node.update
                                    ]);
                                    skipNode(path.node.update);
                                } else {
                                    ignore(update.node);
                                }
                            }
                            if (!t.isBlockStatement(path.node.body)) {
                                const body = path.get("body");
                                if (!shouldBeIgnored(body.node)) {
                                    path.node.body = t.blockStatement([path.node.body]);
                                    skipNode(path.node.body);
                                    path.get("body").unshiftContainer("body", notifyBranch(body));
                                }
                            } else {
                                const body = path.get("body");
                                if (!shouldBeIgnored(body.node)) {
                                    body.unshiftContainer("body", notifyBranch(body));
                                }
                            }
                        },
                        ForInStatement(path) {
                            if (isSkipped(path.node)) {
                                return;
                            }
                            if (shouldBeIgnored(path.node)) {
                                path.skip();
                                ignore(path.node);
                                return;
                            }
                            path.insertBefore(notifyStatement(path));
                            if (!t.isBlockStatement(path.node.body)) {
                                const body = path.get("body");
                                if (!shouldBeIgnored(body.node)) {
                                    path.node.body = t.blockStatement([path.node.body]);
                                    skipNode(path.node.body);
                                    path.get("body").unshiftContainer("body", notifyBranch(body));
                                }
                            } else {
                                const body = path.get("body");
                                if (!shouldBeIgnored(body.node)) {
                                    body.unshiftContainer("body", notifyBranch(body));
                                }
                            }
                        },
                        ForOfStatement(path) {
                            if (isSkipped(path.node)) {
                                return;
                            }
                            if (shouldBeIgnored(path.node)) {
                                path.skip();
                                ignore(path.node);
                                return;
                            }
                            path.insertBefore(notifyStatement(path));
                            if (!t.isBlockStatement(path.node.body)) {
                                const body = path.get("body");
                                if (!shouldBeIgnored(body.node)) {
                                    path.node.body = t.blockStatement([path.node.body]);
                                    skipNode(path.node.body);
                                    path.get("body").unshiftContainer("body", notifyBranch(body));
                                }
                            } else {
                                const body = path.get("body");
                                if (!shouldBeIgnored(body.node)) {
                                    body.unshiftContainer("body", notifyBranch(body));
                                }
                            }
                        },
                        WhileStatement(path) {
                            if (isSkipped(path.node)) {
                                return;
                            }
                            if (shouldBeIgnored(path.node)) {
                                path.skip();
                                ignore(path.node);
                                return;
                            }
                            path.insertBefore(notifyStatement(path));
                            if (!t.isBlockStatement(path.node.body)) {
                                const body = path.get("body");
                                if (!shouldBeIgnored(body.node)) {
                                    path.node.body = t.blockStatement([path.node.body]);
                                    skipNode(path.node.body);
                                    path.get("body").unshiftContainer("body", notifyBranch(body));
                                }
                            } else {
                                const body = path.get("body");
                                if (!shouldBeIgnored(body.node)) {
                                    body.unshiftContainer("body", notifyBranch(body));
                                }
                            }
                        },
                        DoWhileStatement(path) {
                            if (isSkipped(path.node)) {
                                return;
                            }
                            if (shouldBeIgnored(path.node)) {
                                path.skip();
                                ignore(path.node);
                                return;
                            }
                            path.insertBefore(notifyStatement(path));
                            if (!t.isBlockStatement(path.node.body)) {
                                path.node.body = t.blockStatement([path.node.body]);
                            }
                            if (!shouldBeIgnored(path.node.test)) {
                                path.node.test = t.sequenceExpression([
                                    notifyBranch(path.get("test")).expression,
                                    path.node.test
                                ]);
                                skipNode(path.node.test);
                            } else {
                                ignore(path.node.test);
                            }
                        },
                        SwitchStatement(path) {
                            if (isSkipped(path.node)) {
                                return;
                            }
                            if (shouldBeIgnored(path.node)) {
                                path.skip();
                                ignore(path.node);
                                return;
                            }
                            path.insertBefore(notifyStatement(path));
                        },
                        SwitchCase(path) {
                            if (isSkipped(path.node)) {
                                return;
                            }
                            if (shouldBeIgnored(path.node)) {
                                path.skip();
                                ignore(path.node);
                                return;
                            }
                            path.unshiftContainer("consequent", notifyBranch(path));
                        },
                        // WithStatement(path) {
                        //     if (isSkipped(path.node)) {
                        //         return;
                        //     }
                        //     path.insertBefore(notifyStatement(path));
                        // },
                        FunctionDeclaration(path) {
                            if (isSkipped(path.node)) {
                                return;
                            }
                            if (shouldBeIgnored(path.node)) {
                                path.skip();
                                ignore(path.node);
                                return;
                            }
                            if (
                                path.parent &&
                                (t.isExportDefaultDeclaration(path.parent) || t.isExportNamedDeclaration(path.parent))
                            ) {
                                path.parentPath.insertBefore(notifyStatement(path));
                            } else {
                                path.insertBefore(notifyStatement(path));
                            }
                            const body = path.get("body");
                            body.unshiftContainer("body", notifyFunction(body));
                        },
                        FunctionExpression(path) {
                            if (isSkipped(path.node)) {
                                return;
                            }
                            if (shouldBeIgnored(path.node)) {
                                path.skip();
                                ignore(path.node);
                                return;
                            }
                            const body = path.get("body");
                            body.unshiftContainer("body", notifyFunction(body));
                        },
                        // LabeledStatement(path) {
                        //     if (isSkipped(path.node)) {
                        //         return;
                        //     }
                        //     path.insertBefore(notifyStatement(path));
                        // },
                        ConditionalExpression(path) {
                            if (isSkipped(path.node)) {
                                return;
                            }
                            if (shouldBeIgnored(path.node)) {
                                path.skip();
                                ignore(path.node);
                                return;
                            }
                            if (!isSkipped(path.node.consequent)) {
                                if (!shouldBeIgnored(path.node.consequent)) {
                                    path.node.consequent = t.sequenceExpression([
                                        notifyBranch(path.get("consequent")).expression,
                                        path.node.consequent
                                    ]);
                                } else {
                                    ignore(path.node.consequent);
                                }
                            }
                            if (!isSkipped(path.node.alternate)) {
                                if (!shouldBeIgnored(path.node.alternate)) {
                                    path.node.alternate = t.sequenceExpression([
                                        notifyBranch(path.get("alternate")).expression,
                                        path.node.alternate
                                    ]);
                                } else {
                                    ignore(path.node.alternate);
                                }
                            }
                        },
                        LogicalExpression(path) {
                            if (isSkipped(path.node)) {
                                return;
                            }
                            if (shouldBeIgnored(path.node)) {
                                path.skip();
                                ignore(path.node);
                                return;
                            }
                            if (!isSkipped(path.node.left) && !t.isLogicalExpression(path.node.left)) {
                                if (!shouldBeIgnored(path.node.left)) {
                                    path.node.left = t.sequenceExpression([
                                        notifyBranch(path.get("left")).expression,
                                        path.node.left
                                    ]);
                                } else {
                                    ignore(path.node.left);
                                }
                            }
                            if (!isSkipped(path.node.right)) {
                                if (!shouldBeIgnored(path.node.right)) {
                                    path.node.right = t.sequenceExpression([
                                        notifyBranch(path.get("right")).expression,
                                        path.node.right
                                    ]);
                                } else {
                                    ignore(path.node.right);
                                }
                            }
                        },
                        VariableDeclaration(path) {
                            if (isSkipped(path.node)) {
                                return;
                            }
                            if (shouldBeIgnored(path.node)) {
                                path.skip();
                                ignore(path.node);
                                return;
                            }
                            if (
                                path.parent &&
                                (
                                    t.isForOfStatement(path.parent) ||
                                    t.isForInStatement(path.parent) ||
                                    t.isForStatement(path.parent))
                            ) {
                                return;
                            }
                            if (path.parent && t.isExportNamedDeclaration(path.parent)) {
                                path.parentPath.insertBefore(notifyStatement(path));
                            } else {
                                path.insertBefore(notifyStatement(path));
                            }
                        },
                        ClassMethod(path) {
                            if (isSkipped(path.node)) {
                                return;
                            }
                            if (shouldBeIgnored(path.node)) {
                                path.skip();
                                ignore(path.node);
                                return;
                            }
                            path.get("body").unshiftContainer("body", notifyFunction(path));
                        },
                        ObjectMethod(path) {
                            if (isSkipped(path.node)) {
                                return;
                            }
                            if (shouldBeIgnored(path.node)) {
                                path.skip();
                                ignore(path.node);
                                return;
                            }
                            path.get("body").unshiftContainer("body", notifyFunction(path));
                        },
                        AssignmentPattern(path) {
                            if (isSkipped(path.node)) {
                                return;
                            }
                            if (shouldBeIgnored(path.node)) {
                                path.skip();
                                ignore(path.node);
                                return;
                            }
                            path.node.right = t.sequenceExpression([
                                notifyBranch(path.get("right")).expression,
                                path.node.right
                            ]);
                            skipNode(path.node.right);
                        },
                        ClassDeclaration(path) {
                            if (isSkipped(path.node)) {
                                return;
                            }
                            if (shouldBeIgnored(path.node)) {
                                path.skip();
                                ignore(path.node);
                                return;
                            }
                            if (
                                path.parent &&
                                (
                                    t.isExportDefaultDeclaration(path.parent) ||
                                    t.isExportNamedDeclaration(path.parent)
                                )
                            ) {
                                path.parentPath.insertBefore(notifyStatement(path));
                            } else {
                                path.insertBefore(notifyStatement(path));
                            }
                        }
                    });
                    const statsVar = t.variableDeclaration("const", [
                        t.variableDeclarator(
                            id,
                            t.assignmentExpression(
                                "=",
                                t.memberExpression(
                                    cov,
                                    t.stringLiteral(state.file.opts.filename),
                                    true // computed
                                ),
                                objToAst(t, covStats)
                            )
                        )
                    ]);
                    skipNode(statsVar);
                    path.unshiftContainer("body", statsVar);

                    const assignment = t.expressionStatement(t.assignmentExpression("=", cov, t.objectExpression([])));
                    skipNode(assignment);
                    const ifStatement = t.ifStatement(t.unaryExpression("!", cov), t.blockStatement([assignment]));
                    skipNode(ifStatement);
                    path.unshiftContainer("body", ifStatement);
                }
            }
        }
    };
};
