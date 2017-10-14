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

const CONFIG_NAME = "realm.json";
const LOCK_FILE = std.path.join(adone.config.runtimePath, "realm");

export default class Realm {
    constructor() {
        this.config = null;
    }

    async initialize() {
        await this._loadConfig();
    }

    async install(options) {
        try {
            await this._lock();

        } catch (err) {
            adone.error(err);
        } finally {
            await this._unlock();
        }
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
