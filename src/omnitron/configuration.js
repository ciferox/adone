const {
    x,
    is,
    std,
    configuration
} = adone;

export default class Configuration extends configuration.FileConfiguration {
    constructor({ inMemory = false } = {}) {
        super({
            cwd: adone.config.configsPath
        });
        this.inMemory = inMemory;

        this.raw.gates = null;
    }

    async loadAll() {
        await this.loadGates();

        return this;
    }

    async loadGates() {
        if (is.null(this.raw.gates)) {
            try {
                await this.load("gates.json", "gates");
            } catch (err) {
                if (err instanceof x.NotExists) {
                    this.raw.gates = [
                        {
                            port: (is.windows ? "\\\\.\\pipe\\omnitron.sock" : std.path.join(adone.config.runtimePath, "omnitron.sock"))
                        }
                    ];
                    await this.save("gates.json", true, {
                        space: "    "
                    });
                } else {
                    adone.error(err);
                }
            }
        }
        return this.raw.gates;
    }

    async save(confPath, name, options) {
        if (this.inMemory) {
            return;
        }
        try {
            await super.save(confPath, name, options);
            adone.info(`Configuration '${confPath}' saved`);
        } catch (err) {
            adone.error(err);
        }
    }

    static async load() {
        const config = new Configuration();
        await config.loadAll();
        return config;
    }
}
