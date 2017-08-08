const {
    is,
    std,
    omnitron: { const: { ENABLED } }
} = adone;

export default class Configuration {
    constructor(app, { inMemory = false } = {}) {
        this.app = app;
        this.inMemory = inMemory;
        this.services = null;
        this.gates = null;
    }

    async load() {
        // Force create home directory
        await adone.fs.mkdir(this.app.config.adone.home);

        if (!is.exist(this.app.config.omnitron)) {
            await this.app.loadConfig("omnitron", { ext: "js", defaults: true });
            // Subconfiguration for services...
            this.services = this.app.config.omnitron.services = {};

            // !!!!!!!!!!!!THIS SHOULD BE REIMPLEMENTED IN A GENERIC WAY!!!!!!!!!!!!!!
            // // Load configurations of core services.
            // const coreServicesPath = std.path.resolve(__dirname, "services");
            // if (await adone.fs.exists(coreServicesPath)) {
            //     await adone.fs.glob(`${coreServicesPath}/*/meta.json`).map(async (configPath) => {
            //         const servicePath = std.path.dirname(configPath);
            //         const serviceName = std.path.basename(servicePath);
            //         await this.app.config.load(configPath, `omnitron.services.${serviceName}`);
            //         const config = this.app.config.omnitron.services[serviceName];
            //         delete config.name;
            //         config.path = servicePath;
            //     });
            // }

            // Merge with user-defined configuration.
            try {
                await this.app.loadConfig("services", { path: "omnitron.services", userConfig: true });
            } catch (err) {
                if (!(err instanceof adone.x.NotFound)) {
                    adone.error(err);
                }
            }

            this.app.config.omnitron.services.omnitron = {
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
                    this.app.config.omnitron.gates = [
                        {
                            port: (is.windows ? "\\\\.\\pipe\\omnitron.sock" : std.path.join(this.app.config.adone.home, "omnitron.sock"))
                        }
                    ];
                    await this._saveConfig("gates");
                } else {
                    adone.error(err);
                }
            }
            this.gates = this.app.config.omnitron.gates;
        }
        return this;
    }

    saveServicesConfig() {
        return this._saveConfig("services");
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
