const { is, fs, std } = adone;

/*
    Чтобы использовать меньше статической информации для работы со структурой протсранств имён,
    следует рассмотреть все случаи и определить правила экспортирования объектов из модулей:
    1. Пространство имён формируется только default-экпортом из одного файла: adone.is, adone.x.
       Условие: один исходный файл с одним default-экспортом.

*/

export class Adone {
    constructor({ dir = "lib" }) {
        this.dir = dir;
        this.path = std.path.join(adone.appinstance.adoneRootPath, this.dir);
        this.namespaces = {};
    }

    async attachNamespace(nsName) {
        const info = adone.meta.getNamespaceInfo(nsName);        
        const ns = {
            info, 
            modules: [],
            $: {}
        };

        const sources = await adone.meta.getNamespacePaths({ name: nsName, pathPrefix: this.path, relative: false });
        for (const filePath of sources) {
            const code = await fs.readFile(filePath, { check: true, encoding: "utf8" });
            const sourceModule = new adone.meta.code.Module({ code, filePath });
            ns.modules.push({
                path: filePath,
                module: sourceModule
            });
        }

        if (sources.length === 1) {
            const commonModule = ns.modules[0].module;
            const moduleExports = commonModule.exports;
            if (commonModule.numberOfExports() === 1 && adone.meta.code.is.object(moduleExports.default)) {
                for (const [key, val] of moduleExports.default.entries()) {
                    ns.$[key] = val;
                }
            }
        }
        this.namespaces[nsName] = ns;
    }

    get(name) {
        const { namespace, objectName } = adone.meta.parseName(name);
        if (!is.propertyOwned(this.namespaces, namespace)) {
            throw new adone.x.Unknown(`Unknown namespace: '${namespace}'`);
        }

        const ns = this.namespaces[namespace];
        if (!is.propertyOwned(ns.$, objectName)) {
            throw new adone.x.NotFound(`Unknown object: ${name}`);
        }
        return ns.$[objectName];
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
