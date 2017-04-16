const { is, std } = adone;

export class Inspector {
    constructor({ dir = "lib" }) {
        this.dir = dir;
        this.path = std.path.join(adone.appinstance.adoneRootPath, this.dir);
        this.namespaces = {};
    }

    async attachNamespace(nsName) {
        this.namespaces[nsName] = await adone.meta.code.Namespace.inspect(nsName, this.path);
    }

    isAttached(name) {
        const { namespace } = adone.meta.parseName(name);
        return is.propertyOwned(this.namespaces, namespace);
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
        if (!is.propertyOwned(ns.exports, names.objectName)) {
            throw new adone.x.NotFound(`Unknown object: ${name}`);
        }
        return ns.exports[names.objectName];
    }

    getCode(name) {
        const xObj = this.get(name);
        return xObj.code;
    }
}

adone.lazify({
    Namespace: "./namespace",
    Base: "./base",
    Module: "./module",
    AdoneModule: "./adone_module",
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
    Global: "./global",
    nodeInfo: () => (node) => {
        switch (node.type) {
            case "Identifier": return `Identifier:${node.name}`;
            case "ClassDeclaration": return `ClassDeclaration:${node.id.name}`;
        }
        return node.type;
    },
    is: () => ({
        functionLike: (x) => (adone.meta.code.is.function(x) || adone.meta.code.is.arrowFunction(x) || adone.meta.code.is.class(x)),
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
