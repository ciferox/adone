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

export default class NpmTask extends project.generator.task.Base {
    async run(input) {
        const cwd = is.plainObject(input) && is.string(input.cwd) ? input.cwd : this.context.project.cwd;
        if (!is.configuration(this.context.config.npm)) {
            const npmPackagePath = std.path.join(cwd, "package.json");
            if (await fs.exists(npmPackagePath)) {
                this.context.config.npm = new configuration.Npm({
                    cwd
                });
                await this.context.config.npm.load();
            } else {
                this.context.config.npm = new configuration.Npm({
                    cwd
                });
    
                this.context.config.npm.assign({
                    license: "MIT",
                    engines: {
                        node: ">=8.0.0"
                    },
                    dependencies: {}
                }, util.pick(this.context.project, ["name", "version", "description", "author"]));

                await this.context.config.npm.save();
            }
        }

        const packages = [];

        if (is.plainObject(input)) {
            if (is.array(input.dependencies)) {
                for (const dep of input.dependencies) {
                    const info = {
                        name: dep,
                        section: "dependencies"
                    };
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
                        section: "devDependencies"
                    };
                    if (this.context.flag.skipNpm) {
                        info.args = ["view", devDep, "version"];
                    } else {
                        info.args = ["i", devDep, "--save-dev"];
                    }
                    packages.push(info);
                }
            }
        }

        for (const pkg of packages) {
            // eslint-disable-next-line
            const result = await exec("npm", pkg.args, {
                cwd
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
