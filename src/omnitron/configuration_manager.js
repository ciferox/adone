const { is, std } = adone;
const { ENABLED } = adone.omnitron.const;

export default class ConfigurationManager {
    constructor(app, { inMemory = false } = {}) {
        this.app = app;
        this.inMemory = inMemory;
    }

    async loadBaseConfigs() {
        this.config = this.app.config;

        if (is.undefined(this.config.omnitron)) {
            await this.app.loadStdConfig("omnitron");
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
                await this.config.load(this.config.omnitron.servicesConfigFilePath, "omnitron.services");
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
                await this.config.load(this.config.omnitron.gatesConfigFilePath, "omnitron.gates");
            } catch (err) {
                if (err instanceof adone.x.NotFound) {
                    this.config.omnitron.gates = [
                        {
                            id: "local",
                            type: "socket",
                            status: ENABLED,
                            port: (process.platform === "win32" ? "\\\\.\\pipe\\omnitron.sock" : adone.std.path.join(this.config.adone.home, "omnitron.sock"))
                        }
                    ];
                } else {
                    adone.error(err);
                }
            }
        }
        return this.config.omnitron;
    }

    saveServicesConfig() {
        return this.saveBaseConfig("services", this.config.omnitron.servicesConfigFilePath);
    }

    saveGatesConfig() {
        return this.saveBaseConfig("gates", this.config.omnitron.gatesConfigFilePath);
    }

    async saveBaseConfig(name, path) {
        if (this.inMemory) {
            return;
        }
        try {
            await this.config.save(path, `omnitron.${name}`, { space: 4 });
            adone.info(`Configuration '${path}' saved`);
        } catch (err) {
            adone.error(err);
        }
    }
}
