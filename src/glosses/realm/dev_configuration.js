const {
    is,
    std
} = adone;

export default class DevConfiguration extends adone.configuration.Generic {
    /**
     * Returns absolute path of configuration.
     */
    getPath() {
        return std.path.join(this.getCwd(), DevConfiguration.configName);
    }

    /**
     * Loads configuration.
     */
    async load() {
        await super.load(DevConfiguration.configName);
        this.#validate();
    }

    loadSync() {
        super.loadSync(DevConfiguration.configName);
        this.#validate();
    }

    #validate() {
        if (!is.string(this.raw.superRealm)) {
            throw new adone.error.NotValidException("Dev config is not valid: 'superRealm' property not found");
        }
    }

    /**
     * Saves configuration.
     * 
     * @param {*} cwd path where config should be saved
     */
    async save({ cwd = this.getCwd() } = {}) {
        return super.save(is.string(cwd) ? std.path.join(cwd, DevConfiguration.configName) : DevConfiguration.configName, null, {
            space: "    "
        });
    }

    static async load({ cwd } = {}) {
        const config = new DevConfiguration({
            cwd
        });
        await config.load();
        return config;
    }

    static loadSync({ cwd } = {}) {
        const config = new DevConfiguration({
            cwd
        });
        config.loadSync();
        return config;
    }

    static configName = std.path.join(".adone", "dev.json");

    static default = {};
}
