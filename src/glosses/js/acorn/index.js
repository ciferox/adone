exports = module.exports = adone.asNamespace(require("acorn"));

adone.lazify({
    isReference: "is-reference",
    plugin: () => adone.lazify({
        dynamicImport: "acorn-dynamic-import",
        jsx: "acorn-jsx"
    })
}, exports);
