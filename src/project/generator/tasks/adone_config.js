const {
    fs,
    is,
    project,
    std,
    util
} = adone;

export default class AdoneConfigTask extends project.generator.task.Base {
    async run(input) {
        const configPath = std.path.join(input.cwd, "adone.json");
        if (await fs.exists(configPath)) {
            this.context.adoneConfig = new project.Configuration({
                cwd: input.cwd
            });
            await this.context.adoneConfig.load();
        } else if (!is.configuration(this.context.adoneConfig)) {
            this.context.adoneConfig = new project.Configuration({
                cwd: input.cwd
            });
        }

        this.context.adoneConfig.merge(util.pick(input, ["name", "description", "version", "author", "type", "structure", "bin", "main"]));

        return this.context.adoneConfig.save();
    }
}
