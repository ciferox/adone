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
const LOCK_FILE = std.path.join(adone.config.runtimePath, "realm");

export default class Realm {
    constructor() {
        this.id = null;
        this.config = null;
        this.bar = null;
        this.silent = false;
    }

    async _initialize() {
        // Obtain realm id
        this.id = adone.math.hash("sha256", `${await util.machineId(true)}${adone.config.realm}`);

        // Load config
        const configPath = std.path.join(adone.config.configsPath, CONFIG_NAME);
        if (await fs.exists(configPath)) {
            this.config = await configuration.load(CONFIG_NAME, null, {
                cwd: adone.config.configsPath
            });
        } else {
            this.config = new configuration.FileConfiguration();
        }

        // Create lockfile
        await fs.mkdirp(adone.config.runtimePath);
        await adone.fs.writeFile(LOCK_FILE, "");
    }

    async install(options) {
        try {
            if (!is.plainObject(options) || !is.string(options.name)) {
                throw new adone.x.InvalidArgument("To specify package use object and property 'name'");
            }
            await this.lock();
            await this._package(options).install();
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
        const packages = await fs.readdir(adone.config.packagesPath);

        const result = [];
        for (const name of packages) {
            // eslint-disable-next-line
            const adoneConf = await adone.project.Configuration.load({
                cwd: std.path.join(adone.config.packagesPath, name)
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
    //         srcPaths.push(std.path.join(adone.config.configsPath, "**/*"));
    //     }

    //     if (adone) {

    //     }
    // }

    lock() {
        return locking.create(LOCK_FILE);
    }

    async unlock() {
        if (await locking.check(LOCK_FILE)) {
            return locking.release(LOCK_FILE);
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
