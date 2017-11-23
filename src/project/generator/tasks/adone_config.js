const {
    configuration,
    fs,
    is,
    project,
    std,
    util
} = adone;

export default class AdoneConfigTask extends project.generator.task.Base {
    async run(input, context) {
        const cwd = input.cwd;
        const config = new configuration.Adone({
            cwd
        });
        const configPath = std.path.join(cwd, "adone.json");
        if (await fs.exists(configPath)) {
            await config.load();
        } else {
            config.merge(util.pick(context.project, ["name", "description", "version", "author", "type"]));
        }

        if (is.plainObject(input)) {
            // Update config
            config.merge(util.pick(input, ["name", "description", "version", "author", "type", "structure", "bin", "main"]));
        }
        return config.save();
    }
}
