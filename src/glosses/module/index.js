adone.lazify({
    getParentPath: "./get_parent_path",
    Module: "./module",
    require: "./require",
    requireRelative: "require-relative",
    requireAddon: "./require_addon",
    resolve: "./resolve",
    transform: "./transforms"
}, adone.asNamespace(exports), require);

export const BABEL_PLUGINS = [
    "@babel/plugin-transform-flow-strip-types",
    ["@babel/plugin-proposal-decorators", { legacy: true }],
    ["@babel/plugin-proposal-class-properties", { loose: true }],
    ["@babel/plugin-proposal-private-methods", { loose: true }],
    "@babel/plugin-proposal-do-expressions",
    "@babel/plugin-proposal-export-default-from",
    "@babel/plugin-proposal-partial-application",
    "@babel/plugin-transform-modules-commonjs",
    "@babel/plugin-proposal-numeric-separator"
];
