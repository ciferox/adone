const {
    is,
    lazify
} = adone;

// Service statuses
export const STATUS = {
    INVALID: "invalid",
    DISABLED: "disabled",
    INACTIVE: "inactive",
    STARTING: "starting",
    ACTIVE: "active",
    STOPPING: "stopping"
};

// Possible statuses
export const STATUSES = [
    STATUS.INVALID,
    STATUS.DISABLED,
    STATUS.INACTIVE,
    STATUS.STARTING,
    STATUS.ACTIVE,
    STATUS.STOPPING
];

export const CONFIG_NAME = "omnitron.json";

adone.definePredicates({
    omnitronService: "OMNITRON_SERVICE"
});

lazify({
    SystemDB: "./systemdb",
    Configuration: "./configuration",
    Service: "./service",
    Omnitron: "./omnitron",
    Dispatcher: "./dispatcher",
    dispatcher: () => new adone.omnitron.Dispatcher()
}, adone.asNamespace(exports), require);

export let config = null; // eslint-disable-line

export const loadConfig = async () => {
    if (is.null(config)) {
        config = new adone.omnitron.Configuration({
            cwd: adone.realm.config.configsPath
        });

        if (await adone.fs.exists(adone.std.path.join(adone.realm.config.configsPath, CONFIG_NAME))) {
            // assign config from home
            await config.load(CONFIG_NAME);
        } else {
            await config.save();
        }
    }

    return config;
};
