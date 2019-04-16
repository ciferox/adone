const {
    is,
    realm
} = adone;

export const importAdoneReplacer = (replacer) => () => ({
    visitor: {
        ImportDeclaration(p, state) {
            if (p.node.source.value === "adone") {
                p.node.source.value = replacer(state.file.opts);
            }
        }
    }
});

export const checkRealm = async (r) => {
    let result = r;
    if (is.string(result)) {
        result = new realm.RealmManager({
            cwd: r
        });
    }

    if (!is.realm(result)) {
        throw new adone.error.NotValidException("Invalid realm instance");
    }

    await result.connect();

    return result;
}
