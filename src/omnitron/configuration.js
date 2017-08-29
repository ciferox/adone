const {
    x,
    is,
    std,
    fs,
    configuration,
    omnitron: { const: { ENABLED, DISABLED } },
    vault
} = adone;

export default class Configuration extends configuration.FileConfiguration {
    constructor({ inMemory = false } = {}) {
        super({
            base: adone.config.configsPath
        });
        this.inMemory = inMemory;

        this.gates = null;
        this.meta = null;
        this.servicesDb = new vault.Vault({
            location: std.path.join(adone.config.varPath, "omnitron", "services.db")
        });
    }

    async loadAll() {
        await this.loadGates();

        await fs.mkdir(std.path.dirname(this.servicesDb.options.location));
        await this.servicesDb.open();
        if (!this.servicesDb.has("$meta")) {
            this.meta = await this.servicesDb.create("$meta");
        } else {
            this.meta = await this.servicesDb.get("$meta");
        }

        await this.loadServices();

        return this;
    }

    async loadGates() {
        if (is.null(this.gates)) {
            try {
                await this.load("gates.json", "gates");
            } catch (err) {
                if (err instanceof x.NotExists) {
                    this.gates = [
                        {
                            port: (is.windows ? "\\\\.\\pipe\\omnitron.sock" : std.path.join(adone.homePath, "omnitron.sock"))
                        }
                    ];
                    await this.save("gates.json", true);
                } else {
                    adone.error(err);
                }
            }
        }
        return this.gates;
    }

    async loadServices() {
        const names = [];

        // Normalize statuses
        if (await fs.exists(adone.config.omnitron.servicesPath)) {
            await fs.glob("*/adone.conf.js", {
                cwd: adone.config.omnitron.servicesPath
            }).map(async (adoneConf) => {
                names.push(adoneConf.name);
                if (this.meta.has(adoneConf.name)) {
                    const serviceMeta = await this.meta.get(adoneConf.name);
                    if (serviceMeta.status !== DISABLED) {
                        serviceMeta.status = ENABLED;
                        await serviceMeta.set("status", serviceMeta);
                    }
                } else {
                    await this.meta.set(adoneConf.name, {
                        status: DISABLED
                    });
                }
            });
        }

        // Remove uninstalled services
        for (const key of this.meta.keys()) {
            if (!names.includes(key)) {
                await this.meta.delete(key); // eslint-disable-line
            }
        }
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
}
