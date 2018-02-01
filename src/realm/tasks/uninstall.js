const {
    cli: { kit },
    fs,
    is,
    std,
    task
} = adone;

export default class InstallTask extends task.Task {
    async run({ name = "" } = {}) {
        kit.createProgress("preparing");

        this.name = name;

        try {
            this.destPath = std.path.join(adone.realm.config.packagesPath, this.name);

            const lstat = await fs.lstat(this.destPath); // eslint-disable-line

            let isValid = true;
            if (lstat.isSymbolicLink()) {
                try {
                    const stat = await fs.stat(this.destPath); // eslint-disable-line
                } catch (err) {
                    if (err.code === "ENOENT") {
                        isValid = false;
                    }
                }
            }

            if (!isValid) {
                // This is not complete solution. Additionally it is necessary to notify all handlers,
                // passing them path to pacakge with the damaged symlink.
            } else {
                if (!(await fs.exists(this.destPath))) {
                    throw new adone.exception.NotExists(`Package ${this.name} is not exists`);
                }

                const adoneConf = await adone.configuration.Adone.load({
                    cwd: this.destPath
                });

                this.fullName = this.name;
                this.name = adoneConf.getFullName();

                if (is.string(adoneConf.raw.type)) {
                    await this.manager.unregisterComponent(adoneConf);
                } else {
                    const subConfigs = adoneConf.getSubConfigs();
                    if (subConfigs.length === 0) {
                        throw new adone.exception.NotValid("Invalid or useless package");
                    }

                    for (const sub of subConfigs) {
                        await this.manager.unregisterComponent(sub.config); // eslint-disable-line
                    }
                }
            }

            await fs.rm(this.destPath);

            kit.updateProgress({
                message: `{green-fg}{bold}${this.fullName}{/bold}{/green-fg} successfully uninstalled`,
                result: true
            });
        } catch (err) {
            kit.updateProgress({
                message: "installation failed",
                result: false
            });

            throw err;
        }
    }
}
