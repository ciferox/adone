const {
    fs,
    is,
    configuration,
    std,
    project
} = adone;

export default class JsconfigTask extends project.generator.task.Base {
    async run(input) {
        const cwd = is.plainObject(input) && is.string(input.cwd) ? input.cwd : this.context.project.cwd;
        if (!is.configuration(this.context.config.jsconfig)) {
            const configPath = std.path.join(cwd, "jsconfig.json");
            if (await fs.exists(configPath)) {
                this.context.config.jsconfig = new configuration.Jsconfig({
                    cwd
                });
                await this.context.config.jsconfig.load();
            } else {
                this.context.config.jsconfig = new configuration.Jsconfig({
                    cwd
                });

                this.context.config.jsconfig.raw = {
                    compilerOptions: {
                        target: "es6",
                        experimentalDecorators: true
                    },
                    exclude: [
                        "node_modules"
                    ]
                };
            }
        }

        if (is.plainObject(input)) {
            if (is.array(input.include)) {
                if (!is.array(this.context.config.jsconfig.raw.include)) {
                    this.context.config.jsconfig.raw.include = [];
                }
                for (const item of input.include) {
                    if (!this.context.config.jsconfig.raw.include.includes(item)) {
                        this.context.config.jsconfig.raw.include.push(item);
                    }
                }
            }

            if (is.array(input.exclude)) {
                if (!is.array(this.context.config.jsconfig.raw.exclude)) {
                    this.context.config.jsconfig.raw.exclude = [];
                }
                for (const item of input.exclude) {
                    if (!this.context.config.jsconfig.raw.exclude.includes(item)) {
                        this.context.config.jsconfig.raw.exclude.push(item);
                    }
                }
            }
        }

        return this.context.config.jsconfig.save();
    }
}
