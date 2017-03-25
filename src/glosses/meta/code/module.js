const { is, js: { compiler: { traverse } } } = adone;

export default class XModule extends adone.meta.code.Base {
    constructor({ code = null, filePath = "index.js" } = {}) {
        super({ code, type: "module" });
        this.isGlobalScope = true;
        this.filePath = filePath;
        this.exports = {};
        this.globals = [
            {
                name: "global",
                full: "global",
                isNamespace: true
            },
            {
                name: "adone",
                full: "adone",
                isNamespace: true
            }
        ];
        this.references = [];

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
            } else if (node.type === "VariableDeclaration") {
                if (node.kind === "const") {
                    for (const decl of node.declarations) {
                        this._traverseVariableDeclarator(decl);
                    }
                }               
            }

            this.addToScope(xObj);
        }

        // Traverse references
        traverse(this.ast, {
            MemberExpression: (path) => {
                if (path.node.computed) {
                    return;
                }
                switch (path.node.object.type) {
                    case "Identifier": {
                        const name = path.node.object.name;
                        if (is.undefined(name)) {
                            return;
                        }
                        const globalObject = this.globals.find((g) => (g.name === name && g.isNamespace));
                        if (!is.undefined(globalObject)) {
                            this._addReference(`${globalObject.full}.${path.node.property.name}`);
                        }
                        break;
                    }
                    case "MemberExpression": {
                        const parts = [];
                        let obj = path.node;
                        while (obj.type === "MemberExpression") {
                            parts.unshift(obj.property.name);
                            obj = obj.object;
                        }
                        if (obj.type === "Identifier") {
                            parts.unshift(obj.name);
                            const name = parts.join(".");
                            const { namespace, objectName } = adone.meta.parseName(name);
                            if (namespace.length > 0 && objectName.length > 0) {
                                this._addReference(name);
                            }
                        }

                        break;
                    }
                }
                
            }
        });

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

    _traverseVariableDeclarator(node) {
        let prefix = "";
        if (node.init === null) {
            return;
        }
        const initType = node.init.type;
        switch (initType) {
            case "Identifier": prefix = node.init.name; break;
            case "MemberExpression": prefix = this._traverseMemberExpression(node.init); break;
        }

        if (prefix.length > 0) {
            prefix = `${prefix}.`;
        }
        
        if (node.id.type === "ObjectPattern") {
            const exprs = this._traverseObjectPattern(node.id);
            for (const expr of exprs) {
                const name = `${prefix}${expr}`;
                const { namespace, objectName } = adone.meta.parseName(name);
                if (objectName === "") {
                    const parts = namespace.split(".");
                    this._addGlobal(parts[parts.length - 1], parts.slice(0, -1).join("."), true);
                } else {
                    this._addReference(name);
                    this._addGlobal(objectName, namespace, false);
                }
            }
        }
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

    _traverseObjectProperty(node) {
        const key = node.key;
        const value = node.value;
        if (key.type === value.type) {
            if (key.start === value.start && key.end === value.end) {
                return [value.name];
            } else {
                this._addGlobal(value.name);
                return [key.name];
            }
        } else if (value.type === "ObjectPattern") {
            const result = [];
            const prefix = `${key.name}.`;
            const exprs = this._traverseObjectPattern(value);
            for (const expr of exprs) {
                result.push(`${prefix}${expr}`);
            }
            return result;
        }
    }

    _traverseObjectPattern(node) {
        const result = [];
        for (const prop of node.properties) {
            if (prop.type === "ObjectProperty") {
                const exprs = this._traverseObjectProperty(prop);
                for (const expr of exprs) {
                    result.push(expr);
                }
            }
        }
        return result;
    }
    
    _addGlobal(name, prefix, isNamespace) {
        if (name.length > 0 && !this.globals.map((x) => x.name).includes(name)) {
            this.globals.push({
                name,
                full: `${prefix}.${name}`,
                isNamespace
            });
        }
    }

    _addReference(name) {
        if (name.length > 0 && !this.references.includes(name)) {
            this.references.push(name);
        }
    }
}
adone.tag.define("CODEMOD_MODULE");
adone.tag.set(XModule, adone.tag.CODEMOD_MODULE);
