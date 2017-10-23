const {
    application: { locking },
    configuration,
    x,
    is,
    fs,
    std,
    fast,
    text,
    util
} = adone;

const __ = adone.private(adone.realm);

const CONFIG_NAME = "realm.json";

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
                throw new adone.x.InvalidArgument("To specify package use object and property 'name'");
            }
            await this.lock();
            pkg = this._package(options);
            return pkg.install();
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
            // eslint-disable-next-line
            const adoneConf = await adone.project.Configuration.load({
                cwd: std.path.join(adone.realm.config.packagesPath, name)
            });

            result.push({
                name,
                version: adoneConf.raw.version,
                description: adoneConf.raw.description || ""
            });
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

    lock() {
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
