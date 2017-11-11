const {
    js: { compiler: { types: t } }
} = adone;

export default function () {
    return {
        pre(file) {
            file.set("helpersNamespace", t.identifier("babelHelpers"));
        }
    };
}
