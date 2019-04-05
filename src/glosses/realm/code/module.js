const {
    error,
    is,
    fs,
    js: { walk, compiler: { types: t } },
    realm: { code },
    std: { path }
} = adone;

export default class Module {
    content;

    ast;

    #sandbox;

    constructor({ sandbox, file } = {}) {
        if (!is.string(file) || file.length === 0) {
            throw new error.NotValidException("Invalid module path");
        } else if (!path.isAbsolute(file)) {
            throw new error.NotValidException("Module path should be absolute");
        }

        this.#sandbox = sandbox;

        this.filename = adone.module.resolve(file);
        this.dirname = path.dirname(this.filename);

        this.dependencies = new Map();
        this.exports = new Map();

        this.scope = new code.ModuleScope(this);
        this.scope.add(new code.Variable("__dirname", this.dirname, true));
        this.scope.add(new code.Variable("__filename", this.filename, true));
        this.scope.add(new code.ExportsVariable(this.exports));
        this.scope.add(new code.ModuleVariable(this));
        this.scope.add(new code.RequireVariable(/* ??? */));
    }

    async load({ virtualPath = this.dirname } = {}) {
        this.content = await this.#sandbox.loadFile(this.filename);
        this.ast = this.#sandbox.parse(this.content);

        const state = {
            module: this,
            modulePaths: new Set(),
            addDependency(modPath) {
                let realPath;
                if (path.isAbsolute(modPath)) {
                    realPath = modPath;
                } else if (modPath.startsWith("./") || modPath.startsWith("../")) {
                    realPath = path.resolve(virtualPath, modPath);
                } else if (this.module.#sandbox.isSpecialModule(virtualPath, modPath)) {
                    return;
                }

                realPath = this.module.#sandbox.fixPath(realPath);

                this.modulePaths.add(realPath);
                return realPath;
            },
            scanLazifyProps(props, c) {
                for (const prop of props) {
                    if (t.isStringLiteral(prop.value)) {
                        this.addDependency(prop.value.value);
                    } else if (t.isArrayExpression(prop.value) && prop.value.elements.length === 2 && t.isStringLiteral(prop.value.elements[0])) {
                        this.addDependency(prop.value.elements[0].value);
                    } else {
                        c(prop.value);
                    }
                }
            }
        };

        walk.recursive(this.ast.program, {
            CallExpression(node, state, c) {
                if (node.callee.name === "require" && t.isStringLiteral(node.arguments[0])) {
                    state.addDependency(node.arguments[0].value);
                }
            },
            ImportDeclaration(node, state, c) {
                const modPath = state.addDependency(node.source.value);

                for (const specifier of node.specifiers) {
                    if (t.isImportDefaultSpecifier(specifier)) {
                        state.module.scope.add(new code.ExternalVariable(specifier.local.name, modPath));
                    }
                }
            },
            ExpressionStatement(node, state, c) {
                // Process adone lazyfier
                if (state.module.#isADONELazifier(node.expression)) {
                    const objExpr = node.expression.arguments[0];
                    if (t.isObjectExpression(objExpr)) {
                        state.scanLazifyProps(objExpr.properties, c);
                    }
                    node.expression.arguments.forEach((arg) => c(arg));
                } 

                c(node.expression);
            },
            VariableDeclaration(node, state, c) {
                for (const decl of node.declarations) {
                    const initNode = node.declarations[0].init;
                    
                    // Process adone lazyfier
                    if (state.module.#isADONELazifier(initNode)) {
                        const objExpr = initNode.arguments[0];
                        if (t.isObjectExpression(objExpr)) {
                            state.scanLazifyProps(objExpr.properties, c);
                        }
                        initNode.arguments.forEach((arg) => c(arg));
                    }

                    state.module.#processVariableDeclarator(decl);

                    c(decl);
                }
            }
        }, state);

        // Load all dependencies
        for (const modPath of state.modulePaths.values()) {
            // eslint-disable-next-line no-await-in-loop
            this.addDependencyModule(await this.#sandbox.loadAndCacheModule(modPath));
        }
    }

    #processVariableDeclarator(node) {
        if (t.isIdentifier(node.id)) {
            if (t.isLiteral(node.init)) {
                if (t.isRegExpLiteral(node.init)) {
                    this.scope.add(new code.Variable(node.id.name, new RegExp(node.init.pattern)));
                } else if (t.isNullLiteral(node.init)) {
                    this.scope.add(new code.Variable(node.id.name, null));
                } else {
                    this.scope.add(new code.Variable(node.id.name, node.init.value));
                }
            } else if (t.isExpression(node.init)) {
                this.scope.add(new code.Variable(node.id.name, new code.Expression(node.init)));
            } else if (t.isIdentifier(node.init)) {
                this.scope.add(new code.Variable(node.id.name, new code.Reference(node.init.name)))
            }
            
        } else if (t.isObjectPattern(node.id)) {

        }
    }

    #isADONELazifier(node) {
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

    addDependencyModule(mod) {
        this.dependencies.set(mod.filename, mod);
    }
}
