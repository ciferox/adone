const {
    is,
    std
} = adone;

export default class Configuration extends adone.configuration.FileConfiguration {
    constructor(options) {
        super(options);

        this.raw = {
            gates: [
                {
                    port: (is.windows ? "\\\\.\\pipe\\omnitron.sock" : std.path.join(adone.realm.config.runtimePath, "omnitron.sock"))
                }
            ]
        };
    }

    load() {
        return super.load(adone.omnitron.CONFIG_NAME);
    }

    save() {
        return super.save(adone.omnitron.CONFIG_NAME, null, {
            space: "    "
        });
    }
}
