const {
    error,
    is,
    js: { walk, compiler: { types: t } },
    realm: { code },
    std: { path }
} = adone;

const TYPES = [
    "BlockStatement",
    "ReturnStatement",
    "Identifier",
    "FunctionDeclaration",
    "VariableDeclaration",
    "VariableDeclarator",
    "MemberExpression",
    "ObjectExpression",
    "ArrayExpression",
    "NewExpression",
    "CallExpression",
    "DoExpression",
    "FunctionExpression",
    "ArrowFunctionExpression",
    "StringLiteral",
    "NumericLiteral",
    "BooleanLiteral",
    "RegExpLiteral",
    "TemplateLiteral",
    "NullLiteral",
    "ObjectPattern",
    "ObjectProperty"
];

const visitors = {};

for (const t of TYPES) {
    visitors[t] = {
        enter(astNode, astProcessor, ancestors) {
            const name = `enter${t}`;
            const method = astProcessor[name];
            if (is.function(method)) {
                const node = astProcessor.createNode(t, astNode);
                method.call(astProcessor, node, ancestors);
                astProcessor.nodes.push(node);
            } else {
                throw new error.NotImplementedException(`AST processor method is not implemented: ${name}`);
            }
        },
        exit(astNode, astProcessor, ancestors) {
            const name = `exit${t}`;
            const method = astProcessor[name];
            if (is.function(method)) {
                method.call(astProcessor, astNode, ancestors);
            }
            astProcessor.nodes.pop();
        }
    };
}
// ImportDeclaration(node, astProcessor, ancestors) {
//     const modPath = astProcessor.addDependency(node.source.value);

//     for (const specifier of node.specifiers) {
//         if (t.isImportDefaultSpecifier(specifier)) {
//             astProcessor.scopes.top.add(new code.ExternalVariable(specifier.local.name, modPath));
//         }
//     }
// },
// VariableDeclaration(node, astProcessor, ancestors) {
//     astProcessor.processVariableDeclaration(node, ancestors);
// },
// CallExpression(node, astProcessor, ancestors) {
//     if (node.callee.name === "require" && t.isStringLiteral(node.arguments[0])) {
//         astProcessor.addDependency(node.arguments[0].value);
//     }
// },
// ExpressionStatement(node, astProcessor, ancestors) {
//     // Process adone lazyfier
//     if (astProcessor.isADONELazifier(node.expression)) {
//         const objExpr = node.expression.arguments[0];
//         if (t.isObjectExpression(objExpr)) {
//             astProcessor.scanLazifyProps(objExpr.properties);
//         }
//         node.expression.arguments.forEach((arg) => walk.ancestor(arg, visitors, astProcessor));
//     }

//     walk.ancestor(node.expression, visitors, astProcessor);
// },

export default class AstProcessor {
    #functionParams = [];

    constructor({ module, virtualPath } = {}) {
        this.module = module;
        this.modulePaths = new Set();
        this.scopes = adone.collection.Stack.from([module.scope]);
        this.nodes = new adone.collection.Stack([null]);
        this.virtualPath = virtualPath;
        this.body = [];

        // start
        walk.ancestor(module.ast.program, visitors, this);

        // 
    }

    createNode(type, astNode) {
        const NodeClass = code[type];
        if (is.undefined(NodeClass)) {
            throw new error.UnknownException(`Unknown type of node: ${type}`);
        }

        const node = new NodeClass(astNode, this.nodes.top, this.scopes.top);

        if (is.null(this.nodes.top)) {
            this.body.push(node);
        }

        return node;
    }

    enterBlockStatement(node, ancestors) {
        const parentAstNode = ancestors[ancestors.length - 2];
        let scope;
        if (t.isFunctionDeclaration(parentAstNode) || t.isFunctionExpression(parentAstNode) || t.isArrowFunctionExpression(parentAstNode)) {
            scope = new code.FunctionScope();
            this.nodes.top.scope = scope; // Set scope in function node
        } else {
            scope = new code.BlockScope();
        }

        this.scopes.top.addChild(scope);
        this.scopes.push(scope);

        // handle function params
        if (this.#functionParams.length > 0) {
            for (const param of this.#functionParams) {
                if (t.isObjectPattern(param.node.ast)) {
                    for (const prop of param.node.properties) {
                        if (t.isIdentifier(prop.key.ast)) {
                            this.#addDeclaration({
                                name: prop.key.ast.name,
                                node: prop.key,
                                value: prop.value
                            });
                        }
                    }
                } else {
                    this.#addDeclaration(param);
                }
            }
            this.#functionParams.length = 0;
        }
    }

    exitBlockStatement() {
        this.scopes.pop();
    }

    enterReturnStatement(node) {

    }

    enterFunctionDeclaration(node, ancestors) {
        this.#addDeclaration({
            name: node.ast.id.name,
            node
        });

        // astProcessor.processBlockStatement(node, scope);
    }

    enterVariableDeclaration(node, ancestors) {
        // const initNode = node.declarations[0].init;

        // // Process adone lazyfier
        // if (astProcessor.isADONELazifier(initNode)) {
        //     const objExpr = initNode.arguments[0];
        //     if (t.isObjectExpression(objExpr)) {
        //         astProcessor.scanLazifyProps(objExpr.properties);
        //     }
        //     initNode.arguments.forEach((arg) => walk.ancestor(arg, visitors, astProcessor));
        // }

        // for (const decl of node.declarations) {
        //     this.processVariableDeclarator(decl);
        // }
    }

    enterVariableDeclarator(node) {
        const astNode = node.ast;

        if (t.isIdentifier(astNode.id)) {
            this.#addDeclaration({
                name: astNode.id.name,
                node
            });

            // else if (t.isExpression(node.init)) {
            //     this.scopes.top.add(new code.Variable(node.id.name, new code.Reference(node.init.name)));
            //     // if (t.isFunctionExpression(node.init) || t.isArrowFunctionExpression(node.init)) {
            //     //     this.scopes.top.add(new code.Variable(node.id.name, new code.Function(node.init, null /* TODO */, {
            //     //         isArrow: t.isArrowFunctionExpression(node.init)
            //     //     })));

            //     //     // this.processBlockStatement(funcScope);
            //     // } else {
            //     //     this.scopes.top.add(new code.Variable(node.id.name, new code.Expression(node.init)));
            //     //     walk.ancestor(node.init, visitors, this);
            //     // }
            // } else if (t.isIdentifier(node.init)) {
            //     this.scopes.top.add(new code.Variable(node.id.name, new code.Reference(node.init.name)));
            // }
        } else if (t.isObjectPattern(node.id)) {

        }
    }

    enterIdentifier(node, ancestors) {
        const parentAstNode = this.nodes.top.ast;
        if (t.isVariableDeclarator(parentAstNode)) {
            return;
        } else if ((t.isFunctionDeclaration(parentAstNode) || t.isFunctionExpression(parentAstNode) || t.isArrowFunctionExpression(parentAstNode)) && parentAstNode.id !== node.ast) {
            // function param
            this.#functionParams.push({
                name: node.ast.name,
                node,
                isArg: true
            });
        } else if (t.isObjectProperty(parentAstNode)) {
            if (node.ast === parentAstNode.key) {
                this.nodes.top.key = node;
            } else if (node.ast === parentAstNode.value) {
                this.nodes.top.value = node;
            }
        }
    }

    enterMemberExpression(node, ancestors) {
        if (t.isVariableDeclarator(this.nodes.top.ast)) {
            this.nodes.top.variable.value = node;
            return;
        }
    }

    enterObjectExpression(node, ancestors) {
        if (t.isVariableDeclarator(this.nodes.top.ast)) {
            this.nodes.top.variable.value = node;
            return;
        }
    }

    enterArrayExpression(node, ancestors) {
        if (t.isVariableDeclarator(this.nodes.top.ast)) {
            this.nodes.top.variable.value = node;
            return;
        }
    }

    enterNewExpression(node, ancestors) {
        if (t.isVariableDeclarator(this.nodes.top.ast)) {
            this.nodes.top.variable.value = node;
            return;
        }
    }

    enterCallExpression(node, ancestors) {
        if (t.isVariableDeclarator(this.nodes.top.ast)) {
            this.nodes.top.variable.value = node;
            return;
        }
    }

    enterDoExpression(node, ancestors) {
        if (t.isVariableDeclarator(this.nodes.top.ast)) {
            this.nodes.top.variable.value = node;
            return;
        }
    }

    enterFunctionExpression(node, ancestors) {
        if (t.isVariableDeclarator(this.nodes.top.ast)) {
            this.nodes.top.variable.value = node;
            return;
        }
    }

    enterArrowFunctionExpression(node, ancestors) {
        if (t.isVariableDeclarator(this.nodes.top.ast)) {
            this.nodes.top.variable.value = node;
            return;
        }
    }

    enterStringLiteral(node, ancestors) {
        if (t.isVariableDeclarator(this.nodes.top.ast)) {
            this.nodes.top.variable.value = node;
            return;
        }
    }

    enterNumericLiteral(node, ancestors) {
        if (t.isVariableDeclarator(this.nodes.top.ast)) {
            this.nodes.top.variable.value = node;
            return;
        }
    }

    enterBooleanLiteral(node, ancestors) {
        if (t.isVariableDeclarator(this.nodes.top.ast)) {
            this.nodes.top.variable.value = node;
            return;
        }
    }

    enterRegExpLiteral(node, ancestors) {
        if (t.isVariableDeclarator(this.nodes.top.ast)) {
            this.nodes.top.variable.value = node;
            return;
        }
    }

    enterTemplateLiteral(node, ancestors) {
        if (t.isVariableDeclarator(this.nodes.top.ast)) {
            this.nodes.top.variable.value = node;
            return;
        }
    }

    enterNullLiteral(node, ancestors) {
        if (t.isVariableDeclarator(this.nodes.top.ast)) {
            this.nodes.top.variable.value = node;
            return;
        }
    }

    enterObjectPattern(node) {
        if ((t.isFunctionDeclaration(this.nodes.top.ast) || t.isFunctionExpression(this.nodes.top.ast) || t.isArrowFunctionExpression(this.nodes.top.ast))) {
            // function param
            this.#functionParams.push({
                node
            });
        }
    }

    enterObjectProperty(node) {
        const objNode = this.nodes.top;
        objNode.addProperty(node);
    }

    #addDeclaration(options) {
        this.scopes.top.addDeclaration(new code.Variable(options));
    }

    // processBlockStatement(node, scope) {
    //     this.scopes.push(scope);
    //     for (const n of node.body) {
    //         walk.ancestor(n, visitors, this);
    //     }
    //     this.scopes.pop(scope);
    // }

    isADONELazifier(node) {
        if (!t.isCallExpression(node)) {
            return false;
        }

        if (t.isMemberExpression(node.callee)) {
            return code.helper.getMemberExpressionName(node.callee) === "adone.lazify";
        } else if (t.isIdentifier(node.callee)) {
            // TODO: need more carefull validation
            return node.callee.name === "lazify";
        }
        return false;
    }

    scanLazifyProps(props) {
        for (const prop of props) {
            if (t.isStringLiteral(prop.value)) {
                this.addDependency(prop.value.value);
            } else if (t.isArrayExpression(prop.value) && prop.value.elements.length === 2 && t.isStringLiteral(prop.value.elements[0])) {
                this.addDependency(prop.value.elements[0].value);
            } else {
                walk.ancestor(prop.value, visitors, this);
            }
        }
    }

    addDependency(modPath) {
        let realPath;
        if (path.isAbsolute(modPath)) {
            realPath = modPath;
        } else if (modPath.startsWith("./") || modPath.startsWith("../")) {
            realPath = path.resolve(this.virtualPath, modPath);
        } else if (this.module.sandbox.isSpecialModule(this.virtualPath, modPath)) {
            return;
        }

        realPath = this.module.sandbox.fixPath(realPath);

        this.modulePaths.add(realPath);
        return realPath;
    }
}
