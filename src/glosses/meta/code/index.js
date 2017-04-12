const { is, fs, std } = adone;

const indexRe = /^index\.(js|ajs|tjs)$/;

const isFunctionLike = (xObj) => (adone.meta.code.is.function(xObj) || adone.meta.code.is.arrowFunction(xObj) || adone.meta.code.is.class(xObj));

export class Inspector {
    constructor({ dir = "lib" }) {
        this.dir = dir;
        this.path = std.path.join(adone.appinstance.adoneRootPath, this.dir);
        this.namespaces = {};
    }

    async attachNamespace(nsName) {
        const metaCode = adone.meta.code;
        const info = adone.meta.getNamespaceInfo(nsName);        
        const ns = {
            info,
            modules: [],
            $: {}
        };

        const sources = await adone.meta.getNamespacePaths({ name: nsName, pathPrefix: this.path, relative: false });
        for (const filePath of sources) {
            const code = await fs.readFile(filePath, { check: true, encoding: "utf8" });
            const sourceModule = new metaCode.Module({ code, filePath });
            ns.modules.push({
                path: filePath,
                module: sourceModule
            });
        }

        this.namespaces[nsName] = ns;

        if (ns.modules.length === 1) {
            const nsModule = ns.modules[0].module;
            const moduleExports = nsModule.exports;
            if (nsModule.numberOfExports() === 1 && metaCode.is.object(moduleExports.default)) { // #1
                this._mapModuleToNamespace(ns, nsModule);
                return;
            } else if (nsModule.numberOfExports() >= 1 && !metaCode.is.object(moduleExports.default)) { // #2
                this._mapModuleToNamespace(ns, nsModule);
                return;
            }
        }

        // #3
        if (ns.modules.length >= 1) {
            const isOk = ns.modules.every((x) => {
                const nsModule = x.module;
                const moduleExports = nsModule.exports;
                const numberOfExports = nsModule.numberOfExports();
                return !indexRe.test(std.path.basename(x.path)) &&
                    ((numberOfExports === 1 && isFunctionLike(moduleExports.default) && is.string(moduleExports.default.name)) ||
                    (is.undefined(moduleExports.default) && numberOfExports >= 1));
            });
            if (isOk) {
                for (const nsModInfo of ns.modules) {
                    const nsModule = nsModInfo.module;
                    this._mapModuleToNamespace(ns, nsModule);
                }
                return;
            }
        }
    }

    _mapModuleToNamespace(ns, nsModule) {
        const moduleExports = nsModule.exports;
        if (adone.meta.code.is.object(moduleExports.default)) {
            for (const [key, val] of moduleExports.default.entries()) {
                ns.$[key] = val;
            }
        } else if (isFunctionLike(moduleExports.default)) {
            ns.$[moduleExports.default.name] = moduleExports.default;
        } else if (is.undefined(moduleExports.default)) {
            for (const [key, val] of Object.entries(moduleExports)) {
                ns.$[key] = val;
            }
        }
    }

    listNamespaces() {
        return Object.keys(this.namespaces);
    }

    getNamespace(name, names = null) {
        const { namespace, objectName } = adone.meta.parseName(name);
        if (!is.propertyOwned(this.namespaces, namespace)) {
            throw new adone.x.Unknown(`Unknown namespace: '${namespace}'`);
        }
        if (is.plainObject(names)) {
            names.namespace = namespace;
            names.objectName = objectName;
        }
        return this.namespaces[namespace];
    }

    get(name) {
        const names = {};
        const ns = this.getNamespace(name, names);
        if (!is.propertyOwned(ns.$, names.objectName)) {
            throw new adone.x.NotFound(`Unknown object: ${name}`);
        }
        return ns.$[names.objectName];
    }

    getCode(name) {
        const xObj = this.get(name);
        return xObj.code;
    }
}

adone.lazify({
    Base: "./base",
    Module: "./module",
    Class: "./class",
    Function: "./function",
    ArrowFunction: "./arrow_function",
    Object: "./object",
    Variable: "./variable",
    Expression: "./expression",
    Constant: "./constant",
    Statement: "./statement",
    Export: "./export",
    JsNative: "./js_native",
    Adone: "./adone",
    is: () => ({
        module: (x) => adone.tag.has(x, adone.tag.CODEMOD_MODULE),
        class: (x) => adone.tag.has(x, adone.tag.CODEMOD_CLASS),
        variable: (x) => adone.tag.has(x, adone.tag.CODEMOD_VAR),
        function: (x) => adone.tag.has(x, adone.tag.CODEMOD_FUNCTION),
        arrowFunction: (x) => adone.tag.has(x, adone.tag.CODEMOD_ARROWFUNCTION),
        object: (x) => adone.tag.has(x, adone.tag.CODEMOD_OBJECT),
        expression: (x) => adone.tag.has(x, adone.tag.CODEMOD_EXPRESSION),
        constant: (x) => adone.tag.has(x, adone.tag.CODEMOD_CONST),
        statement: (x) => adone.tag.has(x, adone.tag.CODEMOD_STATEMENT)
    })
}, exports, require);
