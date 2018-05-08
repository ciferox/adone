const {
    configuration,
    fs,
    is,
    project,
    std,
    util
} = adone;

export default class AdoneConfigTask extends project.generator.task.Base {
    async run(info, context) {
        const cwd = info.cwd;
        const config = new configuration.Adone({
            cwd
        });
        const configPath = std.path.join(cwd, "adone.json");
        if (await fs.exists(configPath)) {
            await config.load();
        } else {
            config.merge(util.pick(context, ["name", "description", "version", "author"]));
        }

        if (is.plainObject(info)) {
            // Update config
            config.merge(util.pick(info, ["name", "description", "version", "author", "struct", "bin", "main"]));
        }

        if (info.type && info.type !== "default") {
            config.set("type", info.type);
        }
        return config.save();
    }
}
