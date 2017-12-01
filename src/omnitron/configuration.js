const {
    is,
    std
} = adone;

export const CONFIG_NAME = "omnitron.json";

export default class Configuration extends adone.configuration.Generic {
    load() {
        return super.load(CONFIG_NAME);
    }

    save() {
        return super.save(CONFIG_NAME, null, {
            space: "    "
        });
    }

    hasGate(name) {
        return this.raw.gates.findIndex((g) => g.name === name) >= 0;
    }

    getGate(name) {
        const index = this.raw.gates.findIndex((g) => g.name === name);
        if (index < 0) {
            throw new adone.x.NotExists(`Gate with name '${name}' is not exist`);
        }

        return this.raw.gates[index];
    }

    getLocalGate() {
        return this.getGate("local");
    }

    getGates(status) {
        // At least one local gate should be exist.

        if (is.string(status)) {
            // Local gate always is enabled.
            return this.raw.gates.filter((g) => g.status === status || g.name === "local");
        }
        return this.raw.gates;
    }

    addGate(gate) {
        if (!is.string(gate.name)) {
            throw new adone.x.NotValid("'name' property is not a string");
        }

        if (this.hasGate(gate.name)) {
            throw new adone.x.Exists(`Gate with name '${gate.name}' is already exist`);
        }

        this.raw.gates.push(gate);

        return this.save();
    }

    deleteGate(name) {
        const index = this.raw.gates.findIndex((g) => g.name === name);
        if (index < 0) {
            throw new adone.x.NotExists(`Gate with name '${name}' is not exist`);
        }

        this.raw.gates.splice(index, 1);
        return this.save();
    }

    disableGate(name) {
        const gate = this.getGate(name);
        gate.status = "off";
        return this.save();
    }

    enableGate(name) {
        const gate = this.getGate(name);
        gate.status = "on";
        return this.save();
    }

    static async load({ defaults = true } = {}) {
        const config = new adone.omnitron.Configuration({
            cwd: adone.realm.config.configsPath
        });

        if (await adone.fs.exists(Configuration.path)) {
            // assign config from home
            await config.load();
            if (defaults) {
                adone.vendor.lodash.defaults(config.raw, Configuration.default);
            }
        } else {
            if (defaults) {
                config.raw = Configuration.default;
            }
            await config.save();
        }

        return config;
    }

    static configName = CONFIG_NAME;
    static path = adone.std.path.join(adone.realm.config.configsPath, CONFIG_NAME);
    static default = {
        gc: false,
        netron: {
            responseTimeout: 30000,
            isSuper: true,
            connect: {
                retries: 3,
                minTimeout: 100,
                maxTimeout: 10000,
                factor: 2,
                randomize: false
            }
        },
        service: {
            startTimeout: 10000,
            stopTimeout: 10000
        },
        gates: [
            {
                name: "local",
                port: (is.windows ? `\\\\.\\pipe\\${adone.realm.config.realm}\\omnitron.sock` : std.path.join(adone.realm.config.runtimePath, "omnitron.sock"))
            }
        ]
    };
}
