const CONFIG_NAME = "package.json";

export default class Npm extends adone.configuration.Generic {
    async load() {
        return super.load(CONFIG_NAME, null);
    }

    async save() {
        return super.save(CONFIG_NAME, null, {
            space: "  "
        });
    }
}
