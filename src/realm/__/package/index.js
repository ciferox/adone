const {
    x,
    is,
    fs,
    std,
    fast,
    util
} = adone;

const PACKAGES_PATH = adone.realm.config.packagesPath;

const DEST_OPTIONS = {
    produceFiles: true,
    originTimes: true,
    originMode: true,
    originOwner: true
};

const handlerNames = adone.std.fs.readdirSync(std.path.join(__dirname, "handlers")).filter((name) => !name.endsWith(".map"));
const handlers = {};

for (const name of handlerNames) {
    handlers[std.path.basename(name, ".js").replace(/_/g, ".")] = `./${std.path.join("handlers", name)}`;
}

const Handler = adone.lazify(handlers, null, require);

export default class Package {
    constructor(realm, { name = "", build = false, symlink = false } = {}) {
        this.realm = realm;
        this.name = name;
        this.build = build;
        this.symlink = symlink;
        this.rollbackData = null;
    }

    async install() {
        this.realm._createProgress({
            schema: " :spinner preparing"
        });

        let adoneConf;

        this.rollbackData = {};

        try {
            if (std.path.isAbsolute(this.name)) {
                this.path = this.name;
                adoneConf = await this._installFromLocal();
            } else {
                if (this.name.startsWith("adone.")) {
                    //
                } else {
                    this.path = std.path.join(process.cwd(), this.name);
                    adoneConf = await this._installFromLocal();
                }
            }
            const version = is.string(adoneConf.raw.version) ? ` ${adoneConf.raw.version}` : "";
            this.realm._updateProgress({
                schema: ` :spinner {green-fg}{bold}${this.name}{/bold}${version}{/green-fg} successfully installed`,
                result: true
            });

            return adoneConf;
        } catch (err) {
            this.realm._updateProgress({
                schema: " :spinner installation failed",
                result: false
            });

            throw err;
        }
    }

    async uninstall() {
        this.realm._createProgress({
            schema: " :spinner preparing"
        });

        try {
            this.destPath = std.path.join(adone.realm.config.packagesPath, this.name);

            if (!(await fs.exists(this.destPath))) {
                throw new adone.x.NotExists(`Package ${this.name} is not exists`);
            }

            const adoneConf = await adone.configuration.Adone.load({
                cwd: this.destPath
            });

            this.fullName = this.name;
            this.name = is.string(adoneConf.raw.type) ? `${adoneConf.raw.type}.${adoneConf.raw.name}` : adoneConf.raw.name;

            if (is.string(adoneConf.raw.type)) {
                await this._unregisterPackage(adoneConf);
            } else {
                const subConfigs = adoneConf.getSubConfigs();
                if (subConfigs.length === 0) {
                    throw new adone.x.NotValid("Invalid or useless package");
                }

                for (const cfg of subConfigs) {
                    await this._unregisterPackage(cfg.origFull); // eslint-disable-line
                }
            }

            await fs.rm(this.destPath);

            this.realm._updateProgress({
                schema: ` :spinner {green-fg}{bold}${this.fullName}{/bold}{/green-fg} successfully uninstalled`,
                result: true
            });
        } catch (err) {
            this.realm._updateProgress({
                schema: " :spinner installation failed",
                result: false
            });

            throw err;
        }
    }

    async list(type) {
        const result = {};
        if (is.string(type)) {
            const types = Object.keys(handlers);

            for (const type of types) {
                const handler = this._createHandlerClass(type);
                result[handler.name] = await handler.list(); // eslint-disable-line
            }
            return result;
        }

        return this._createHandlerClass(type).list();
    }

    async rollback(err) {
        if (is.plainObject(this.rollbackData)) {
            if (is.array(this.rollbackData.subProjects)) {
                const cliConfig = await adone.cli.loadConfig();
                for (const subInfo of this.rollbackData.subProjects) {
                    cliConfig.deleteCommand(subInfo.adoneConf.raw.name);
                }

                await cliConfig.save();
            }

            const adoneConf = this.rollbackData.adoneConf;
            if (is.configuration(adoneConf)) {
                const name = is.string(adoneConf.raw.type) ? `${adoneConf.raw.type}.${adoneConf.raw.name}` : adoneConf.raw.name;
                const destPath = std.path.join(PACKAGES_PATH, name);
                return fs.rm(destPath);
            }
        }
    }

    async _installFromLocal() {
        this.realm._updateProgress({
            schema: ` :spinner installing from: ${this.path}`
        });

        const adoneConf = await adone.configuration.Adone.load({
            cwd: this.path
        });

        this.rollbackData.adoneConf = adoneConf;

        if (!is.string(adoneConf.raw.name)) {
            throw new adone.x.NotValid("Package name is not specified");
        }

        this.name = is.string(adoneConf.raw.type) ? `${adoneConf.raw.type}.${adoneConf.raw.name}` : adoneConf.raw.name;
        this.destPath = std.path.join(PACKAGES_PATH, this.name);

        if (this.build) {
            await this._buildProject();
        }

        if (this.symlink) {
            await this._createSymlink();
        } else {
            await this._copyFiles(adoneConf);
        }

        if (is.string(adoneConf.raw.type)) {
            await this._registerPackage(adoneConf, this.destPath);
        } else {
            const subConfigs = adoneConf.getSubConfigs();
            if (subConfigs.length === 0) {
                throw new adone.x.NotValid("Invalid or useless package");
            }

            this.rollbackData.subProjects = [];

            for (const cfg of subConfigs) {
                const destPath = std.path.join(this.destPath, cfg.rel.getRelativePath());
                // Update adone.json config with all assigned properties from project's main adone.conf.
                await cfg.origFull.save(destPath); // eslint-disable-line

                this.rollbackData.subProjects.push({
                    adoneConf: cfg.origFull,
                    destPath
                });

                await this._registerPackage(cfg.origFull, destPath); // eslint-disable-line
            }
        }

        return adoneConf;
    }

    _registerPackage(adoneConf, destPath) {
        return this._createHandlerClass(adoneConf.raw.type).register(adoneConf, destPath);
    }

    _unregisterPackage(adoneConf) {
        return this._createHandlerClass(adoneConf.raw.type).unregister(adoneConf);
    }

    _getHandler(type) {
        const HandlerClass = Handler[type];

        if (!is.class(HandlerClass)) {
            throw new adone.x.Unknown(`Unknown package type: ${type}`);
        }

        return HandlerClass;
    }

    _createHandlerClass(type) {
        const HandlerClass = this._getHandler(type);
        return new HandlerClass(this);
    }

    async _createSymlink() {
        if (await fs.exists(this.destPath)) {
            const stat = fs.lstatSync(this.destPath);
            if (!stat.isSymbolicLink()) {
                throw new x.Exists(`Package ${this.name} already installed, please uninstall it and try again`);
            }
            await fs.rm(this.destPath);
        }

        if (is.windows) {
            await fs.symlink(this.path, this.destPath, "junction");
        } else {
            await fs.symlink(this.path, this.destPath);
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

                if (is.string(info.$dst)) {
                    srcPath = util.globize(info.$dst, {
                        recursively: true
                    });
                    dstDir = info.$dst;
                } else {
                    srcPath = info.$src;
                    dstDir = adone.util.globParent(info.$src);
                }

                // eslint-disable-next-line
                await fast.src([
                    srcPath,
                    "!**/*.map"
                ], {
                    cwd: this.path
                }).dest(std.path.join(this.destPath, dstDir), DEST_OPTIONS);
            }
        } else {
            const indexPath = std.path.join(this.path, "index.js");
            if (!(await fs.exists(indexPath))) {
                throw new adone.x.NotExists(`File ${indexPath} is not exist`);
            }

            await fs.copyTo(indexPath, this.destPath);
        }

        return fast.src([
            "**/.meta/**/*",
            "**/adone.json"
        ], {
            cwd: this.path
        }).dest(this.destPath, DEST_OPTIONS);
    }

    async _buildProject() {
        const manager = new adone.project.Manager(this.path);
        manager.setSilent(this.realm.silent);
        await manager.load();
        await manager.rebuild();
    }
}
