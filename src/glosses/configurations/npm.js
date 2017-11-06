const {
    std
} = adone;

const CONFIG_NAME = "package.json";

export default class NpmConfiguration extends adone.configuration.Generic {
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
        const config = new NpmConfiguration({
            cwd
        });
        await config.load();
        return config;
    }

    static get name() {
        return CONFIG_NAME;
    }
}
