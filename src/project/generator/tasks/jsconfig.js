const {
    fs,
    is,
    configuration,
    std,
    project
} = adone;

export default class JsconfigTask extends project.generator.task.Base {
    async run({ cwd, include, exclude } = {}) {
        const config = new configuration.Jsconfig({
            cwd
        });
        const configPath = std.path.join(cwd, "jsconfig.json");
        if (await fs.exists(configPath)) {
            await config.load();
        } else {
            config.raw = {
                compilerOptions: {
                    target: "es6",
                    experimentalDecorators: true
                },
                exclude: [
                    "node_modules"
                ]
            };
        }

        if (is.array(include)) {
            if (!is.array(config.raw.include)) {
                config.raw.include = [];
            }
            for (const item of include) {
                if (!config.raw.include.includes(item)) {
                    config.raw.include.push(item);
                }
            }
        }

        if (is.array(exclude)) {
            if (!is.array(config.raw.exclude)) {
                config.raw.exclude = [];
            }
            for (const item of exclude) {
                if (!config.raw.exclude.includes(item)) {
                    config.raw.exclude.push(item);
                }
            }
        }

        return config.save();
    }
}
