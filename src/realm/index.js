const {
    is,
    std
} = adone;

adone.lazify({
    config: () => {
        const conf = {
            ...require(std.path.join(adone.ROOT_PATH, "configs", "realm.js"))
        };

        adone.lazify({
            identity: std.path.join(conf.CONFIGS_PATH, "identity.json")
        }, conf);
        return conf;
    },
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
