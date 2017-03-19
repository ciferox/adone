const { is, js: { compiler: { parse, traverse, generate } } } = adone;

export default class XBase {
    constructor({ parent = null, code = null, ast = null, type = "script" } = {} ) {
        this.parent = parent;
        this.code = code;
        this.type = type;
        this.ast = ast;
        this.scope = [];
        this.isGlobalScope = false;

        if (is.null(this.ast) && is.string(this.code)) {
            this.parse();
        } else if (!is.null(this.ast) && is.null(this.code)) {
            this.generate();
        }
    }

    addToScope(xObj) {
        this.scope.push(xObj);
    }

    parse() {
        this.ast = parse(this.code, {
            sourceType: this.type,
            plugins: [
                "decorators",
                "functionBind"
            ]
        });
    }

    traverse(visitors) {
        return traverse(this.ast, visitors);
    }

    createXObject(ast) {
        let xObj = null;
        const parent = this;
        switch (ast.type) {
            case "ExportDefaultDeclaration":
            case "ExportNamedDeclaration":
                xObj = new adone.meta.code.Export({ parent, ast });
                break;
            case "VariableDeclaration": {
                if (ast.declarations.length === 1) {
                    xObj = new adone.meta.code.Variable({ parent, ast });
                } else {
                    // for (const decl of ast.declarations) {
                    //     const kind = ast.kind;

                    // }
                }
                break;
            }
            case "MemberExpression": 
            case "NewExpression":
            case "ArrayExpression":
            case "BinaryExpression":
            case "ConditionalExpression":
                xObj = new adone.meta.code.Expression({ parent, ast });
                break;
            case "StringLiteral":
            case "RegExpLiteral":
                xObj = new adone.meta.code.Constant({ parent, ast });
                break;
            case "ExpressionStatement":
            case "BlockStatement":
            case "EmptyStatement":
            case "DebuggerStatement":
            case "WithStatement":
            case "ReturnStatement":
            case "LabeledStatement":
            case "BreakStatement":
            case "ContinueStatement":
            case "IfStatement":
            case "SwitchStatement":
            case "SwitchCase":
            case "ThrowStatement":
            case "TryStatement":
            case "CatchClause":
            case "WhileStatement":
            case "DoWhileStatement":
            case "ForStatement":
            case "ForInStatement":
            case "ForOfStatement":
            case "ForAwaitStatement":
                xObj = new adone.meta.code.Statement({ parent, ast });
                break;
            case "ClassDeclaration": xObj = new adone.meta.code.Class({ parent, ast }); break;
            case "FunctionExpression": xObj = new adone.meta.code.Function({ parent, ast }); break;
            case "ArrowFunctionExpression": xObj = new adone.meta.code.ArrowFunction({ parent, ast }); break;
            case "ObjectExpression": xObj = new adone.meta.code.Object({ parent, ast }); break;
            case "Identifier": {
                xObj = this.lookupInGlobalScope(ast.name, "VariableDeclaration");
                if (is.null(xObj)) {
                    throw new adone.x.NotFound(`Variable '${ast.name}' not found in global scope`);
                } else {
                    xObj = xObj.value;
                }
                break;
            }
            default:
                throw new adone.x.Unknown(`Unknown type: ${ast.type}`);
        }
        return xObj;
    }

    generate() {
        const generated = generate(this.ast, {
            comments: false,
            quotes: "double"
        });
        this.code = generated.code;
    }

    lookupInGlobalScope(name, type) {
        if (this.isGlobalScope) {
            for (const xObj of this.scope) {
                switch (type) {
                    case "VariableDeclaration": {
                        const node = xObj.ast;
                        if (node.type === type) {
                            for (const d of node.declarations) {
                                if (d.id.name === name) {
                                    return xObj;
                                }
                            }
                        }
                        break;
                    }
                }
            }
        } else {
            if (!is.null(this.parent)) {
                return this.parent.lookupInGlobalScope(name, type);
            }
        }
        return null;
    }
}
