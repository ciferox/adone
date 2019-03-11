export const importAdoneReplacer = (replacer) => () => ({
    visitor: {
        ImportDeclaration(p, state) {
            if (p.node.source.value === "adone") {
                p.node.source.value = replacer(state.file.opts);
            }
        }
    }
});