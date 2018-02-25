const {
    is,
    std
} = adone;

adone.lazify({
    config: () => require(std.path.join(adone.ROOT_PATH, "configs", "realm.js")),
    TypeHandler: "./type_handler",
    Manager: "./manager",
    task: "./tasks",
    Keychain: "./keychain"
}, adone.asNamespace(exports), require);

export const getManager = async () => {
    if (is.null(adone.runtime.realm)) {
        adone.runtime.realm = await adone.realm.Manager.create();
    }
    return adone.runtime.realm;
};
