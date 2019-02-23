const {
    is
} = adone;

const realm = adone.lazify({
    Configuration: "./configuration",
    Manager: "./manager",
    BaseTask: "./base_task",
    TransformTask: "./transform_task",
    TypeHandler: "./type_handler",
    Keychain: "./keychain"
}, adone.asNamespace(exports), require);

export const getCoreManager = () => {
    if (is.undefined(adone.runtime.realm.manager)) {
        // const id = adone.crypto.hash.sha256(`${await adone.util.machineId(true)}${realm.config.realm}`, "hex");
        const defaultManager = new realm.Manager({
            cwd: adone.std.path.join(__dirname, "..", "..")
        });
        
        adone.runtime.realm.manager = defaultManager;
        adone.runtime.realm.env = defaultManager.env;
        adone.runtime.realm.config = defaultManager.config;
        adone.runtime.realm.identity = defaultManager.identity;
    }

    return adone.runtime.realm.manager;
};
