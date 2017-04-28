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
        this._lazies = null;
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
                                    lazies.push({ name: objectName, path: adone.std.path.join(basePath, prop.value.value) });
                                } else if (prop.value.type === "ArrowFunctionExpression") {
                                    const lazyPath = this.getPathFor(path, prop.value);
                                    const xObj = new adone.meta.code.LazyFunction({ parent: this, ast: prop.value, path: lazyPath, xModule: this });
                                    this.lazies.set(objectName, xObj);
                                }
                            }
                        }
                    }
                }

                let isDefault = undefined;
                let xObj = null;
                let shouldSkip = false;
                const expandDeclaration = (realPath) => {
                    const node = realPath.node;

                    if (["ExportDefaultDeclaration", "ExportNamedDeclaration"].includes(node.type)) {
                        isDefault = (node.type === "ExportDefaultDeclaration");

                        if (is.array(node.specifiers) && node.specifiers.length > 0) {
                            shouldSkip = true;
                            for (const specifier of node.specifiers) {
                                xObj = this.lookupInGlobalScope(specifier.local.name);
                                if (is.null(xObj)) {
                                    throw new adone.x.NotFound(`Variable '${specifier.local.name}' not found in global scope`);
                                } else if (specifier.local.name !== specifier.exported.name) {
                                    throw new adone.x.NotValid("Local name of export-specifier should be same as exported name");
                                } else {
                                    // Is should always be VariableDeclarator
                                    this._addExport(xObj.value, isDefault, xObj.ast);
                                }
                            }
                        } else {
                            let subPath;
                            realPath.traverse({
                                enter(p) {
                                    subPath = p;
                                    p.stop();
                                }
                            });
                            return expandDeclaration(subPath);
                        }
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

                if (!shouldSkip) {
                    const realPath = expandDeclaration(path);
                    const node = realPath.node;

                    if (is.null(xObj)) {
                        const xObjData = {
                            ast: node,
                            path: realPath,
                            xModule: this
                        };
                        if (nodeType === "VariableDeclaration") {
                            xObjData.kind = path.node.kind;
                        }

                        xObj = this.createXObject(xObjData);
                        // Add to scope only declarations. 
                        if (node.type !== "Identifier") {
                            if (node.type.endsWith("Declarator") || ["VariableDeclaration", "ClassDeclaration", "FunctionDeclaration"].includes(node.type)) {
                                this.addToScope(xObj);
                            }
                        }
                    }

                    if (!is.undefined(isDefault)) {
                        this._addExport(xObj, isDefault, node);
                    }
                }

                path.skip();
            }
        });

        if (lazies.length > 0) {
            for (const { name, path } of lazies) {
                const filePath = await fs.lookup(path);
                const lazyModule = new adone.meta.code.Module({ nsName: this.nsName, filePath });
                await lazyModule.load();
                this.lazies.set(name, lazyModule);
            }
        }
    }

    get lazies() {
        if (is.null(this._lazies)) {
            this._lazies = new Map();
        }
        return this._lazies;
    }

    exports() {
        const result = {};
        Object.assign(result, this._exports);
        if (!is.null(this.lazies)) {
            for (const [name, lazy] of this.lazies.entries()) {
                if (adone.meta.code.is.module(lazy)) {
                    if (is.undefined(lazy.exports().default)) { // special case
                        result[name] = lazy;
                    } else {
                        Object.assign(result, XModule.lazyExports(lazy));
                    }
                } else if (adone.meta.code.is.lazyFunction(lazy)) {
                    result[name] = lazy;
                }
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

    _addExport(xObj, isDefault, node) {
        node = node || xObj.ast;
        switch (node.type) {
            case "ClassDeclaration": {
                if (is.null(node.id)) {
                    throw new adone.x.NotValid("Anonymous class");
                }
                this._exports[isDefault ? "default" : node.id.name] = xObj;
                break;
            }
            case "FunctionDeclaration":
            case "VariableDeclarator": {
                this._exports[isDefault ? "default" : xObj.name] = xObj;
                break;
            }
            case "Identifier": {
                this._exports[isDefault ? "default" : node.name] = xObj;
                break;
            }
        }
    }

    static lazyExports(xModule) {
        const rawExports = xModule.exports();
        const result = {};
        // adone.log(Object.values(rawExports).map(x => x.ast));
        if (adone.meta.code.is.object(rawExports.default)) {
            for (const [key, val] of rawExports.default.entries()) {
                result[key] = val;
            }
        } else if (adone.meta.code.is.functionLike(rawExports.default)) {
            // adone.log(rawExports.default.name);
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
