const {
    configuration,
    fs,
    is,
    std,
    project,
    util,
    runtime: { term },
    system: { process: { exec } }
} = adone;

export default class NpmTask extends project.BaseTask {
    async main(info, command, data, context) {
        this.manager.notify(this, "progress", {
            message: "initializing {bold}node modules{/bold}"
        });

        this.cwd = info.cwd;
        const config = this.config = new configuration.Npm({
            cwd: info.cwd
        });
        const npmPackagePath = std.path.join(info.cwd, "package.json");
        if (await fs.exists(npmPackagePath)) {
            await config.load();
        } else {
            config.assign({
                license: "MIT",
                dependencies: {},
                devDependencies: {}
            }, util.pick(info, ["name", "version", "description", "author"]));

            await config.save();
        }

        switch (command) {
            case "install":
                await this._install(data, context);
                break;
        }
    }

    async _install({ dependencies, devDependencies } = {}, context) {
        const packages = [];

        if (is.array(dependencies)) {
            for (const dep of dependencies) {
                const info = {
                    name: dep,
                    section: "dependencies"
                };
                if (context.flag.skipNpm) {
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
                if (context.flag.skipNpm) {
                    info.args = ["view", devDep, "version"];
                } else {
                    info.args = ["i", devDep, "--save-dev"];
                }
                packages.push(info);
            }
        }

        for (const pkg of packages) {
            this.manager.notify(this, "progress", {
                message: `{bold}npm:{/bold} executing ${term.theme.accent(`npm ${pkg.args.join(" ")}`)}`
            });

            // eslint-disable-next-line
            const result = await exec("npm", pkg.args, {
                cwd: this.cwd
            });
        }
    }
}
