const {
    application: { locking },
    configuration,
    x,
    is,
    fs,
    std,
    text,
    util
} = adone;

const __ = adone.private(adone.realm);

export default class Realm {
    constructor() {
        this.id = null;
        this.bar = null;
        this.silent = false;
    }

    async _initialize() {
        // Obtain realm id
        this.id = adone.math.hash("sha256", `${await util.machineId(true)}${adone.realm.config.realm}`);
    }

    async install(options) {
        let pkg = null;
        try {
            if (!is.plainObject(options) || !is.string(options.name)) {
                throw new adone.x.InvalidArgument("Install options is not valid");
            }
            await this.lock();
            pkg = this._package(options);
            const conf = await pkg.install();
            return conf;
        } catch (err) {
            !is.null(pkg) && await pkg.rollback(err);
            throw err;
        } finally {
            await this.unlock();
        }
    }

    async uninstall(options) {
        try {
            await this.lock();
            await this._package(options).uninstall();
        } finally {
            await this.unlock();
        }
    }

    async list({ keyword = "", threshold = 0.2 } = {}) {
        const packages = await fs.readdir(adone.realm.config.packagesPath);

        const result = [];
        for (const name of packages) {
            let isValid = true;
            const packagePath = std.path.join(adone.realm.config.packagesPath, name);
            const lstat = await fs.lstat(packagePath); // eslint-disable-line

            if (lstat.isSymbolicLink()) {
                try {
                    const stat = await fs.stat(packagePath); // eslint-disable-line
                } catch (err) {
                    if (err.code === "ENOENT") {
                        isValid = false;
                    }
                }
            }

            const packageInfo = {
                name,
                isValid,
                isSymlink: lstat.isSymbolicLink()
            };

            // eslint-disable-next-line
            if (isValid && await fs.exists(std.path.join(packagePath, adone.configuration.Adone.name))) {
                // eslint-disable-next-line
                const adoneConf = await adone.configuration.Adone.load({
                    cwd: packagePath
                });

                packageInfo.version = adoneConf.raw.version;
                packageInfo.description = adoneConf.raw.description || "";
            }

            result.push(packageInfo);
        }

        if (keyword.length === 0) {
            return result;
        }

        return (new text.Fuzzy(result, {
            keys: ["name"],
            threshold
        })).search(keyword);
    }

    async snapshot(options) {

    }

    _package(options) {
        return new __.Package(this, options);
    }

    // listFiles({ adone = true, extensions = true, apps = true, configs = true, data = true, logs = true } = {}) {
    //     const srcPaths = [];
    //     if (configs) {
    //         srcPaths.push(std.path.join(adone.realm.config.configsPath, "**/*"));
    //     }

    //     if (adone) {

    //     }
    // }

    async lock() {
        // Force create runtime directory.
        await adone.realm.createDirs();
        return locking.create(adone.realm.config.lockFilePath);
    }

    async unlock() {
        if (await locking.check(adone.realm.config.lockFilePath)) {
            return locking.release(adone.realm.config.lockFilePath);
        }
    }

    setSilent(silent) {
        this.silent = silent;
    }

    _createProgress({ schema = " :spinner" } = {}) {
        if (!this.silent) {
            this.bar = adone.runtime.term.progress({
                schema
            });
            this.bar.update(0);
        }
    }

    _updateProgress({ schema, result = null } = {}) {
        if (!is.null(this.bar) && !this.silent) {
            this.bar.setSchema(schema);
            is.boolean(result) && this.bar.complete(result);
        }
    }
}
