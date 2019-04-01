const {
    is,
    realm
} = adone;

export class Inspector {
    constructor() {
        this.path = adone.ROOT_PATH;
        this.namespaces = new Map();
    }

    async attachNamespace(nsName) {
        if (!this.namespaces.has(nsName)) {
            const ns = await realm.code.Namespace.inspect(nsName, this.path);
            // console.log(ns.name);
            // console.log(adone.meta.inspect(Object.keys(ns.exports), { style: "color" }));
            this.namespaces.set(nsName, ns/*await realm.code.Namespace.inspect(nsName, this.path)*/);
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
            throw new adone.error.UnknownException(`Unknown namespace: '${namespace}'`);
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

const __ = adone.lazify({
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
    }
}, exports, require);


// Predicates
export const isModule = (x) => x instanceof __.Module;
export const isClass = (x) => x instanceof __.Class;
export const isVariable = (x) => x instanceof __.Variable;
export const isFunction = (x) => x instanceof __.Function;
export const isArrowFunction = (x) => x instanceof __.ArrowFunction;
export const isLazyFunction = (x) => x instanceof __.LazyFunction;
export const isObject = (x) => x instanceof __.Object;
export const isExpression = (x) => x instanceof __.Expression;
export const isConstant = (x) => x instanceof __.Constant;
export const isStatement = (x) => x instanceof __.Statement;
export const isNative = (x) => x instanceof __.Native;
export const isFunctionLike = (x) => isFunction(x) || isArrowFunction(x) || isClass(x);
