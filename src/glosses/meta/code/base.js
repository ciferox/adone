const { is, js: { compiler: { parse, generate } } } = adone;

const jsNatives = ["Error", "EvalError", "RangeError", "ReferenceError", "SyntaxError", "TypeError", "URIError"];

export default class XBase {
    constructor({ xModule = null, parent = null, code = null, ast = null, path = null, type = "script" } = {}) {
        this.xModule = xModule;
        this.parent = parent;
        this.code = code;
        this.type = type;
        this.ast = ast;
        this.path = path;
        this.scope = [];
        this._references = [];
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
                "functionBind",
                "classProperties"
            ]
        });
    }

    references() {
        if (!is.null(this.path)) {
            // Clear array
            this._references.length = 0;

            // Traverse references
            this.path.traverse({
                Identifier: (path) => {
                    const node = path.node;
                    const name = node.name;
                    if (is.undefined(name)) {
                        return;
                    }

                    const globalObject = this.xModule.globals.find((g) => (g.name === name));
                    
                    if (!is.undefined(globalObject)) {
                        this._addReference(globalObject.full);
                    }
                },
                MemberExpression: (path) => {
                    if (path.node.computed) {
                        return;
                    }
                    const node = path.node;
                    const name = this._traverseMemberExpression(node);
                    const parts = name.split(".");
                    const globalObject = this.xModule.globals.find((g) => (g.name === parts[0]));
                    if (!is.undefined(globalObject)) {
                        const fullName = `${globalObject.full}.${parts.slice(1).join(".")}`;
                        const { namespace, objectName } = adone.meta.parseName(fullName);
                        this._addReference(`${namespace}.${objectName.split(".")[0]}`);
                    }
                    path.skip();
                }
            });
        }
        return this._references;
    }

    createXObject({ ast, path = null, xModule = null } = {}) {
        let xObj = null;
        const parent = this;
        switch (ast.type) {
            case "ExportDefaultDeclaration":
            case "ExportNamedDeclaration":
                xObj = new adone.meta.code.Export({ parent, ast, path, xModule });
                break;
            case "VariableDeclarator": {
                xObj = new adone.meta.code.Variable({ parent, ast, path, xModule });
                break;
            }
            case "MemberExpression":
            case "NewExpression":
            case "ArrayExpression":
            case "BinaryExpression":
            case "ConditionalExpression":
            case "CallExpression":
            case "LogicalExpression":
            case "UpdateExpression":
                xObj = new adone.meta.code.Expression({ parent, ast, path, xModule });
                break;
            case "StringLiteral":
            case "NumericLiteral":
            case "RegExpLiteral":
            case "TemplateLiteral":
                xObj = new adone.meta.code.Constant({ parent, ast, path, xModule });
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
                xObj = new adone.meta.code.Statement({ parent, ast, path, xModule });
                break;
            case "ClassDeclaration": xObj = new adone.meta.code.Class({ parent, ast, path, xModule }); break;
            case "FunctionExpression": xObj = new adone.meta.code.Function({ parent, ast, path, xModule }); break;
            case "ArrowFunctionExpression": xObj = new adone.meta.code.ArrowFunction({ parent, ast, path, xModule }); break;
            case "ObjectExpression": xObj = new adone.meta.code.Object({ parent, ast, path, xModule }); break;
            case "Identifier": {
                if (ast.name === "adone") {
                    xObj = new adone.meta.code.Adone({ ast, path, xModule });
                } else {
                    xObj = this.lookupInGlobalScope(ast.name);
                    if (is.null(xObj)) {
                        xObj = this._tryJsNative(ast);
                        if (is.null(xObj)) {
                            throw new adone.x.NotFound(`Variable '${ast.name}' not found in global scope`);
                        }
                    } else {
                        xObj = xObj.value;
                    }
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

    getName(node) {
        switch (node.type) {
            case "ClassDeclaration": return node.id.name;
        }
    }

    lookupInGlobalScope(name) {
        if (this.isGlobalScope) {
            for (const xObj of this.scope) {
                const node = xObj.ast;
                switch (node.type) {
                    case "ExportNamedDeclaration": {
                        return this.lookupInExportsByDeclaration(name);
                    }
                    case "VariableDeclaration": {
                        for (const d of node.declarations) {
                            if (d.id.name === name) {
                                return xObj;
                            }
                        }
                        break;
                    }
                    case "ClassDeclaration": {
                        if (node.id.name === name) {
                            return xObj;
                        }
                        break;
                    }
                }
            }
        } else {
            if (!is.null(this.parent)) {
                return this.parent.lookupInGlobalScope(name);
            }
        }
        return null;
    }

    lookupInExportsByDeclaration(node) {
        return null;
    }

    _traverseMemberExpression(node) {
        let prefix;
        const type = node.object.type;
        if (type === "MemberExpression") {
            prefix = this._traverseMemberExpression(node.object);
        } else if (type === "Identifier") {
            return `${node.object.name}.${node.property.name}`;
        }

        if (is.undefined(prefix)) {
            return node.property.name;
        } else {
            return `${prefix}.${node.property.name}`;
        }
    }

    _tryJsNative(ast) {
        if (jsNatives.includes(ast.name)) {
            return new adone.meta.code.JsNative({ ast });
        }
        return null;
    }

    _addReference(name) {
        if (name.length > 0 && !this._references.includes(name)) {
            this._references.push(name);
        }
    }
}
