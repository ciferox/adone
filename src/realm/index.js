const {
    is
} = adone;

const realm = adone.lazify({
    Manager: "./manager",
    TypeHandler: "./type_handler",
    Keychain: "./keychain"
}, adone.asNamespace(exports), require);

export const getManager = () => {
    if (is.undefined(adone.runtime.realm.manager)) {
        // const id = adone.crypto.hash.sha256(`${await adone.util.machineId(true)}${realm.config.realm}`, "hex");
        const defaultManager = new realm.Manager({
            cwd: adone.ROOT_PATH
        });

        // Load default tasks and handlers
        // await defaultManager.initialize();
        
        adone.runtime.realm.manager = defaultManager;
        adone.runtime.realm.config = adone.runtime.config = defaultManager.config;
        adone.runtime.realm.identity = defaultManager.config.identity.server;
    }

    return adone.runtime.realm.manager;
};
