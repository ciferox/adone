const {
    configuration,
    fs,
    is,
    project,
    std,
    util
} = adone;

const SUB_COMMANDS = [
    "create"
];

export default class AdoneConfigTask extends project.BaseTask {
    async main(subCommand, info) {
        if (!SUB_COMMANDS.includes(subCommand)) {
            throw new adone.error.InvalidArgumentException(`Invalid command: ${subCommand}`);
        }

        switch (subCommand) {
            case "create":
                return this._create(info);
            case "load":
                return this._load(info);
        }
        // const configPath = std.path.join(cwd, "adone.json");
        // if (await fs.exists(configPath)) {
        //     await config.load();
        // } else {
        //     config.merge(util.pick(info, ["name", "description", "version", "author"]));
        // }

        // if (is.plainObject(info)) {
        //     // Update config
        //     config.merge(util.pick(info, ["name", "description", "version", "author", "struct", "bin", "main"]));
        // }

        // if (info.type && info.type !== "default") {
        //     config.set("type", info.type);
        // }
        // return config.save();
    }

    async _create(info) {
        const configPath = std.path.join(info.cwd, "adone.json");
        if (await fs.exists(configPath)) {
            throw new adone.error.ExistsException(`Configuration '${configPath}' already exists`);
        }

        this.config = new configuration.Adone({
            cwd: info.cwd
        });
        this.config.merge(util.pick(info, ["name", "description", "version", "author", "bin", "main", "struct"]));
        return this.config.save();
    }

    async _load(info) {
        this.config = configuration.Adone.load({
            cwd: info.cwd
        });
        return this.config;
    }
}
