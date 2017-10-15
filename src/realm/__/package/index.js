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
    constructor(realm, { name, symlink = false } = {}) {
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
            this.bar.setSchema(` :spinner {green-fg}${this.name} v${adoneConf.version}{/green-fg} successfully installed`);
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

        let adoneConf;

        try {
            if (std.path.isAbsolute(this.name)) {
                adoneConf = await this._installFromLocal();
            } else {
                if (this.name.startsWith("adone.")) {
                    //
                } else {
                    this.name = std.path.join(process.cwd(), this.name);
                    adoneConf = await this._installFromLocal();
                }
            }
            this.bar.setSchema(` :spinner {green-fg}${this.name} v${adoneConf.version}{/green-fg} successfully installed`);
            this.bar.complete(true);
        } catch (err) {
            if (!is.null(this.bar)) {
                this.bar.setSchema(" :spinner installation failed");
                this.bar.complete(false);
            }
            throw err;
        }
    }

    async _installFromLocal() {
        this.bar.setSchema(` :spinner installing from: ${this.path}`);

        const adoneConf = await adone.project.Configuration.load({
            cwd: this.path
        });

        this.name = is.string(adoneConf.type) ? `${adoneConf.type}.${adoneConf.name}` : adoneConf.name;
        this.destPath = std.path.join(PACKAGES_PATH, this.name);

        if (this.symlink) {
            await this._createSymlink();
        } else {
            await this._copyFiles(adoneConf);
        }

        if (is.string(adoneConf.type)) {
            await this._registerPackage(adoneConf);
        } else {

        }

        return adoneConf;
    }

    _registerPackage(adoneConf) {
        const HandlerClass = Handler[adoneConf.type];

        if (!is.class(HandlerClass)) {
            throw new adone.x.NotValid(`Not valid handler for: ${adoneConf.type}`);
        }

        const handler = new HandlerClass(this, adoneConf);
        return handler.register();
    }

    async _createSymlink() {
        if (await fs.exists(this.destPath)) {
            const stat = fs.lstatSync(this.destPath);
            if (!stat.isSymbolicLink()) {
                throw new x.Exists("Extension already installed, please uninstall it and try again");
            }
            await fs.rm(this.destPath);
        }

        if (is.windows) {
            await fs.symlink(this.name, this.destPath, "junction");
        } else {
            await fs.symlink(this.name, this.destPath);
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
