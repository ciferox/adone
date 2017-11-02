const {
    configuration,
    fs,
    is,
    std,
    project,
    text,
    util,
    system: { process: { exec } }
} = adone;

export default class NpmConfigTask extends project.generator.task.Base {
    async run(input) {
        const npmPackagePath = std.path.join(input.cwd, "package.json");
        if (await fs.exists(npmPackagePath)) {
            this.context.config.npm = new configuration.Npm({
                cwd: input.cwd
            });
            await this.context.config.npm.load();
        } else if (!is.configuration(this.context.config.npm)) {
            this.context.config.npm = new configuration.Npm({
                cwd: input.cwd
            });

            this.context.config.npm.assign({
                license: "MIT",
                engines: {
                    node: ">=8.0.0"
                },
                dependencies: {}
            }, util.pick(this.context.project, ["name", "version", "description", "author"]));
        }

        await this.context.config.npm.save();

        const packages = [];

        if (is.array(input.dependencies)) {
            for (const dep of input.dependencies) {
                const info = {
                    name: dep,
                    section: "dependencies",
                }
                if (this.context.flag.skipNpm) {
                    info.args = ["view", dep, "version"];
                } else {
                    info.args = ["i", dep];
                }
                packages.push(info);
            }
        }

        if (is.array(input.devDependencies)) {
            for (const devDep of input.devDependencies) {
                const info = {
                    name: devDep,
                    section: "devDependencies",
                }
                if (this.context.flag.skipNpm) {
                    info.args = ["view", devDep, "version"];
                } else {
                    info.args = ["i", devDep, "--save-dev"];
                }
                packages.push(info);
            }
        }

        for (const pkg of packages) {
            // eslint-disable-next-line
            const result = await exec("npm", pkg.args, {
                cwd: input.cwd
            });

            if (this.context.flag.skipNpm) {
                this.context.config.npm.set([pkg.section, pkg.name], `^${text.stripLastCRLF(result.stdout)}`);
            }
        }

        if (this.context.flag.skipNpm) {
            await this.context.config.npm.save();
        }
    }
}
