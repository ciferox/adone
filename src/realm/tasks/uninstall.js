const {
    fs,
    is,
    std,
    task
} = adone;

export default class InstallTask extends task.Task {
    async run({ name = "" } = {}) {
        this.manager.notify(this, "progress", {
            message: "preparing"
        });

        this.packageName = name;

        try {
            let isValid = true;

            this.destPath = std.path.join(this.manager.config.PACKAGES_PATH, this.packageName);

            if (!await fs.exists(this.destPath)) {
                isValid = false;
            } else {
                const lstat = await fs.lstat(this.destPath); // eslint-disable-line
                if (lstat.isSymbolicLink()) {
                    try {
                        const stat = await fs.stat(this.destPath); // eslint-disable-line
                    } catch (err) {
                        if (err.code === "ENOENT") {
                            isValid = false;
                        }
                    }
                }
            }

            if (!isValid) {
                // This is not complete solution. Additionally it is necessary to notify all handlers,
                // passing them path to pacakge with the damaged symlink.

                const typeHandlers = this.manager.getAllTypeHandlers();
                let found = false;
                for (const typeHandler of typeHandlers) {
                    const result = await typeHandler.checkAndRemove(name); // eslint-disable-line
                    if (!found && result) {
                        found = result;
                    }
                }

                if (!found) {
                    this.manager.notify(this, "progress", {
                        message: `No package with name {green-fg}{bold}${this.packageName}{/bold}{/green-fg}`,
                        status: false
                    });
                    return;
                }
            } else {
                if (!(await fs.exists(this.destPath))) {
                    throw new adone.error.NotExists(`Package ${this.packageName} is not exists`);
                }

                const adoneConf = await adone.configuration.Adone.load({
                    cwd: this.destPath
                });

                this.fullName = this.packageName;
                this.packageName = adoneConf.getFullName();

                if (is.string(adoneConf.raw.type)) {
                    await this.manager.unregisterComponent(adoneConf);
                } else {
                    const subConfigs = adoneConf.getSubConfigs();
                    if (subConfigs.length === 0) {
                        throw new adone.error.NotValid("Invalid or useless package");
                    }

                    for (const sub of subConfigs) {
                        await this.manager.unregisterComponent(sub.config); // eslint-disable-line
                    }
                }
            }

            await fs.rm(this.destPath);

            this.manager.notify(this, "progress", {
                message: `{green-fg}{bold}${this.fullName}{/bold}{/green-fg} successfully uninstalled`,
                status: true
            });
        } catch (err) {
            this.manager.notify(this, "progress", {
                message: err.message,
                status: false
            });

            throw err;
        }
    }
}
