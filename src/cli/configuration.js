const {
    is
} = adone;

const CONFIG_NAME = "cli.json";

export default class Configuration extends adone.configuration.Generic {
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
        return super.load(CONFIG_NAME);
    }

    save() {
        return super.save(CONFIG_NAME, null, {
            space: "    "
        });
    }

    static async load() {
        const config = new Configuration({
            cwd: adone.realm.config.configsPath
        });

        if (await adone.fs.exists(adone.std.path.join(adone.realm.config.configsPath, CONFIG_NAME))) {
            // assign config from home
            await config.load(CONFIG_NAME);
        } else {
            await config.save();
        }
    
        return config;
    }

    static get name() {
        return CONFIG_NAME;
    }
}
