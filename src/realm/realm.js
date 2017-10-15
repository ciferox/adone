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
    }

    async _initialize() {
        // Obtain realm id
        this.id = adone.math.hash("sha256", `${await util.machineId(true)}${adone.config.environment}`);

        await this._loadConfig();

        // Create lockfile
        await adone.fs.writeFile(LOCK_FILE, "");
    }

    async install(options) {
        try {
            await this._lock();
            const pkg = new __.Package(this, options);
            await pkg.install();
        } finally {
            await this._unlock();
        }
    }

    async uninstall(options) {
        try {
            await this._lock();
            const pkg = new __.Package(this, options);
            await pkg.uninstall();
        } finally {
            await this._unlock();
        }
    }

    async snapshot(options) {

    }

    // listFiles({ adone = true, extensions = true, apps = true, configs = true, data = true, logs = true } = {}) {
    //     const srcPaths = [];
    //     if (configs) {
    //         srcPaths.push(std.path.join(adone.config.configsPath, "**/*"));
    //     }

    //     if (adone) {

    //     }
    // }

    async _loadConfig() {
        const configPath = std.path.join(adone.config.configsPath, CONFIG_NAME);
        if (await fs.exists(configPath)) {
            this.config = await configuration.load(CONFIG_NAME, null, {
                cwd: adone.config.configsPath
            });
        } else {
            this.config = new configuration.FileConfiguration();
        }
    }

    _lock() {
        return locking.create(LOCK_FILE);
    }

    _unlock() {
        return locking.release(LOCK_FILE);
    }
}
