const {
    is,
    lazify
} = adone;

export const CONFIG_NAME = "cli.json";

lazify({
    Configuration: "./configuration",
}, adone.asNamespace(exports), require);

const __ = lazify({
    config: () => null
}, exports, require, {
    writable: true
});

export const loadConfig = async () => {
    if (is.null(__.config)) {
        __.config = new adone.cli.Configuration({
            cwd: adone.realm.config.configsPath
        });

        if (await adone.fs.exists(adone.std.path.join(adone.realm.config.configsPath, CONFIG_NAME))) {
            // assign config from home
            await __.config.load(CONFIG_NAME);
        } else {
            await __.config.save();
        }
    }

    return __.config;
};
