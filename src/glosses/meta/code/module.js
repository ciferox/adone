const { is } = adone;

export default class XModule extends adone.meta.code.Base {
    constructor({ code = null, filePath = "index.js" } = {}) {
        super({ code, type: "module" });
        this.isGlobalScope = true;
        this.filePath = filePath;
        this.exports = {};

        const exportDecls = [];

        for (const item of this.ast.program.body) {
            const xObj = this.createXObject(item);
            const node = xObj.ast;
            if (node.type === "ExportDefaultDeclaration") {
                exportDecls.push({
                    node: node.declaration,
                    isDefault: true
                });
            } else if (node.type === "ExportNamedDeclaration") {
                exportDecls.push({
                    node: node.declaration,
                    isDefault: false
                });
            }
            this.addToScope(xObj);
        }

        for (const { node, isDefault } of exportDecls) {
            switch (node.type) {
                case "ClassDeclaration": {
                    if (is.null(node.id)) {
                        throw new adone.x.NotValid("Anonymous class");
                    }
                    this.exports[isDefault ? "default" : node.id.name] = this.createXObject(node);
                    break;
                }
                case "VariableDeclaration": {
                    for (const d of node.declarations) {
                        const xObj = this.createXObject(d.init);
                        if (adone.meta.code.is.arrowFunction(xObj)) {
                            xObj.name = d.id.name;
                        }
                        this.exports[d.id.name] = xObj;
                    }
                    break;
                }
                case "Identifier": {
                    this.exports[isDefault ? "default" : node.name] = this.createXObject(node);
                    break;
                }
            }
        }
    }

    numberOfExports() {
        return Object.keys(this.exports).length;
    }

    lookupInExportsByDeclaration(name) {
        for (const [key, value] of Object.entries(this.exports)) {
            if (key === name) {
                return value;
            }
        }
        return null;
    }
}
adone.tag.define("CODEMOD_MODULE");
adone.tag.set(XModule, adone.tag.CODEMOD_MODULE);
