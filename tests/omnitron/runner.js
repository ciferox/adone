if (adone.is.nil(process.env.ADONE_HOME)) {
    let home = "";
    if (process.env.HOME && !process.env.HOMEPATH) {
        home = adone.std.path.resolve(process.env.HOME, ".adone_test");
    } else if (process.env.HOME || process.env.HOMEPATH) {
        home = adone.std.path.resolve(process.env.HOMEDRIVE, process.env.HOME || process.env.HOMEPATH, ".adone_test");
    } else {
        home = adone.std.path.resolve("/etc", ".adone_test");
    }
    process.env.ADONE_HOME = home;
}

export class WeakOmnitron extends adone.omnitron.Omnitron {
    constructor(options) {
        super(options);
        this._.configManager = new adone.omnitron.ConfigManager(this);
        // create
        this.config.omnitron = {
            gates: [
                {
                    id: "local",
                    type: "socket",
                    status: adone.omnitron.const.ENABLED,
                    port: adone.netron.DEFAULT_PORT
                }
            ],
            services: {
                omnitron: {
                    description: "Omnitron service",
                    path: __dirname,
                    status: adone.omnitron.const.ENABLED,
                    contexts: [
                        {
                            id: "omnitron",
                            class: "Omnitron",
                            default: true
                        }
                    ]
                }
            }
        };
    }

    async initialize() {
        // await this.createPidFile();

        // await adone.fs.mkdir(this.config.omnitron.servicesPath);

        this.createNetron({ isSuper: true });
        await this.bindNetron();
        await this.attachServices();

        // await this._.configManager.saveServicesConfig();
        // await this._.configManager.saveGatesConfig();
    }

    async uninitialize() {
        await this.detachServices();

        // await this._.configManager.saveServicesConfig();

        // Let netron gracefully complete all disconnects
        await adone.promise.delay(500);

        await this.unbindNetron();

        // return this.deletePidFile();
    }

    addServiceConfig(serviceName, conf) {
        this.config.omnitron.services[serviceName] = conf;
    }

    removeServiceConfig(serviceName) {
        delete this.config.omnitron.services[serviceName];
    }
}

export default class OmnitronRunner extends adone.Application {
    constructor({ omnitron = null }) {
        super();
        if (!adone.is.null(omnitron)) {
            this.omnitron = omnitron;
            this.configManager = omnitron._.configManager;
        } else {
            this.configManager = null;
        }
    }

    run() {
        return adone.fs.rm(process.env.ADONE_HOME).then(() => {
            return super.run({ ignoreArgs: true });
        });
    }

    initialize() {
        this.dispatcher = new adone.omnitron.Dispatcher(this, { noisily: false, omnitron: this.omnitron, configManager: this.configManager });
    }

    startOmnitron() {
        return this.dispatcher.start();
    }

    async stopOmnitron({ clean = true, killChildren = true } = {}) {
        return this.dispatcher.kill({ clean, killChildren });
    }

    async restartOmnitron({ options, forceStart = false, killChildren = false } = {}) {
        await this.stopOmnitron({ clean: false, killChildren });
        await this.startOmnitron();
        await this.connectOmnitron({ options, forceStart });
    }

    connectOmnitron({ options, forceStart = false } = {}) {
        return this.dispatcher.connectLocal(options, forceStart);
    }

    getInterface(name) {
        return this.dispatcher.getInterface(name);
    }
}
