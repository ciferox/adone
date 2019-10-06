exports = module.exports = adone.asNamespace(require("acorn"));

adone.lazify({
    isReference: "is-reference",
    plugin: () => adone.lazify({
        bigint: "acorn-bigint",
        dynamicImport: "acorn-dynamic-import",
        importMeta: "acorn-import-meta",
        jsx: "acorn-jsx"
    })
}, exports);
