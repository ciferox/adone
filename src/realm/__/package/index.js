const {
    x,
    is,
    fs,
    std,
    fast,
    util
} = adone;

const PACKAGES_PATH = adone.config.packagesPath;

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
    constructor(realm, { name = "", symlink = false } = {}) {
        this.realm = realm;
        this.name = name;
        this.symlink = symlink;
    }

    async install() {
        this.bar = adone.runtime.term.progress({
            schema: " :spinner preparing"
        });
        this.bar.update(0);

        let adoneConf;

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
            this.bar.setSchema(` :spinner {green-fg}{bold}${this.name}{/bold} v${adoneConf.raw.version}{/green-fg} successfully installed`);
            this.bar.complete(true);
        } catch (err) {
            if (!is.null(this.bar)) {
                this.bar.setSchema(" :spinner installation failed");
                this.bar.complete(false);
            }
            throw err;
        }
    }

    async uninstall() {
        this.bar = adone.runtime.term.progress({
            schema: " :spinner preparing"
        });
        this.bar.update(0);

        try {
            this.destPath = std.path.join(adone.config.packagesPath, this.name);

            if (!(await fs.exists(this.destPath))) {
                throw new adone.x.NotExists(`Package ${this.name} is not exists`);
            }

            const adoneConf = await adone.project.Configuration.load({
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

            this.bar.setSchema(` :spinner {green-fg}{bold}${this.fullName}{/bold}{/green-fg} successfully uninstalled`);
            this.bar.complete(true);
        } catch (err) {
            if (!is.null(this.bar)) {
                this.bar.setSchema(" :spinner installation failed");
                this.bar.complete(false);
            }
            throw err;
        }
    }

    async list(type) {
        const result = {};
        if (is.string(type)) {
            const types = Object.keys(handlers);

            for (const type of types) {
                const handler = this._getHandlerClass(type);
                result[handler.name] = await handler.list(); // eslint-disable-line
            }
            return result;
        }
        
        return this._getHandlerClass(type).list();
    }

    async _installFromLocal() {
        this.bar.setSchema(` :spinner installing from: ${this.path}`);

        const adoneConf = await adone.project.Configuration.load({
            cwd: this.path
        });

        this.name = is.string(adoneConf.raw.type) ? `${adoneConf.raw.type}.${adoneConf.raw.name}` : adoneConf.raw.name;
        this.destPath = std.path.join(PACKAGES_PATH, this.name);

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

            for (const cfg of subConfigs) {
                const destPath = std.path.join(this.destPath, cfg.rel.getRelativePath());
                // Update adone.json config with all assigned properties from project's main adone.conf.
                await cfg.origFull.save(destPath); // eslint-disable-line
                await this._registerPackage(cfg.origFull, destPath); // eslint-disable-line
            }
        }

        return adoneConf;
    }

    _registerPackage(adoneConf, destPath) {
        return this._getHandlerClass(adoneConf.raw.type).register(adoneConf, destPath);
    }

    _unregisterPackage(adoneConf) {
        return this._getHandlerClass(adoneConf.raw.type).unregister(adoneConf);
    }

    _getHandlerClass(type) {
        const HandlerClass = Handler[type];

        if (!is.class(HandlerClass)) {
            throw new adone.x.NotValid(`Not valid handler for: ${type}`);
        }

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

        const entries = await adoneConf.getProjectEntries();

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

        return fast.src([
            "**/.meta/**/*",
            "**/adone.json"
        ], {
            cwd: this.path
        }).dest(this.destPath, DEST_OPTIONS);
    }
}
