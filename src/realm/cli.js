const {
    is
} = adone;

export const configName = "cli.json";

class CliConfiguration extends adone.configuration.FileConfiguration {
    constructor(options) {
        super(options);

        this.raw = {
            groups: [
                {
                    name: "common",
                    description: "Common commands"
                },
                {
                    name: "subsystem",
                    description: "Subsystems"
                }
            ]
        };
    }

    save() {
        return super.save(configName, null, {
            space: "    "
        });
    }
}

let cliConfig = null;

export const getConfig = async () => {
    if (is.null(cliConfig)) {
        cliConfig = new CliConfiguration({
            cwd: adone.config.configsPath
        });

        if (await adone.fs.exists(adone.std.path.join(adone.config.configsPath, configName))) {
            // assign config from home
            await cliConfig.load(configName);
        } else {
            await cliConfig.save();
        }
    }

    return cliConfig;
};
