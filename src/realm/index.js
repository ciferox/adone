const {
    is
} = adone;

adone.lazify({
    Realm: "./realm"
}, adone.asNamespace(exports), require);

adone.lazifyPrivate({
    Package: "./__/package",
    AbstractHandler: "./__/package/abstract_handler"
}, exports, require);

let localRealm = null;

export const getLocal = async () => {
    if (is.null(localRealm)) {
        localRealm = new adone.realm.Realm();
        await localRealm._initialize();
    }
    return localRealm;
};
