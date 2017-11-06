const {
    std
} = adone;

const CONFIG_NAME = "jsconfig.json";

export default class JsconfigConfiguration extends adone.configuration.Generic {

    getPath() {
        return std.path.join(this.cwd, CONFIG_NAME);
    }

    async load() {
        return super.load(CONFIG_NAME, null);
    }

    async save() {
        return super.save(CONFIG_NAME, null, {
            space: "  "
        });
    }

    static async load({ cwd } = {}) {
        const config = new JsconfigConfiguration({
            cwd
        });
        await config.load();
        return config;
    }

    /**
     * Returns name of configuration file.
     */
    static get name() {
        return CONFIG_NAME;
    }
}
