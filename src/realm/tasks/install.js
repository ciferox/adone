const {
    cli: { kit },
    fast,
    fs,
    is,
    std,
    task,
    util,
    error
} = adone;

const DEST_OPTIONS = {
    produceFiles: true,
    originTimes: true,
    originMode: true,
    originOwner: true
};

export default class InstallTask extends task.Task {
    async run({ name = "", build = false, symlink = false } = {}) {
        kit.createProgress("preparing");

        this.name = name;
        this.build = build;
        this.symlink = symlink;

        let adoneConf;

        this.rollbackData = {};

        try {
            if (std.path.isAbsolute(name)) {
                this.srcPath = name;
                adoneConf = await this._installFromLocal();
            } else {
                if (name.startsWith("adone.")) {
                    // 
                } else if (is.url(name)) {
                    if (name.endsWith(".git")) {
                        adoneConf = await this._installFromGit();
                    } else {
                        // Download and install from archive
                    }
                } else {
                    this.srcPath = std.path.join(process.cwd(), name);
                    adoneConf = await this._installFromLocal();
                }
            }
            const version = is.string(adoneConf.raw.version) ? ` ${adoneConf.raw.version}` : "";
            kit.updateProgress({
                message: `{green-fg}{bold}${this.name}{/bold}${version}{/green-fg} successfully installed`,
                result: true
            });

            return adoneConf;
        } catch (err) {
            kit.updateProgress({
                message: "installation failed",
                result: false
            });

            throw err;
        }
    }

    async undo(err) {
        if (is.plainObject(this.rollbackData)) {
            if (is.array(this.rollbackData.subProjects)) {
                const cliConfig = await adone.cli.Configuration.load();
                for (const subInfo of this.rollbackData.subProjects) {
                    cliConfig.deleteCommand(subInfo.adoneConf.raw.name);
                }

                await cliConfig.save();
            }

            const adoneConf = this.rollbackData.adoneConf;
            if (is.configuration(adoneConf)) {
                const name = adoneConf.getFullName();
                const destPath = std.path.join(adone.realm.config.PACKAGES_PATH, name);
                return fs.rm(destPath);
            }
        }
    }

    async _installFromLocal() {
        kit.updateProgress({
            message: `installing from {green-fg}${this.srcPath}{/green-fg}`
        });

        const adoneConf = await adone.configuration.Adone.load({
            cwd: this.srcPath
        });

        this.rollbackData.adoneConf = adoneConf;

        if (!is.string(adoneConf.raw.name)) {
            throw new adone.error.NotValid("Package name is not specified");
        }

        // Check and create packages path
        await adone.fs.mkdirp(adone.realm.config.PACKAGES_PATH);

        this.name = adoneConf.getFullName();
        this.destPath = std.path.join(adone.realm.config.PACKAGES_PATH, this.name);

        if (this.build) {
            kit.updateProgress({
                message: "building project"
            });
            await this._buildProject();
        }

        kit.updateProgress({
            message: "copying files"
        });

        if (this.symlink) {
            await this._createSymlink();
        } else {
            await this._copyFiles(adoneConf);
        }

        kit.updateProgress({
            message: "registering components"
        });

        if (is.string(adoneConf.raw.type)) {
            await this.manager.registerComponent(adoneConf, this.destPath);
        } else {
            const subConfigs = adoneConf.getSubConfigs();
            if (subConfigs.length === 0) {
                throw new adone.error.NotValid("Invalid or useless package");
            }

            this.rollbackData.subProjects = [];

            for (const sub of subConfigs) {
                const destPath = std.path.join(this.destPath, sub.dirName);
                // Update adone.json config with all assigned properties from project's main adone.conf.
                await sub.config.save(); // eslint-disable-line

                this.rollbackData.subProjects.push({
                    adoneConf: sub.config,
                    destPath
                });

                await this.manager.registerComponent(sub.config, destPath); // eslint-disable-line
            }
        }

        return adoneConf;
    }

    async _installFromGit() {
        kit.updateProgress({
            message: `cloning {green-fg}${this.name}{/green-fg}`
        });

        this.srcPath = await fs.tmpName();
        await fs.mkdirp(std.path.dirname(this.srcPath));

        await adone.vcs.git.Clone(this.name, this.srcPath);

        this.build = true;
        this.symlink = false;

        return this._installFromLocal();
    }

    async _createSymlink() {
        if (await fs.exists(this.destPath)) {
            const stat = fs.lstatSync(this.destPath);
            if (!stat.isSymbolicLink()) {
                throw new error.Exists(`Package ${this.name} already installed, please uninstall it and try again`);
            }
            await fs.rm(this.destPath);
        }

        if (is.windows) {
            await fs.symlink(this.srcPath, this.destPath, "junction");
        } else {
            await fs.symlink(this.srcPath, this.destPath);
        }
    }

    async _copyFiles(adoneConf) {
        // Remove old files
        await fs.rm(this.destPath);

        const entries = await adoneConf.getEntries();

        if (entries.length > 0) {
            for (const info of entries) {
                let srcPath;
                let dstDir;

                if (is.string(info.dst)) {
                    srcPath = util.globize(info.dst, {
                        recursive: true
                    });
                    dstDir = info.dst;
                } else {
                    srcPath = info.src;
                    dstDir = adone.util.globParent(info.src);
                }

                // eslint-disable-next-line
                await fast.src([
                    srcPath,
                    "!**/*.map"
                ], {
                    cwd: this.srcPath
                }).dest(std.path.join(this.destPath, dstDir), DEST_OPTIONS);
            }
        } else {
            const indexPath = std.path.join(this.srcPath, "index.js");
            if (!(await fs.exists(indexPath))) {
                throw new adone.error.NotExists(`File ${indexPath} is not exist`);
            }

            await fs.copyTo(indexPath, this.destPath);
        }

        return fast.src([
            "**/.meta/**/*",
            "**/adone.json"
        ], {
            cwd: this.srcPath
        }).dest(this.destPath, DEST_OPTIONS);
    }

    async _buildProject() {
        const projectManager = new adone.project.Manager({
            cwd: this.srcPath
        });
        projectManager.setSilent(this.manager.silent);
        await projectManager.load();
        const observer = await projectManager.rebuild();
        return observer.result;
    }
}
