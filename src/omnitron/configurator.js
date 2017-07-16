const { is, std } = adone;
const { ENABLED } = adone.omnitron.const;

export default class Configurator {
    constructor(app, { inMemory = false } = {}) {
        this.app = app;
        this.inMemory = inMemory;
        this._gateManager = null;
    }

    get omnitron() {
        return this.config.omnitron;
    }

    get gates() {
        if (is.null(this._gateManager)) {
            this._gateManager = new adone.omnitron.GateManager(this.config.omnitron.gates);
        }
        return this._gateManager;
    }

    async loadAll() {
        this.config = this.app.config;

        if (is.undefined(this.config.omnitron)) {
            await this.app.loadConfig("omnitron", { ext: "js", defaults: true, userConfig: true });
            // Subconfiguration for services...
            this.config.omnitron.services = {};

            // Load configurations of core services.
            const coreServicesPath = std.path.resolve(__dirname, "services");
            if (await adone.fs.exists(coreServicesPath)) {
                await adone.fs.glob(`${coreServicesPath}/*/meta.json`).map(async (configPath) => {
                    const servicePath = std.path.dirname(configPath);
                    const serviceName = std.path.basename(servicePath);
                    await this.config.load(configPath, `omnitron.services.${serviceName}`);
                    const config = this.config.omnitron.services[serviceName];
                    delete config.name;
                    config.path = servicePath;
                });
            }

            // Merge with user-defined configuration.
            try {
                await this.app.loadConfig("services", { path: "omnitron.services", userConfig: true });
            } catch (err) {
                if (!(err instanceof adone.x.NotFound)) {
                    adone.error(err);
                }
            }

            this.config.omnitron.services.omnitron = {
                description: "Omnitron service",
                path: __dirname,
                status: ENABLED,
                contexts: [
                    {
                        id: "omnitron",
                        class: "Omnitron",
                        default: true
                    }
                ]
            };
            // Load configuration of gates.
            try {
                await this.app.loadConfig("gates", { path: "omnitron.gates", userConfig: true });
            } catch (err) {
                if (err instanceof adone.x.NotFound) {
                    this.config.omnitron.gates = [
                        {
                            id: "local",
                            type: "socket",
                            status: ENABLED,
                            port: (is.windows ? "\\\\.\\pipe\\omnitron.sock" : adone.std.path.join(this.config.adone.home, "omnitron.sock"))
                        }
                    ];
                } else {
                    adone.error(err);
                }
            }
        }
        return this;
    }

    saveServicesConfig() {
        return this._saveConfig("services");
    }

    saveGatesConfig() {
        return this._saveConfig("gates");
    }

    async _saveConfig(name) {
        if (this.inMemory) {
            return;
        }
        try {
            await this.app.saveConfig(name, { path: `omnitron.${name}` });
            adone.info(`Configuration '${name}' saved`);
        } catch (err) {
            adone.error(err);
        }
    }
}
