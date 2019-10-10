adone.lazify({
    getParentPath: "./get_parent_path",
    Module: "./module",
    require: "./require",
    requireRelative: "require-relative",
    requireAddon: "./require_addon",
    resolve: "./resolve",
    transform: "./transforms"
}, adone.asNamespace(exports), require);

const {
    js: { babel: { createConfigItem }}
} = adone;

export const BABEL_PLUGINS = [
    createConfigItem(require("@babel/plugin-transform-flow-strip-types")),
    createConfigItem([require("@babel/plugin-proposal-decorators"), { legacy: true }]),
    createConfigItem([require("@babel/plugin-proposal-class-properties"), { loose: true }]),
    createConfigItem([require("@babel/plugin-proposal-private-methods"), { loose: true }]),
    createConfigItem(require("@babel/plugin-proposal-do-expressions")),
    createConfigItem(require("@babel/plugin-proposal-export-default-from")),
    createConfigItem(require("@babel/plugin-proposal-partial-application")),
    createConfigItem(require("@babel/plugin-transform-modules-commonjs")),
    createConfigItem(require("@babel/plugin-proposal-numeric-separator"))
];
