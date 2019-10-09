adone.lazify({
    acorn: "./acorn",
    babel: "./babel",
    esutils: "esutils",
    tokTypes: ["@babel/parser", (mod) => mod.tokTypes],
    parse: ["@babel/parser", (mod) => mod.parse],
    parseExpression: ["@babel/parser", (mod) => mod.parseExpression],
    parseFunction: "./parse_function",
    walk: "babylon-walk",
    highlight: "@babel/highlight",
    recast: "recast"
}, adone.asNamespace(exports), require);

export const AsyncFunction = Object.getPrototypeOf(async function () { }).constructor;
