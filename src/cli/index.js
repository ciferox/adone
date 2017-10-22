const {
    is,
    lazify
} = adone;

export const CONFIG_NAME = "cli.json";

lazify({
    Configuration: "./configuration"
}, adone.asNamespace(exports), require);

export let config = null; // eslint-disable-line

export const loadConfig = async () => {
    if (is.null(config)) {
        config = new adone.cli.Configuration({
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
