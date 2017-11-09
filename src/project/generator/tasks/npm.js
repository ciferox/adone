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
    async run({ cwd, dependencies, devDependencies } = {}) {        
        const config = new configuration.Npm({
            cwd
        });
        const npmPackagePath = std.path.join(cwd, "package.json");
        if (await fs.exists(npmPackagePath)) {
            await config.load();
        } else {
            config.assign({
                license: "MIT",
                engines: {
                    node: ">=8.0.0"
                },
                dependencies: {}
            }, util.pick(this.context.project, ["name", "version", "description", "author"]));

            await config.save();
        }

        const packages = [];

        if (is.array(dependencies)) {
            for (const dep of dependencies) {
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

        if (is.array(devDependencies)) {
            for (const devDep of devDependencies) {
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

        for (const pkg of packages) {
            // eslint-disable-next-line
            const result = await exec("npm", pkg.args, {
                cwd
            });

            if (this.context.flag.skipNpm) {
                config.set([pkg.section, pkg.name], `^${text.stripLastCRLF(result.stdout)}`);
            }
        }

        if (this.context.flag.skipNpm) {
            await config.save();
        }
    }
}
