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
        const configPath = std.path.join(input.cwd, "jsconfig.json");
        if (await fs.exists(configPath)) {
            this.context.jsconfig = new configuration.Jsconfig({
                cwd: input.cwd
            });
            await this.context.jsconfig.load();
        } else if (!is.configuration(this.context.jsconfig)) {
            this.context.jsconfig = new configuration.Jsconfig({
                cwd: input.cwd
            });

            this.context.jsconfig.raw = {
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

        this.context.jsconfig.merge(util.pick(input, ["exclude", "include", "compilerOptions"]));

        return this.context.jsconfig.save();
    }
}
