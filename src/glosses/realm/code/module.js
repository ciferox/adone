const {
    error,
    is,
    fs,
    js: { parse, walk, compiler: { types: t } },
    realm: { code: { DEFAULT_PARSER_PLUGINS, helper, scope } },
    std: { path },
    util
} = adone;

export default class Module {
    content;

    ast;

    #parserPlugins;

    #sandbox;

    constructor({ sandbox, file, parserPlugins = DEFAULT_PARSER_PLUGINS } = {}) {
        if (!is.string(file) || file.length === 0) {
            throw new error.NotValidException("Invalid module path");
        } else if (!path.isAbsolute(file)) {
            throw new error.NotValidException("Module path should be absolute");
        }

        this.#sandbox = sandbox;
        this.#parserPlugins = util.arrify(parserPlugins);

        this.id = adone.std.module._resolveFilename(file);
        this.basePath = path.dirname(this.id);

        this.dependencies = new Map();
        this.scope = new scope.ModuleScope(this);
    }

    async load() {
        this.content = await fs.readFile(this.id, { check: true, encoding: "utf8" });

        this.ast = parse(this.content, {
            sourceType: "module",
            plugins: this.#parserPlugins
        });

        const state = {
            id: this.id,
            basePath: this.basePath,
            modulePaths: new Set(),
            addModulePath(modPath) {
                let realPath;
                if (path.isAbsolute(modPath))  {
                    realPath = modPath;
                } else if (modPath.startsWith("./") || modPath.startsWith("../")) {
                    realPath = path.resolve(this.basePath, modPath);
                }

                this.modulePaths.add(realPath);
            },
            scanLazifyProps(props, c) {
                for (const prop of props) {
                    if (t.isStringLiteral(prop.value)) {
                        this.addModulePath(prop.value.value);
                    } else if (t.isArrayExpression(prop.value) && prop.value.elements.length === 2 && t.isStringLiteral(prop.value.elements[0])) {
                        this.addModulePath(prop.value.elements[0].value);
                    } else {
                        c(prop.value);
                    }
                }
            }
        };

        const self = this;

        walk.recursive(this.ast.program, {
            CallExpression(node, state, c) {
                if (node.callee.name === "require" && t.isStringLiteral(node.arguments[0])) {
                    state.addModulePath(node.arguments[0].value);
                }
            },
            ImportDeclaration(node, state, c) {
                state.addModulePath(node.source.value);
            },
            ExpressionStatement(node, state, c) {
                if (self.#isADONELazifier(node.expression)) {
                    const objExpr = node.expression.arguments[0];
                    if (t.isObjectExpression(objExpr)) {
                        state.scanLazifyProps(objExpr.properties, c);
                    }
                    node.expression.arguments.forEach((arg) => c(arg));
                } else {
                    c(node.expression);
                }
            },
            VariableDeclaration(node, state, c) {
                if (self.#isADONELazifier(node.declarations[0].init)) {
                    const objExpr = node.declarations[0].init.arguments[0];
                    if (t.isObjectExpression(objExpr)) {
                        state.scanLazifyProps(objExpr.properties, c);
                    }
                    node.declarations[0].init.arguments.forEach((arg) => c(arg));
                } else {
                    node.declarations.forEach((d) => c(d));
                }
            }
        }, state);

        // Load all dependencies
        for (const modPath of state.modulePaths) {
            // eslint-disable-next-line no-await-in-loop
            const mod = await this.#sandbox.loadAndCacheModule(modPath);
            this.dependencies.set(mod.id, mod);
        }
    }

    #isADONELazifier(node) {
        if (!t.isCallExpression(node)) {
            return false;
        }

        if (t.isMemberExpression(node.callee)) {
            return helper.getMemberExpressionName(node.callee) === "adone.lazify";
        } else if (t.isIdentifier(node.callee)) {
            // TODO: need more carefull validation
            return node.callee.name === "lazify";
        }
        return false;
    }
}
