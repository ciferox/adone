let home;
const dirName = ".adone_test";

if (process.platform === "win32") {
    home = adone.std.path.resolve(process.env.USERPROFILE, dirName);
} else {
    if (process.env.HOME && !process.env.HOMEPATH) {
        home = adone.std.path.resolve(process.env.HOME, dirName);
    } else if (process.env.HOME || process.env.HOMEPATH) {
        home = adone.std.path.resolve(process.env.HOMEDRIVE, process.env.HOME || process.env.HOMEPATH, dirName);
    } else {
        home = adone.std.path.resolve("/etc", dirName);
    }
}
// Update ADONE_HOME
process.env.ADONE_HOME = home;
process.env.ADONE_ENV = "test";
process.env.ADONE_DIRNAME = dirName;

export class WeakOmnitron extends adone.omnitron.Omnitron.Omnitron {
    constructor(options) {
        super(options);
        this._.configurator = new adone.omnitron.Configurator(this, { inMemory: true });
    }

    async initialize() {
        this.config.omnitron = {
            servicesPath: adone.std.path.join(process.env.ADONE_HOME, "services"),
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
            },
            getServicePath(serviceName, dirName) {
                let fullPath;
                if (typeof dirName === "string") {
                    fullPath = adone.std.path.join(this.servicesPath, serviceName, dirName);
                } else {
                    fullPath = adone.std.path.join(this.servicesPath, serviceName);
                }

                return adone.fs.mkdir(fullPath).then(() => fullPath);
            }
        };
        // await this.createPidFile();

        // await adone.fs.mkdir(this.config.omnitron.servicesPath);

        this.createNetron({ isSuper: true });
        await this.bindNetron();
        await this.attachServices();

        // await this._.configurator.saveServicesConfig();
        // await this._.configurator.saveGatesConfig();
    }

    async uninitialize() {
        await this.detachServices();

        // await this._.configurator.saveServicesConfig();

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

export default class OmnitronRunner extends adone.application.Application {
    run() {
        return adone.fs.rm(process.env.ADONE_HOME).then(() => {
            return super.run({ ignoreArgs: true });
        });
    }

    createDispatcher({ omnitron = null } = {}) {
        const options = {
            noisily: false
        };
        if (!adone.is.null(omnitron)) {
            this.omnitron = omnitron;
            options.omnitron = omnitron;
            options.configurator = this.omnitron._.configurator;
        }
        return this.dispatcher = new adone.omnitron.Dispatcher(this, options);
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
