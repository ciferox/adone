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
        return is.plainObject(this.raw.gate[name]);
    }

    getGate(name) {
        if (!this.hasGate(name)) {
            throw new adone.x.NotExists(`Gate '${name}' is not exist`);
        }

        return this.raw.gate[name];
    }

    getLocalGate() {
        return this.getGate("local");
    }

    getGates(asArray = true) {
        if (asArray) {
            return Object.values(this.raw.gate);
        }
        return this.raw.gate;
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
        services: {
            startTimeout: 10000,
            stopTimeout: 10000
        },
        gate: {
            local: {
                port: (is.windows ? `\\\\.\\pipe\\${adone.realm.config.realm}\\omnitron.sock` : std.path.join(adone.realm.config.runtimePath, "omnitron.sock"))
            }
        }
    };
}
