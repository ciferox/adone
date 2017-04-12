const { is, js: { compiler: { traverse } } } = adone;

export default class XModule extends adone.meta.code.Base {
    constructor({ code = null, filePath = "index.js" } = {}) {
        super({ code, type: "module" });
        this.xModule = this;
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

        traverse(this.ast, {
            enter: (path) => {
                if (path.node.type === "Program") {
                    return;
                }

                let isDefault = undefined;                
                const expandDeclaration = (realPath) => {
                    const node = realPath.node;
    
                    if (["ExportDefaultDeclaration", "ExportNamedDeclaration"].includes(node.type)) {
                        isDefault = (node.type === "ExportDefaultDeclaration");
                        let subPath;
                        realPath.traverse({
                            enter(p) {
                                subPath = p;
                                p.stop();
                            }
                        });
                        return expandDeclaration(subPath);
                    } else if (node.type === "VariableDeclaration") {
                        if (node.declarations.length > 1) {
                            throw new SyntaxError("Detected unsupported declaration of multiple variables.");
                        }
                        this._traverseVariableDeclarator(node.declarations[0], node.kind);
                        realPath.traverse({
                            enter(subPath) {
                                realPath = subPath;
                                subPath.stop();
                            }
                        });
                    }

                    return realPath;
                };

                const realPath = expandDeclaration(path);
                const node = realPath.node; 
                const xObjData = {
                    ast: node,
                    path: realPath,
                    xModule: this
                };
                if (path.node.type.endsWith("Declaration")) {
                    xObjData.kind = path.node.kind;
                }

                const xObj = this.createXObject(xObjData);
                this.addToScope(xObj);

                if (!is.undefined(isDefault)) {
                    switch (node.type) {
                        case "ClassDeclaration": {
                            if (is.null(node.id)) {
                                throw new adone.x.NotValid("Anonymous class");
                            }
                            this.exports[isDefault ? "default" : node.id.name] = xObj;
                            break;
                        }
                        case "VariableDeclaration": {
                            if (adone.meta.code.is.arrowFunction(xObj)) {
                                xObj.name = node.id.name;
                            }
                            this.exports[node.id.name] = xObj;
                            break;
                        }
                        case "Identifier": {
                            this.exports[isDefault ? "default" : node.name] = xObj;
                            break;
                        }
                    }
                }

                path.skip();
            }
        });
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

    _traverseVariableDeclarator(node, kind) {
        let prefix = "";
        if (node.init === null) {
            return;
        }
        const initType = node.init.type;
        switch (initType) {
            case "Identifier": prefix = node.init.name; break;
            case "MemberExpression": prefix = this._traverseMemberExpression(node.init); break;
            default: {
                if (node.id.type === "Identifier") {
                    return this._addGlobal(node.id.name, null, kind, false);
                }
            }
        }

        if (prefix.length > 0) {
            prefix = `${prefix}.`;
        }

        if (node.id.type === "ObjectPattern") {
            const exprs = this._traverseObjectPattern(node.id, kind);
            for (const expr of exprs) {
                const name = `${prefix}${expr}`;
                const { namespace, objectName } = adone.meta.parseName(name);
                if (objectName === "") {
                    const parts = namespace.split(".");
                    this._addGlobal(parts[parts.length - 1], parts.slice(0, -1).join("."), kind, true);
                } else {
                    this._addReference(name);
                    this._addGlobal(objectName, namespace, kind, false);
                }
            }
        }
    }

    _traverseObjectProperty(node, kind) {
        const key = node.key;
        const value = node.value;
        if (key.type === value.type) {
            if (key.start === value.start && key.end === value.end) {
                return [value.name];
            } else {
                this._addGlobal(value.name, null, kind, false);
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

    _traverseObjectPattern(node, kind) {
        const result = [];
        for (const prop of node.properties) {
            if (prop.type === "ObjectProperty") {
                const exprs = this._traverseObjectProperty(prop, kind);
                for (const expr of exprs) {
                    result.push(expr);
                }
            }
        }
        return result;
    }

    _addGlobal(name, prefix, kind, isNamespace) {
        if (name.length > 0 && !this.globals.map((x) => x.name).includes(name)) {
            const full = is.null(prefix) ? name : `${prefix}.${name}`;
            this.globals.push({
                name,
                full,
                kind,
                isNamespace
            });
        }
    }
}
adone.tag.define("CODEMOD_MODULE");
adone.tag.set(XModule, adone.tag.CODEMOD_MODULE);
