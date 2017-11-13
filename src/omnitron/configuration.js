const {
    is,
    std
} = adone;

export const CONFIG_NAME = "omnitron.json";

export default class Configuration extends adone.configuration.Generic {
    constructor(options) {
        super(options);

        this.raw = {
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
            gates: [
                {
                    port: (is.windows ? `\\\\.\\pipe\\${adone.realm.config.realm}\\omnitron.sock` : std.path.join(adone.realm.config.runtimePath, "omnitron.sock"))
                }
            ]
        };
    }

    load() {
        return super.load(CONFIG_NAME);
    }

    save() {
        return super.save(CONFIG_NAME, null, {
            space: "    "
        });
    }

    static async load() {
        const config = new adone.omnitron.Configuration({
            cwd: adone.realm.config.configsPath
        });

        if (await adone.fs.exists(adone.std.path.join(adone.realm.config.configsPath, CONFIG_NAME))) {
            // assign config from home
            await config.load();
        } else {
            await config.save();
        }
    
        return config;
    }    

    static get name() {
        return CONFIG_NAME;
    }
}
