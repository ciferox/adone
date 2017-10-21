const {
    is
} = adone;

export default class Configuration extends adone.configuration.FileConfiguration {
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
        return super.load(adone.cli.CONFIG_NAME);
    }

    save() {
        return super.save(adone.cli.CONFIG_NAME, null, {
            space: "    "
        });
    }
}
