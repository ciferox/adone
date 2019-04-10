const __ = adone.lazify({
    Sandbox: "./sandbox",
    AstProcessor: "./ast_processor",
    Module: "./module",

    BaseNode: "./base_node",
    Identifier: "./nodes/identifier",
    BlockStatement: "./nodes/block_statement",
    ReturnStatement: "./nodes/return_statement",
    FunctionDeclaration: "./nodes/function_declaration",
    FunctionExpression: "./nodes/function_expression",
    ArrowFunctionExpression: "./nodes/arrow_function_expression",
    VariableDeclaration: "./nodes/variable_declaration",
    VariableDeclarator: "./nodes/variable_declarator",
    MemberExpression: "./nodes/member_expression",
    ObjectExpression: "./nodes/object_expression",
    ArrayExpression: "./nodes/array_expression",
    NewExpression: "./nodes/new_expression",
    CallExpression: "./nodes/call_expression",
    DoExpression: "./nodes/do_expression",
    StringLiteral: "./nodes/string_literal",
    NumericLiteral: "./nodes/numeric_literal",
    BooleanLiteral: "./nodes/boolean_literal",
    RegExpLiteral: "./nodes/regexp_literal",
    TemplateLiteral: "./nodes/template_literal",
    NullLiteral: "./nodes/null_literal",
    ObjectPattern: "./nodes/object_pattern",
    ObjectProperty: "./nodes/object_property",

    Expression: "./expression",
    Function: "./function",
    Reference: "./reference",

    Variable: "./variable",
    ExternalVariable: "./variables/external",
    UndefinedVariable: "./variables/undefined",
    ExportsVariable: "./variables/exports",
    ModuleVariable: "./variables/module",
    RequireVariable: "./variables/require",

    Scope: "./scope",
    GlobalScope: "./global_scope",
    ModuleScope: "./module_scope",
    FunctionScope: "./function_scope",
    BlockScope: "./block_scope",

    helper: "./helpers"


    // Bundler: "./bundler",
    // CodeLayout: "./code_layout",
    // Inspector: "./inspector",
    // Namespace: "./namespace",
    // Base: "./base",
    // ModuleOld: "./module_old",
    // AdoneModule: "./adone_module",
    // Class: "./class",
    // ArrowFunction: "./arrow_function",
    // LazyFunction: "./lazy_function",
    // Object: "./object",
    // ObjectProperty: "./object_property",
    // ObjectMethod: "./object_method",
    // Constant: "./constant",
    // Statement: "./statement",
    // Export: "./export",
    // JsNative: "./js_native",
    // Adone: "./adone",
    // Global: "./global",
    // Native: "./native",
}, exports, require);

export const DEFAULT_PARSER_PLUGINS = [
    ["decorators", { decoratorsBeforeExport: false }],
    "classProperties",
    "classPrivateProperties",
    "classPrivateMethods",
    "numericSeparator",
    "partialApplication",
    "doExpressions"
];


// export const nodeInfo = (node) => {
//     switch (node.type) {
//         case "Identifier": return `Identifier:${node.name}`;
//         case "ClassDeclaration": return `ClassDeclaration:${node.id.name}`;
//     }
//     return node.type;
// };

// // Predicates
// export const isModule = (x) => x instanceof __.Module;
// export const isClass = (x) => x instanceof __.Class;
// export const isVariable = (x) => x instanceof __.Variable;
// export const isFunction = (x) => x instanceof __.Function;
// export const isArrowFunction = (x) => x instanceof __.ArrowFunction;
// export const isLazyFunction = (x) => x instanceof __.LazyFunction;
// export const isObject = (x) => x instanceof __.Object;
// export const isExpression = (x) => x instanceof __.Expression;
// export const isConstant = (x) => x instanceof __.Constant;
// export const isStatement = (x) => x instanceof __.Statement;
// export const isNative = (x) => x instanceof __.Native;
// export const isFunctionLike = (x) => isFunction(x) || isArrowFunction(x) || isClass(x);
