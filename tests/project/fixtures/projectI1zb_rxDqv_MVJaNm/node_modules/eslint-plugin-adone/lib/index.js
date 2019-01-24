module.exports = {
    rules: {
        "no-typeof": {
            meta: {
                docs: {
                    description: "disallow using typeof in comparison expressions"
                },
                fixable: "code"
            },
            create(context) {
                const fixable = new Set([
                    "string",
                    "number",
                    "function",
                    "undefined",
                    "boolean",
                    "symbol"
                ]);
                const sourceCode = context.getSourceCode();
                return {
                    BinaryExpression(node) {
                        if (node.left.type !== "UnaryExpression") {
                            return;
                        }
                        if (node.left.operator !== "typeof") {
                            return;
                        }
                        if (node.operator !== "===" && node.operator !== "!==" && node.operator !== "==" && node.operator !== "!=") {
                            return;
                        }
                        const negate = node.operator[0] === "!";

                        context.report({
                            node,
                            message: "typeof not allowed use adone.is",
                            fix(fixer) {
                                if (node.right.type !== "Literal") {
                                    return;
                                }
                                if (!fixable.has(node.right.value)) {
                                    return;
                                }
                                return fixer.replaceText(node, `${negate ? "!" : ""}is.${node.right.value}(${sourceCode.getText(node.left.argument)})`);
                            }
                        });
                    }
                };
            }
        },
        "no-buffer-isbuffer": {
            meta: {
                docs: {
                    description: "disallow using Buffer.isBuffer"
                },
                fixable: "code"
            },
            create(context) {
                return {
                    MemberExpression(node) {
                        if (
                            node.object.type === "Identifier" &&
                            node.object.name === "Buffer" &&
                            node.property.type === "Identifier" &&
                            node.property.name === "isBuffer"
                        ) {
                            context.report({
                                node,
                                message: "use adone.is.buffer instead",
                                fix(fixer) {
                                    return fixer.replaceText(node, "is.buffer");
                                }
                            });
                        }
                    }
                };
            }
        },
        "no-array-isarray": {
            meta: {
                docs: {
                    description: "disallow using Array.isArray"
                },
                fixable: "code"
            },
            create(context) {
                return {
                    MemberExpression(node) {
                        if (
                            node.object.type === "Identifier" &&
                            node.object.name === "Array" &&
                            node.property.type === "Identifier" &&
                            node.property.name === "isArray"
                        ) {
                            context.report({
                                node,
                                message: "use adone.is.array instead",
                                fix(fixer) {
                                    return fixer.replaceText(node, "is.array");
                                }
                            });
                        }
                    }
                };
            }
        },
        "no-buffer-constructor": {
            // remove when update to eslint 4
            meta: {
                docs: {
                    description: "disallow use of the Buffer() constructor"
                },
                schema: []
            },

            create(context) {
                return {
                    NewExpression(node) {
                        if (node.callee.name === "Buffer") {
                            context.report({
                                node,
                                message: "{{example}} is deprecated. Use Buffer.from(), Buffer.alloc(), or Buffer.allocUnsafe() instead.",
                                data: { example: "new Buffer()" }
                            });
                        }
                    }
                };
            }
        },
        "no-undefined-comp": {
            meta: {
                docs: {
                    description: "disallow comparison with undefined"
                },
                schema: [],
                fixable: "code"
            },

            create(context) {
                const sourceCode = context.getSourceCode();
                return {
                    BinaryExpression(node) {
                        const eq = node.operator === "==" || node.operator === "!=";
                        const eqeq = !eq && (node.operator === "===" || node.operator === "!==");
                        const negate = node.operator[0] === "!";
                        if (
                            (eq || eqeq) &&
                            (
                                node.right.type === "Identifier" && node.right.name === "undefined"
                            )
                        ) {
                            context.report({
                                node,
                                message: `use ${eq ? "adone.is.nil" : "adone.is.undefined"} instead`,
                                fix(fixer) {
                                    return fixer.replaceText(node, `${negate ? "!" : ""}${eq ? "is.nil" : "is.undefined"}(${sourceCode.getText(node.left)})`);
                                }
                            });
                        }
                    }
                };
            }
        },
        "no-null-comp": {
            meta: {
                docs: {
                    description: "disallow comparison with null"
                },
                schema: [],
                fixable: "code"
            },

            create(context) {
                const sourceCode = context.getSourceCode();
                return {
                    BinaryExpression(node) {
                        const eq = node.operator === "==" || node.operator === "!=";
                        const eqeq = !eq && node.operator === "===" || node.operator === "!==";
                        const negate = node.operator[0] === "!";
                        if (
                            (eq || eqeq) &&
                            (
                                node.right.type === "Literal" && node.right.raw === "null"
                            )
                        ) {
                            context.report({
                                node,
                                message: `use ${eq ? "adone.is.nil" : "adone.is.null"} instead`,
                                fix(fixer) {
                                    return fixer.replaceText(node, `${negate ? "!" : ""}${eq ? "is.nil" : "is.null"}(${sourceCode.getText(node.left)})`);
                                }
                            });
                        }
                    }
                };
            }
        },
        "no-isnan": {
            meta: {
                docs: {
                    description: "disallow using isNaN"
                }
            },
            create(context) {
                return {
                    CallExpression(node) {
                        if (node.callee.name === "isNaN") {
                            context.report({
                                node,
                                message: "isNaN is not allowed"
                            });
                        }
                    }
                };
            }
        },
        "no-number-methods": {
            meta: {
                docs: {
                    description: "disallow using Number.isNaN, Number.isFinite, Number.isInteger, Number.isSafeInteger"
                },
                fixable: "code"
            },
            create(context) {
                const replace = {
                    isNaN: "is.nan",
                    isFinite: "is.finite",
                    isInteger: "is.integer",
                    isSafeInteger: "is.safeInteger"
                };
                const m = {
                    isNaN: "use adone.is.nan instead",
                    isFinite: "use adone.is.finite instead",
                    isInteger: "use adone.is.integer instead",
                    isSafeInteger: "use adone.is.safeInteger instead"
                };
                return {
                    MemberExpression(node) {
                        if (
                            node.object.type === "Identifier" &&
                            node.object.name === "Number" &&
                            node.property.type === "Identifier"
                        ) {
                            const message = m[node.property.name];
                            if (message) {
                                context.report({
                                    node,
                                    message,
                                    fix(fixer) {
                                        return fixer.replaceText(node, replace[node.property.name]);
                                    }
                                });
                            }
                        }
                    }
                };
            }
        },
        "no-is.undefined-or-is.null": {
            meta: {
                docs: {
                    description: "disallow using is.undefined(t) || is.null(t)"
                },
                fixable: "code"
            },
            create(context) {
                const sourceCode = context.getSourceCode();
                return {
                    LogicalExpression(node) {
                        if (node.operator !== "||") {
                            return;
                        }
                        const { left, right } = node;
                        if (left.type !== "CallExpression" || right.type !== "CallExpression") {
                            return;
                        }
                        if (left.callee.type !== "MemberExpression" || right.callee.type !== "MemberExpression") {
                            return;
                        }
                        const { callee: leftc } = left;
                        const { callee: rightc } = right;
                        if (leftc.object.name !== "is" || rightc.object.name !== "is") {
                            return;
                        }
                        if (
                            (leftc.property.name === "undefined" && rightc.property.name === "null") ||
                            (leftc.property.name === "null" && rightc.property.name === "undefined")
                        ) {
                            if (left.arguments.length !== 1 || right.arguments.length !== 1) {
                                return;
                            }
                            const { arguments: [l] } = left;
                            const { arguments: [r] } = right;
                            if (l.type !== "Identifier" || r.type !== "Identifier") {
                                return;
                            }
                            if (l.name !== r.name) {
                                return;
                            }
                            context.report({
                                node,
                                message: "use adone.is.nil instead",
                                fix(fixer) {
                                    return fixer.replaceText(node, `is.nil(${sourceCode.getText(l)})`);
                                }
                            });
                        }
                    }
                };
            }
        },
        "no-not-is.undefined-and-not-is.null": {
            meta: {
                docs: {
                    description: "disallow using !is.undefined(t) && !is.null(t)"
                },
                fixable: "code"
            },
            create(context) {
                const sourceCode = context.getSourceCode();
                return {
                    LogicalExpression(node) {
                        if (node.operator !== "&&") {
                            return;
                        }
                        let { left, right } = node;
                        if (left.type !== "UnaryExpression" || right.type !== "UnaryExpression") {
                            return;
                        }
                        if (left.operator !== "!" || right.operator !== "!") {
                            return;
                        }
                        left = left.argument;
                        right = right.argument;
                        if (left.type !== "CallExpression" || right.type !== "CallExpression") {
                            return;
                        }

                        if (left.callee.type !== "MemberExpression" || right.callee.type !== "MemberExpression") {
                            return;
                        }
                        const { callee: leftc } = left;
                        const { callee: rightc } = right;
                        if (leftc.object.name !== "is" || rightc.object.name !== "is") {
                            return;
                        }
                        if (
                            (leftc.property.name === "undefined" && rightc.property.name === "null") ||
                            (leftc.property.name === "null" && rightc.property.name === "undefined")
                        ) {
                            if (left.arguments.length !== 1 || right.arguments.length !== 1) {
                                return;
                            }
                            const { arguments: [l] } = left;
                            const { arguments: [r] } = right;
                            if (l.type !== "Identifier" || r.type !== "Identifier") {
                                return;
                            }
                            if (l.name !== r.name) {
                                return;
                            }
                            context.report({
                                node,
                                message: "use !adone.is.nil instead",
                                fix(fixer) {
                                    return fixer.replaceText(node, `!is.nil(${sourceCode.getText(l)})`);
                                }
                            });
                        }
                    }
                };
            }
        },
        "no-function-expression-class-property": {
            meta: {
                docs: {
                    description: "disallow class properties to be like a = function () {"
                },
                fixable: "code"
            },
            create(context) {
                return {
                    ClassProperty(node) {
                        if (node.value && node.value.type === "FunctionExpression") {
                            context.report({
                                node,
                                message: "such properties are not allowed, define a method"
                            });
                        }
                    }
                };
            }
        },
        indexof: {
            meta: {
                docs: {
                    description: "report about a.indexOf(b) === -1, !== -1, > -1, < 0"
                }
            },
            create(context) {
                return {
                    BinaryExpression(node) {
                        const { right } = node;
                        let value;
                        if (right.type === "Literal" && typeof right.value === "number") {
                            value = right.value;
                        } else if (
                            right.type === "UnaryExpression" &&
                            right.operator === "-" &&
                            right.argument.type === "Literal" &&
                            typeof right.argument.value === "number"
                        ) {
                            value = -right.argument.value;
                        } else {
                            return;
                        }
                        const { left } = node;
                        if (left.type !== "CallExpression") {
                            return;
                        }
                        if (left.arguments.length !== 1) {
                            return;
                        }
                        if (left.callee.type !== "MemberExpression") {
                            return;
                        }
                        if (left.callee.property.type !== "Identifier" || left.callee.property.name !== "indexOf") {
                            return;
                        }
                        // it is an indexOf binary expression
                        const { operator } = node;
                        if (
                            ((operator === "===" || operator === "==") && value === -1) ||
                            (operator === "<" && value === 0)
                        ) {
                            context.report({
                                node,
                                message: "probably '!includes' is better"
                            });
                        } else if (
                            ((operator === "!==" || operator === "!=") && value === -1) ||
                            (operator === ">=" && value === 0)
                        ) {
                            context.report({
                                node,
                                message: "probably 'includes' is better"
                            });
                        }
                    }
                };
            }
        },
        "multiline-comment-indent": {
            meta: {
                docs: {
                    description: "identical multiline indent for jsdoc-like comments"
                },
                fixable: "code"
            },
            create(context) {
                const isValidComment = (node, indent) => {
                    let { value } = node;
                    if (value.startsWith("*\n")) {
                        value = value.slice(2);
                    } else {
                        return "multiline comments must be like\n/**\n *\n */";
                    }
                    const prefix = " ".repeat(indent);
                    const lines = value.split("\n");
                    for (let i = 0; i < lines.length; ++i) {
                        const x = lines[i];
                        if (i !== lines.length - 1 && x.trimLeft()[0] !== "*") {
                            return "each line must start with *";
                        }
                        if (!x.startsWith(prefix)) {
                            return "stars must have identical indent";
                        }
                        if (i === lines.length - 1) {
                            continue;
                        }
                        if (x[prefix.length] !== "*") {
                            // extra spaces case
                            return "stars must have identical indent";
                        }
                        if (x.length > prefix.length + 1) {
                            if (x[prefix.length + 1] !== " ") {
                                return "space must be after *";
                            }
                        }
                    }
                    return true;
                };

                const formatComment = (comment, indent) => {
                    if (comment.startsWith("*\n")) {
                        comment = comment.slice(2);
                    } else if (comment.startsWith("\n")) {
                        comment = comment.slice(1);
                    }
                    const i = " ".repeat(indent);
                    let lines = comment.split("\n");

                    if (lines.length === 1) {
                        let [line] = lines;
                        line = line.trimLeft();
                        if (line[0] === "*") {
                            line = line.slice(1);
                        }
                        line = line.trimRight();
                        return `/**\n${i}* ${line}\n${i}*/`;
                    }

                    lines = lines.map((x, idx, arr) => {
                        x = x.trim();
                        if (idx === arr.length - 1) {
                            return i;
                        }
                        if (!x.length) {
                            return `${i}*`;
                        }
                        let si = 0;
                        while (x[si] === "*") {
                            ++si;
                        }
                        x = x.slice(si);
                        if (!x.length) {
                            return `${i}*`;
                        }
                        if (x[0] !== " ") {
                            x = ` ${x}`;
                        }
                        return `${i}*${x}`;
                    });
                    return `/**\n${lines.join("\n")}*/`;
                };

                const checkLeadingComments = (node) => {
                    if (!node.leadingComments || node.leadingComments.length === 0) {
                        return;
                    }
                    for (const comment of node.leadingComments) {
                        if (comment.type !== "Block") {
                            continue;
                        }
                        const indent = comment.loc.start.column + 1;
                        const message = isValidComment(comment, indent);
                        if (message === true) {
                            continue;
                        }
                        context.report({
                            node: comment,
                            message,
                            fix(fixer) {
                                return fixer.replaceTextRange(comment.range, formatComment(comment.value, indent));
                            }
                        })
                    }
                };
                return {
                    MethodDefinition: checkLeadingComments,
                    FunctionDeclaration: checkLeadingComments,
                    VariableDeclaration: checkLeadingComments,
                    ExpressionStatement: checkLeadingComments,
                    ClassDeclaration: checkLeadingComments,
                    ExportNamedDeclaration: checkLeadingComments,
                    ExportDefaultDeclaration: checkLeadingComments
                }
            }
        }
    }
};
