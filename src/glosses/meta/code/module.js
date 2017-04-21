const { is, fs, js: { compiler: { traverse } } } = adone;

export default class XModule extends adone.meta.code.Base {
    constructor({ nsName = "global", code = null, filePath = "index.js" } = {}) {
        super({ code, type: "module" });
        this.nsName = nsName;
        this.xModule = this;
        this.filePath = filePath;
        this._exports = {};
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
        this._lazyModules = null;
    }

    async load() {
        this.code = await fs.readFile(this.filePath, { check: true, encoding: "utf8" });
        this.init();

        const lazies = [];

        traverse(this.ast, {
            enter: (path) => {
                const nodeType = path.node.type;
                if (nodeType === "Program") {
                    return;
                } else if (nodeType === "ExpressionStatement" && this._isLazifier(path.node.expression)) {
                    // Process adone lazyfier
                    const callExpr = path.node.expression;
                    if (adone.meta.code.nodeInfo(callExpr.arguments[0]) === "ObjectExpression" &&
                        adone.meta.code.nodeInfo(callExpr.arguments[1]) === "Identifier:exports" &&
                        adone.meta.code.nodeInfo(callExpr.arguments[2]) === "Identifier:require") {

                        const props = callExpr.arguments[0].properties;
                        const basePath = adone.std.path.dirname(this.filePath);

                        for (const prop of props) {
                            const name = prop.key.name;
                            const fullName = `${this.nsName}.${name}`;
                            const { namespace, objectName } = adone.meta.parseName(fullName);
                            if (namespace === this.nsName) {
                                if (prop.value.type === "StringLiteral") {
                                    adone.log(namespace, objectName);
                                    lazies.push({ name: objectName, path: adone.std.path.join(basePath, prop.value.value) });
                                }
                            }
                        }
                    }
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
                if (nodeType.endsWith("Declaration")) {
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
                            this._exports[isDefault ? "default" : node.id.name] = xObj;
                            break;
                        }
                        case "VariableDeclarator": {
                            if (adone.meta.code.is.arrowFunction(xObj)) {
                                xObj.name = node.id.name;
                            }
                            this._exports[node.id.name] = xObj;
                            break;
                        }
                        case "Identifier": {
                            this._exports[isDefault ? "default" : node.name] = xObj;
                            break;
                        }
                    }
                }

                path.skip();
            }
        });

        if (lazies.length > 0) {
            this._lazyModules = new Map();
            for (const { name, path } of lazies) {
                const filePath = await fs.lookup(path);
                // adone.log(filePath);
                const lazyModule = new adone.meta.code.Module({ nsName: this.nsName, filePath });
                await lazyModule.load();
                this._lazyModules.set(name, lazyModule);
            }

            // adone.log([...this._lazyModules.keys()]);
        }
        // adone.log(Object.keys(this.exports()));
    }

    exports() {
        const result = {};
        Object.assign(result, this._exports);
        if (!is.null(this._lazyModules)) {
            for (const lazyModule of this._lazyModules.values()) {
                Object.assign(result, XModule.lazyExports(lazyModule));
            }
        }
        return result;
    }

    numberOfExports() {
        return Object.keys(this.exports()).length;
    }

    lookupInExportsByDeclaration(name) {
        for (const [key, value] of Object.entries(this._exports)) {
            if (key === name) {
                return value;
            }
        }
        return null;
    }

    getGlobal(name) {
        return this.globals.find((g) => (g.name === name));
    }

    _isLazifier(expr) {
        if (expr.type !== "CallExpression") {
            return false;
        }
        // Special case - adone lazyfing mechanism
        switch (expr.callee.type) {
            case "Identifier": {
                const g = this.getGlobal(expr.callee.name);
                return !is.undefined(g) && g.full === "adone.lazify";
            }
            case "MemberExpression": {
                return this._getMemberExpressionName(expr.callee) === "adone.lazify";
            }
        }
        return false;
    }

    _traverseVariableDeclarator(node, kind) {
        let prefix = "";
        if (node.init === null) {
            return;
        }
        const initType = node.init.type;
        switch (initType) {
            case "Identifier": prefix = node.init.name; break;
            case "MemberExpression": prefix = this._getMemberExpressionName(node.init); break;
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

    static lazyExports(xModule) {
        const rawExports = xModule.exports();
        const result = {};
        if (adone.meta.code.is.object(rawExports.default)) {
            for (const [key, val] of rawExports.default.entries()) {
                result[key] = val;
            }
        } else if (adone.meta.code.is.functionLike(rawExports.default)) {
            result[rawExports.default.name] = rawExports.default;
        } else if (is.undefined(rawExports.default)) {
            return rawExports;
        } else {
            throw new adone.x.NotSupported(`Unsupported type '${rawExports.default.ast.type}' of exports: ${xModule.filePath}`);
        }
        return result;
    }
}
adone.tag.define("CODEMOD_MODULE");
adone.tag.set(XModule, adone.tag.CODEMOD_MODULE);
