const __ = adone.lazify({
    CodeLayout: "./code_layout",
    Inspector: "./inspector",
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
    Native: "./native"
}, exports, require);

export const nodeInfo = (node) => {
    switch (node.type) {
        case "Identifier": return `Identifier:${node.name}`;
        case "ClassDeclaration": return `ClassDeclaration:${node.id.name}`;
    }
    return node.type;
};

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
