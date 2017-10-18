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

    hasCommand(name) {
        return is.array(this.raw.commands) && this.raw.commands.findIndex((x) => x.name === name) >= 0;
    }

    deleteCommand(name) {
        const index = this.raw.commands.findIndex((x) => x.name === name);
        if (index >= 0) {
            this.raw.commands.splice(index, 1);
        }
    }

    load() {
        return super.load(configName);
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
            cwd: adone.realm.config.configsPath
        });

        if (await adone.fs.exists(adone.std.path.join(adone.realm.config.configsPath, configName))) {
            // assign config from home
            await cliConfig.load(configName);
        } else {
            await cliConfig.save();
        }
    }

    return cliConfig;
};
