const {
    configuration,
    fs,
    is,
    project,
    std,
    util
} = adone;

export default class AdoneConfigTask extends project.generator.task.Base {
    async run(input) {
        const configPath = std.path.join(this.context.project.cwd, "adone.json");
        if (await fs.exists(configPath)) {
            this.context.config.adone = await configuration.Adone.load({
                cwd: this.context.project.cwd
            });
        } else if (!is.configuration(this.context.config.adone)) {
            this.context.config.adone = new configuration.Adone({
                cwd: this.context.project.cwd
            });
            // Update config
            this.context.config.adone.merge(util.pick(this.context.project, ["name", "description", "version", "author", "type"]));
        }

        if (is.plainObject(input)) {
            // Update config
            this.context.config.adone.merge(util.pick(input, ["name", "description", "version", "author", "type", "structure", "bin", "main"]));
        }
        return this.context.config.adone.save();
    }
}
