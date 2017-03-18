const { is, js: { compiler: { traverse } } } = adone;

export default class XModule extends adone.meta.codemod.Base {
    constructor({ code = null, filePath = "index.js" } = {}) {
        super({ code, type: "module" });
        this.filePath = filePath;
        this._exports = null;
    }

    exports() {
        if (is.null(this._exports)) {
            this._exports = {};
            this.traverseExports();
        }
        return this._exports;
    }

    traverseExports() {
        this.parse();

        const decls = [];

        traverse(this.ast, {
            ExportDefaultDeclaration: (path) => {
                decls.push(path);
            },
            ExportNamedDeclaration: (path) => {
                decls.push(path);
            }
        });

        const exps = [];
        for (const decl of decls) {
            decl.traverse({
                ClassDeclaration: (path) => {
                    exps.push({
                        name: (is.null(path.node.id) ? null : path.node.id.name),
                        ast: path.node
                    });
                },
                VariableDeclaration: (path) => {
                    if (path.parent === decl.node) {
                        for (const d of path.node.declarations) {
                            exps.push({
                                name: d.id.name,
                                ast: d.init
                            });
                        }
                    }
                }
            });
        }

        for (const { name, ast } of exps) {
            if (is.null(name)) {
                throw new adone.x.NotValid("Anonymous class");
            }
            let obj = null;
            switch (ast.type) {
                case "ClassDeclaration": obj = new adone.meta.codemod.Class({ ast }); break;
                case "FunctionExpression": obj = new adone.meta.codemod.Function({ ast }); break;
                case "ArrowFunctionExpression": obj = new adone.meta.codemod.ArrowFunction({ ast }); break;
                case "ObjectExpression": obj = new adone.meta.codemod.Object({ ast }); break;
            }
            if (!is.null(obj)) {
                obj.generate();
                this._exports[name] = obj;
            }
        }
    }
}
