const {
    is,
    std
} = adone;

export class Inspector {
    constructor() {
        this.path = adone.rootPath;
        this.namespaces = new Map();
    }

    async attachNamespace(nsName) {
        if (!this.namespaces.has(nsName)) {
            const ns = await adone.js.adone.Namespace.inspect(nsName, this.path);
            // adone.log(ns.name);
            // adone.log(adone.meta.inspect(Object.keys(ns.exports), { style: "color" }));
            this.namespaces.set(nsName, ns/*await adone.js.adone.Namespace.inspect(nsName, this.path)*/);
        }
    }

    isAttached(name) {
        const { namespace } = adone.meta.parseName(name);
        return this.namespaces.has(namespace);
    }

    listNamespaces() {
        return [...this.namespaces.keys()];
    }

    getNamespace(name, names = null) {
        const { namespace, objectName } = adone.meta.parseName(name);
        if (!this.namespaces.has(namespace)) {
            throw new adone.exception.Unknown(`Unknown namespace: '${namespace}'`);
        }
        if (is.plainObject(names)) {
            names.namespace = namespace;
            names.objectName = objectName;
        }
        return this.namespaces.get(namespace);
    }

    get(name) {
        const names = {};
        const ns = this.getNamespace(name, names);
        return ns.get(names.objectName);
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
    LazyFunction: "./lazy_function",
    Object: "./object",
    ObjectProperty: "./object_property",
    ObjectMethod: "./object_method",
    Variable: "./variable",
    Expression: "./expression",
    Constant: "./constant",
    Statement: "./statement",
    Export: "./export",
    JsNative: "./js_native",
    Adone: "./adone",
    Global: "./global",
    Native: "./native",
    nodeInfo: () => (node) => {
        switch (node.type) {
            case "Identifier": return `Identifier:${node.name}`;
            case "ClassDeclaration": return `ClassDeclaration:${node.id.name}`;
        }
        return node.type;
    },
    is: () => ({
        functionLike: (x) => (adone.js.adone.is.function(x) || adone.js.adone.is.arrowFunction(x) || adone.js.adone.is.class(x)),
        module: (x) => adone.tag.has(x, "CODEMOD_MODULE"),
        class: (x) => adone.tag.has(x, "CODEMOD_CLASS"),
        variable: (x) => adone.tag.has(x, "CODEMOD_VAR"),
        function: (x) => adone.tag.has(x, "CODEMOD_FUNCTION"),
        arrowFunction: (x) => adone.tag.has(x, "CODEMOD_ARROWFUNCTION"),
        lazyFunction: (x) => adone.tag.has(x, "CODEMOD_LAZYFUNCTION"),
        object: (x) => adone.tag.has(x, "CODEMOD_OBJECT"),
        expression: (x) => adone.tag.has(x, "CODEMOD_EXPRESSION"),
        constant: (x) => adone.tag.has(x, "CODEMOD_CONST"),
        statement: (x) => adone.tag.has(x, "CODEMOD_STATEMENT"),
        native: (x) => adone.tag.has(x, "CODEMOD_NATIVE")
    })
}, exports, require);
