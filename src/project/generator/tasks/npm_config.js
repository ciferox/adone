const {
    configuration,
    fs,
    is,
    std,
    project,
    util,
    system: { process: { exec } }
} = adone;

export default class NpmConfigTask extends project.generator.task.Base {
    async run(input) {
        const npmPackagePath = std.path.join(input.cwd, "package.json");
        if (await fs.exists(npmPackagePath)) {
            this.context.npmConfig = new configuration.Npm({
                cwd: input.cwd
            });
            await this.context.npmConfig.load();
        } else if (!is.configuration(this.context.npmConfig)) {
            this.context.npmConfig = new configuration.Npm({
                cwd: input.cwd
            });

            this.context.npmConfig.raw = {
                license: "MIT",
                engines: {
                    node: ">=8.0.0"
                },
                dependencies: {}
            };
        }

        const props = util.pick(input, ["name", "description", "version", "author"]);

        this.context.npmConfig.assign(props);
        await this.context.npmConfig.save();

        const commandsArgs = [];

        if (is.array(input.dependencies)) {
            for (const devDep of input.devDependencies) {
                commandsArgs.push(["i", devDep]);
            }
        }

        if (is.array(input.devDependencies)) {
            for (const devDep of input.devDependencies) {
                commandsArgs.push(["i", devDep, "--save-dev"]);
            }
        }

        for (const args of commandsArgs) {
            // eslint-disable-next-line
            await exec("npm", args, {
                cwd: input.cwd
            });
        }
    }
}
