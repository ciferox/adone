const {
    error,
    is,
    fs,
    js: { compiler: { traverse } },
    std: {
        assert
    }
} = adone;

/**
 * The task is to collect all usages of adone from a file
 *
 * The strategy for bindings is to rename all of them and encapsulate into the name which adone object each of them represents
 * For direct adone usages (adone.is.number(1)) we can just take member expressions
 */
class AdoneDependencyCollector {
    constructor(dependencies = new Map()) {
        this.dependencies = dependencies;
    }

    /**
     * Generates a variable name to adone path
     *
     * Private objects are encoded with # prefix
     * adone.database.#redis.commands means adone.private(adone.database.redis).commands
     */
    adonePathToId(p, scope, isPrivate) {
        // TODO: collisions???
        if (isPrivate) {
            // preprend # to the last part, which means that we use the private part of p
            const i = p.lastIndexOf(".");
            if (i === -1) {
                p = `#${p}`;
            } else {
                p = `${p.slice(0, i + 1)}#${p.slice(i + 1)}`;
            }
        }
        const id = `$ADONE$${adone.data.base58.encode(Buffer.from(p))}$`;
        const node = scope.generateUidIdentifier(id);
        return node.name;
    }

    /**
     * Decodes a variable name from the above function to an adone path
     */
    decodeAdonePath(name) {
        let i = 0;
        while (name[i] === "_") { // prefixed _
            ++i;
        }
        if (name.slice(i, i + 7) !== "$ADONE$") {
            return null;
        }
        const j = name.lastIndexOf("$");
        const encoded = name.slice(i + 7, j);
        return adone.data.base58.decode(encoded).toString();
    }

    /**
     * Constructs a string from MemberExpression, also handles encoded adone vars
     */
    compactMemberExpression(node) {
        if (node.object.type === "Identifier") {
            const name = this.decodeAdonePath(node.object.name) || node.object.name;
            if (node.computed) {
                return {
                    value: name,
                    hasComputedValue: true
                };
            }
            assert.equal(node.property.type, "Identifier");
            return {
                value: `${name}.${node.property.name}`,
                hasComputedValue: false
            };
        }

        if (node.object.type !== "MemberExpression") {
            return null;
        }

        const nested = this.compactMemberExpression(node.object);

        if (is.null(nested)) {
            return null;
        }

        if (nested.hasComputedValue || node.computed) {
            return {
                value: nested.value,
                hasComputedValue: true
            };
        }

        assert.equal(node.property.type, "Identifier");

        return {
            value: `${nested.value}.${node.property.name}`,
            hasComputedValue: false
        };
    }

    /**
     * Convers a node to adone path
     * Works with identifiers and member expressions, handles encoded adone vars
     */
    nodeToAdonePath(node) {
        switch (node.type) {
            case "Identifier": {
                const { name } = node;

                if (name === "adone") {
                    return {
                        value: "adone",
                        hasComputedValue: false
                    };
                }

                // handle mapped adone identifier
                const v = this.decodeAdonePath(name);

                if (is.null(v)) {
                    return null;
                }

                return {
                    value: v,
                    hasComputedValue: false
                };
            }
            case "MemberExpression": {
                const v = this.compactMemberExpression(node);
                if (is.null(v)) {
                    return null;
                }
                if (v.value.startsWith("adone")) {
                    return {
                        value: v.value,
                        hasComputedValue: v.hasComputedValue
                    };
                }
                return null;
            }
            default:
                return null;
        }
    }

    collectValuesFromObjectPattern(node, prefix, vals = []) {
        for (const prop of node.properties) {
            const { value, key } = prop;

            if (prop.computed) {
                throw new error.IllegalState("Expected object pattern not to have computed values");
            }

            if (key.type !== "Identifier") {
                throw new error.IllegalState(`Expected object pattern key type to be Identifier but got: ${key.type}`);
            }

            const p = `${prefix}.${key.name}`;

            switch (value.type) {
                case "Identifier": {
                    /**
                     * const { is } = adone;
                     * const { is: is2 } = adone.smth;
                     */
                    vals.push({
                        path: p,
                        binding: value.name
                    });
                    break;
                }
                case "ObjectPattern": {
                    /**
                     * const { a: { b } } = adone;
                     */
                    this.collectValuesFromObjectPattern(value, p, vals);
                }
                // TODO: ArrayPattern ???
            }
        }
        return vals;
    }

    /**
     * Adds a new dependency to the map
     */
    mergeDep(p) {
        if (!this.dependencies.has(p.value)) {
            this.dependencies.set(p.value, {
                hasComputedValue: p.hasComputedValue
            });
        } else if (p.hasComputedValue) {
            this.dependencies.get(p.value).hasComputedValue = true;
        }
    }

    handle(ast) {
        // have to clone the ast beacuse we are going to modify it..
        ast = adone.util.clone(ast, { nonPlainObjects: true });
        // rename all adone bindings to track them easely
        adone.js.compiler.traverse(ast, {
            VariableDeclarator: (path) => {
                const { node } = path;

                if (is.null(node.init)) {
                    return;
                }

                const p = this.nodeToAdonePath(node.init);

                if (is.null(p)) {
                    return;
                }

                if (p.hasComputedValue) {
                    // throw new error.IllegalState("Expected adone vars not to have computed properties");
                }

                switch (node.id.type) {
                    case "Identifier": {
                        /**
                         * 1. Simple case like
                         *
                         * const is = adone.is;
                         */
                        path.scope.rename(node.id.name, this.adonePathToId(p.value, path.scope));
                        break;
                    }
                    case "ObjectPattern": {
                        /**
                         * 2. More complex case
                         *
                         * const { is } = adone;
                         * const { http } = adone.net;
                         * const { net: { http, ws: _ws } } = adone;
                         */
                        const vals = this.collectValuesFromObjectPattern(node.id, p.value);
                        for (const val of vals) {
                            path.scope.rename(val.binding, this.adonePathToId(val.path, path.scope));
                        }
                    }
                }
                path.skip();
            }
        });

        // handle private bindings
        // after all renamings
        adone.js.compiler.traverse(ast, {
            VariableDeclarator: (path) => {
                const { node } = path;

                if (is.null(node.init)) {
                    return;
                }

                // adone.private call
                if (node.init.type !== "CallExpression") {
                    return;
                }
                const p = this.nodeToAdonePath(node.init.callee);
                if (is.null(p)) {
                    return;
                }
                switch (p.value) {
                    case "adone.private": {
                        const target = this.nodeToAdonePath(node.init.arguments[0]);
                        if (is.null(target)) {
                            return; // wtf?
                        }
                        path.scope.rename(node.id.name, this.adonePathToId(target.value, path.scope, true));
                        break;
                    }
                }
            }
        });

        // then collect identifiers with member expressions

        const collect = (path) => {
            const { node } = path;
            const p = this.nodeToAdonePath(node);
            path.skip();
            if (is.null(p)) {
                return;
            }

            // TODO: bad things happen when some namespace is returned from a function
            // const f = () => adone.is;
            // here we lose tracking
            // we have to avoid such things in the source code
            this.mergeDep(p);
        };

        adone.js.compiler.traverse(ast, {
            Identifier: collect,
            MemberExpression: collect
        });
    }
}

export default class XModule extends adone.js.adone.Base {
    constructor({
        nsName = "global",
        code = null,
        filePath = "index.js"
    } = {}) {
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

    getType() {
        return "Module";
    }

    async load() {
        try {
            this.code = await fs.readFile(this.filePath, { check: true, encoding: "utf8" });
        } catch (err) {
            throw new error.IllegalState(`Could not load the module: ${err.message}`);
        }
        this.init();

        const lazies = [];
        const imports = [];
        const basePath = adone.std.path.dirname(this.filePath);


        traverse(this.ast, {
            ImportDeclaration(path) {
                const { node } = path;
                imports.push({
                    path: adone.std.path.join(basePath, node.source.value),
                    names: node.specifiers.map((x) => {
                        if (x.type === "ImportDefaultSpecifier") {
                            return {
                                local: x.local.name,
                                isDefault: true
                            };
                        }
                        if (x.type === "ImportNamespaceSpecifier") {
                            return {
                                local: x.local.name,
                                isNamespace: true
                            };
                        }
                        return {
                            imported: x.imported.name,
                            local: x.local.name
                        };
                    })
                });
            }
        });

        for (const { names, path } of imports) {
            const filePath = await fs.lookup(path);
            const importedModule = new adone.js.adone.Module({ nsName: this.nsName, filePath });
            await importedModule.load();

            const exports = importedModule.exports();
            for (const name of names) {
                if (name.isNamespace) {
                    continue;
                }
                const obj = name.isDefault ? exports.default : exports[name.imported];
                // here we have to clone obj or decorate it somehow
                // TODO: better impl
                this.addToScope(new Proxy(obj, {
                    get(target, key) {
                        if (key === "name") {
                            return name.exported;
                        }
                        return target[key];
                    }
                }));
                // this._addGlobal(name, null, node.kind, false);
            }
        }

        traverse(this.ast, {
            enter: (path) => {
                const nodeType = path.node.type;
                if (nodeType === "Program") {
                    return;
                } else if (
                    (
                        nodeType === "ExpressionStatement"
                        && this._isLazifier(path.node.expression))
                    || (
                        nodeType === "VariableDeclaration"
                        && this._isLazifier(path.node.declarations[0].init)
                    )
                ) {
                    // Process adone lazyfier
                    const callExpr = nodeType === "ExpressionStatement"
                        ? path.node.expression
                        : path.node.declarations[0].init;

                    let targetInfo = adone.js.adone.nodeInfo(callExpr.arguments[1]);

                    if (targetInfo === "CallExpression") {
                        // adone.lazify({}, adone.asNamespace(exports), require);
                        const {
                            callee: target,
                            arguments: args
                        } = callExpr.arguments[1];
                        if (
                            target.type === "MemberExpression"
                            && target.object.type === "Identifier"
                            && target.property.type === "Identifier"
                            && args.length === 1
                            && args[0].type === "Identifier"
                            && target.object.name === "adone"
                            && target.property.name === "asNamespace"
                            && args[0].name === "exports"
                        ) {
                            // TODO: it can be done better
                            targetInfo = "Identifier:exports"; // just reassign
                        }
                    }
                    if (
                        adone.js.adone.nodeInfo(callExpr.arguments[0]) === "ObjectExpression"
                        && targetInfo.startsWith("Identifier:")
                        && adone.js.adone.nodeInfo(callExpr.arguments[2]) === "Identifier:require"
                    ) {

                        const props = callExpr.arguments[0].properties;

                        if (targetInfo === "Identifier:exports") {
                            for (const prop of props) {
                                const name = prop.key.name;
                                const fullName = `${this.nsName}.${name}`;
                                const { namespace, objectName } = adone.meta.parseName(fullName);
                                if (namespace === this.nsName) {
                                    if (prop.value.type === "StringLiteral") {
                                        lazies.push({ name: objectName, path: adone.std.path.join(basePath, prop.value.value) });
                                    } else if (prop.value.type === "ArrowFunctionExpression") {
                                        const lazyPath = this.getPathFor(path, prop.value);
                                        this.lazies.set(objectName, new adone.js.adone.LazyFunction({
                                            parent: this,
                                            ast: prop.value,
                                            path: lazyPath,
                                            xModule: this
                                        }));
                                    }
                                }
                            }
                        } else {
                            const xObj = this.lookupInGlobalScope(targetInfo.split(":")[1]);
                            if (adone.js.adone.is.object(xObj)) {
                                for (const prop of props) {
                                    const name = prop.key.name;
                                    if (prop.value.type === "StringLiteral") {
                                        throw new adone.error.NotImplemented("Not implemented yet");
                                        // lazies.push({ name: objectName, path: adone.std.path.join(basePath, prop.value.value) });
                                    } else if (prop.value.type === "ArrowFunctionExpression") {
                                        const lazyPath = this.getPathFor(path, prop.value);
                                        xObj.value.set(name, new adone.js.adone.LazyFunction({ parent: this, ast: prop.value, path: lazyPath, xModule: this }));
                                    }
                                }
                            }
                            // TODO
                            // throw new adone.error.NotValid(`Not valid attempt to lazify non-object: ${xObj.ast.type}`);
                        }
                        path.skip();
                        return;
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
                                    throw new adone.error.NotFound(`Variable '${specifier.local.name}' not found in global scope`);
                                }
                                if (specifier.local.name !== specifier.exported.name) {
                                    switch (specifier.exported.name) {
                                        // we cannot use reserved words as a variable name
                                        // we use "export { null_ as null }" for example
                                        case "null":
                                        case "undefined":
                                        case "function":
                                        case "class":
                                        case "finally":
                                            break;
                                        default:
                                            throw new adone.error.NotValid(`Local name of export-specifier should be same as exported name: "${specifier.local.name}" != ${specifier.exported.name}`);
                                    }
                                }
                                // It should always be VariableDeclarator (ClassDeclarations???)
                                // assert.equal(xObj.ast.type, "VariableDeclarator");
                                this._addExport(xObj.value, false, xObj.ast, specifier.exported.name);
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
                        const declrNode = node.declarations[0];
                        if (!is.null(declrNode.init) && declrNode.init.type === "CallExpression" && declrNode.init.callee.type === "MemberExpression") {
                            const exprName = this._getMemberExpressionName(declrNode.init.callee);
                            if (exprName === "adone.nativeAddon") {
                                shouldSkip = true;
                                if (declrNode.id.type === "Identifier") {
                                    const name = declrNode.id.name;
                                    this.addToScope(new adone.js.adone.Native({ name, parent: this, ast: null, path: null, xModule: this }));
                                    this._addGlobal(name, null, node.kind, false);
                                } else if (declrNode.id.type === "ObjectPattern") {
                                    const natives = this._traverseObjectPattern(declrNode.id, node.kind);
                                    for (const name of natives) {
                                        this.addToScope(new adone.js.adone.Native({ name, parent: this, ast: null, path: null, xModule: this }));
                                        this._addGlobal(name, null, node.kind, false);
                                    }
                                }
                                return realPath;
                            }
                        }

                        this._traverseVariableDeclarator(declrNode, node.kind);

                        if (!is.null(declrNode.init) && declrNode.init.type === "Identifier") {
                            shouldSkip = true;
                        } else {
                            realPath.traverse({
                                enter(subPath) {
                                    realPath = subPath;
                                    subPath.stop();
                                }
                            });
                        }
                    }

                    return realPath;
                };

                const realPath = expandDeclaration(path);

                if (!shouldSkip) {
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
                            if (
                                node.type.endsWith("Declarator")
                                || ["VariableDeclaration", "ClassDeclaration", "FunctionDeclaration"].includes(node.type)
                            ) {
                                this.addToScope(xObj);
                            }
                        }
                    }
                    if (!is.undefined(isDefault)) {
                        // export default adone.asNamespace(identifier);
                        // TODO
                        this._addExport(xObj, isDefault, node);
                    }
                }

                path.skip();
            }
        });

        if (lazies.length > 0) {
            for (const { name, path } of lazies) {
                const filePath = await fs.lookup(path);
                const lazyModule = new adone.js.adone.Module({ nsName: this.nsName, filePath });
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
                if (adone.js.adone.is.module(lazy)) {
                    if (is.undefined(lazy.exports().default)) { // special case
                        result[name] = lazy;
                    } else {
                        Object.assign(result, XModule.lazyExports(lazy));
                    }
                } else if (adone.js.adone.is.lazyFunction(lazy)) {
                    result[name] = lazy;
                }
            }
        }
        return result;
    }

    numberOfExports() {
        return Object.keys(this.exports()).length;
    }

    /**
     * Populates the collector with self ast
     */
    _getSelfAdoneDependencies(collector) {
        collector.handle(this.ast);
    }

    /**
     * Returns a map of adone dependencies related only to this file
     */
    getSelfAdoneDependencies() {
        // TODO: do not return self in deps??
        const collector = new AdoneDependencyCollector();
        this._getSelfAdoneDependencies(collector);
        return collector.dependencies;
    }

    /**
     * Populates the collector with self and lazy/imported/required ast
     */
    _getAdoneDependencies(collector) {
        this._getSelfAdoneDependencies(collector);
        for (const v of this.lazies.values()) {
            if (v.getType() !== "Module") {
                continue;
            }
            v._getAdoneDependencies(collector);
        }
    }

    /**
     * Returna a map of adone dependencies related to this file and all the lazy loaded/required/imported modules
     */
    getAdoneDependencies() {
        // TODO: do not return self in deps??
        const collector = new AdoneDependencyCollector();
        this._getAdoneDependencies(collector);
        return collector.dependencies;
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
        if (is.null(node.init)) {
            return this._addGlobal(node.id.name, null, kind, false);
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
                    if (namespace.length === 0 && objectName.indexOf(".") >= 0) {
                        const parts = objectName.split(".");
                        this._addGlobal(parts[parts.length - 1], parts.slice(0, -1).join("."), kind, false);
                    } else {
                        this._addReference(name);
                        this._addGlobal(objectName, namespace, kind, false);
                    }
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
            }
            this._addGlobal(value.name, null, kind, false);
            return [key.name];
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

    _addExport(xObj, isDefault, node, exportedName) {
        node = node || xObj.ast;
        let name;
        if (!isDefault) {
            switch (node.type) {
                case "ClassDeclaration": {
                    if (is.null(node.id)) {
                        throw new adone.error.NotValid("Anonymous class");
                    }
                    name = node.id.name;
                    break;
                }
                case "FunctionDeclaration":
                case "VariableDeclarator": {
                    name = xObj.name;
                    break;
                }
                case "Identifier": {
                    name = node.name;
                    break;
                }
                default:
                    throw new adone.error.NotSupported(`Unsupported export type: ${node.type}`);
            }
            if (exportedName) {
                // export { a as null }
                name = exportedName;
            }
        } else {
            name = "default";
        }

        this._exports[name] = xObj;
    }

    static lazyExports(xModule) {
        const rawExports = xModule.exports();
        const result = {};
        // adone.log(Object.values(rawExports).map(x => x.ast));
        if (adone.js.adone.is.object(rawExports.default)) {
            for (const [key, val] of rawExports.default.entries()) {
                result[key] = val;
            }
        } else if (adone.js.adone.is.functionLike(rawExports.default)) {
            // adone.log(rawExports.default.name);
            result[rawExports.default.name] = rawExports.default;
        } else if (is.undefined(rawExports.default)) {
            return rawExports;
        } else {
            throw new adone.error.NotSupported(`Unsupported type '${rawExports.default.ast.type}' of exports: ${xModule.filePath}`);
        }
        return result;
    }
}
adone.tag.define("CODEMOD_MODULE");
adone.tag.add(XModule, "CODEMOD_MODULE");
