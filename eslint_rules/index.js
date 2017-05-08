module.exports = {
    rules: {
        "no-typeof": {
            meta: {
                docs: {
                    description: "disallow using typeof"
                }
            },
            create(context) {
                return {
                    UnaryExpression(node) {
                        if (node.operator === "typeof") {
                            context.report({
                                node,
                                message: "typeof not allowed use adone.is"
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
                schema: []
            },

            create(context) {
                return {
                    BinaryExpression(node) {
                        const eq = node.operator === "==";
                        const eqeq = !eq && node.operator === "===";
                        if (
                            (eq || eqeq) &&
                            (
                                (node.right.type === "Identifier" && node.right.name === "undefined") ||
                                (node.left.type === "Identifier" && node.left.name === "undefined")
                            )
                        ) {
                            context.report({
                                node,
                                message: `use ${eq ? "adone.is.nil" : "adone.is.undefined"} instead`
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
                schema: []
            },

            create(context) {
                return {
                    BinaryExpression(node) {
                        const eq = node.operator === "==";
                        const eqeq = !eq && node.operator === "===";
                        if (
                            (eq || eqeq) &&
                            (
                                (node.right.type === "Literal" && node.right.raw === "null") ||
                                (node.left.type === "Literal" && node.left.raw === "null")
                            )
                        ) {
                            context.report({
                                node,
                                message: `use ${eq ? "adone.is.nil" : "adone.is.null"} instead`
                            });
                        }
                    }
                };
            }
        }
    }
};
