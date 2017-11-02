const {
    fs,
    is,
    configuration,
    std,
    project,
    util
} = adone;

export default class JsconfigConfigTask extends project.generator.task.Base {
    async run(input) {
        const configPath = std.path.join(this.context.project.cwd, "jsconfig.json");
        if (await fs.exists(configPath)) {
            this.context.config.jsconfig = new configuration.Jsconfig({
                cwd: this.context.project.cwd
            });
            await this.context.config.jsconfig.load();
        } else if (!is.configuration(this.context.config.jsconfig)) {
            this.context.config.jsconfig = new configuration.Jsconfig({
                cwd: this.context.project.cwd
            });

            this.context.config.jsconfig.raw = {
                compilerOptions: {
                    target: "es6",
                    experimentalDecorators: true
                },
                exclude: [
                    "node_modules"
                ],
                include: [
                    "src"
                ]
            };
        }

        if (is.plainObject(input)) {
            this.context.config.jsconfig.merge(util.pick(input, ["exclude", "include", "compilerOptions"]));
        }

        return this.context.config.jsconfig.save();
    }
}
