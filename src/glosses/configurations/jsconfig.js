const CONFIG_NAME = "jsconfig.json";

export default class Jsconfig extends adone.configuration.Generic {
    getName() {
        return CONFIG_NAME;
    }

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
}
