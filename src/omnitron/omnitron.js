import "adone";

const {
    application,
    is,
    std,
    fs,
    netron: { decorator: { Contextable, Public, Private, Description, Type } },
    omnitron
} = adone;

const {
    const: { DISABLED, ENABLED, ACTIVE, STATUSES }
} = omnitron;

@Private
@Contextable
@Description("Common omnitron context")
export default class Omnitron extends application.Application {
    async configure() {
        // Force create home directory
        await fs.mkdir(adone.homePath);

        this.logsPath = std.path.join(adone.config.varPath, "logs", "omnitron");

        // Load omnitron configuration
        this.config = new omnitron.Configuration();
        await this.config.loadAll();

        await this.addSubsystemsFrom(std.path.join(__dirname, "managers"), {
            useFilename: true,
            group: "manager"
        });
    }

    async initialize() {
        this.exitOnSignal("SIGQUIT", "SIGTERM", "SIGINT");
        process.on("SIGILL", () => {
            if (is.function(global.gc)) {
                global.gc();
                adone.info("Force garbage collector");
            }
        });

        await this.createPidFile();

        if (is.function(process.send)) {
            process.send({ pid: process.pid });
        }

        await this.initializeSubsystems();

        // Log information message and force load of package.json.
        adone.info(`Omnitron v${adone.package.version} initialized`);
    }

    async main() {
        // Attach common omnitron context
        this.subsystem("netron").netron.attachContext(this, "omnitron");

        await this.subsystem("services").startAll();
    }

    async uninitialize() {
        await this.subsystem("services").stopAll();

        return this.deletePidFile();
    }

    async createPidFile() {
        try {
            await fs.writeFile(adone.config.omnitron.pidFilePath, process.pid);
        } catch (err) {
            adone.error(err.message);
        }
    }

    deletePidFile() {
        try {
            return fs.rm(adone.config.omnitron.pidFilePath);
        } catch (err) {
            adone.error(err.message);
        }
    }

    _signalExit(sigName) {
        if (is.string(sigName)) {
            adone.info(`Killed by signal '${sigName}'`);
        } else {
            adone.info("Killed by netron");
        }
        return super._signalExit(sigName);
    }

    // Omnitron interface

    @Public
    @Description("Force garbage collector")
    gc() {
        return is.function(global.gc) && global.gc();
    }

    @Public
    @Description("Kill omnitron")
    killSelf() {
        this._signalExit();
    }

    @Public
    @Description("Uptime of omnitron")
    @Type(String)
    uptime() {
        return Math.floor(process.uptime());
    }

    @Public
    @Description("The environment under which the omnitron is running")
    @Type(String)
    environment() {
        return adone.config.environment;
    }

    @Public
    @Description("Omnitron's environment variables")
    @Type(Object)
    envs() {
        return Object.assign({}, process.env);
    }

    @Public
    @Description("Updates omnitron's environment variables")
    setEnvs(envs) {
        for (const [key, val] of Object.entries(envs)) {
            process.env[key] = val;
        }
    }

    @Public
    @Description("Updates omnitron's environment variables")
    updateEnvs(envs) {
        for (const [key, val] of Object.entries(envs)) {
            process.env[key] = val;
        }

        for (const key of Object.keys(process.env)) {
            if (!is.propertyDefined(envs, key)) {
                delete process.env[key];
            }
        }
    }

    @Public
    @Description("Version of omnitron")
    @Type(String)
    version() {
        return adone.package.version;
    }

    @Public
    @Description("Returns list of all gates")
    @Type(Array)
    gates() {
        return this.config.gates;
    }


    @Public
    @Description("Return list of all services services")
    @Type(Array)
    async list({ status = "all" } = {}) {
        if (!STATUSES.includes(status)) {
            throw new adone.x.NotValid(`Not valid status: ${status}`);
        }

        const services = await this.subsystem("services").enumerate();
        return services.filter((x) => x.status === status || status === "all");
    }

    // @Public
    // @Description("Service status")
    // @Type(String)
    // async status(serviceName) {
    //     let names;
    //     if (is.string(serviceName)) {
    //         if (serviceName === "") {
    //             names = Object.keys(this._.service);
    //         } else {
    //             names = [serviceName];
    //         }
    //     } else if (is.array(serviceName)) {
    //         if (serviceName.length === 0) {
    //             names = Object.keys(this._.service);
    //         } else {
    //             names = serviceName;
    //         }
    //     } else {
    //         throw new adone.x.InvalidArgument(`Invalid type of argument: ${typeof (serviceName)}`);
    //     }

    //     const result = [];
    //     for (const name of names) {
    //         if (is.propertyOwned(this._.service, name)) {
    //             result.push({
    //                 name,
    //                 status: this._.service[name].config.status
    //             });
    //         }
    //     }
    //     return result;
    // }

    // @Public
    // @Description("Enable service with specified name")
    // @Type()
    // async enable(serviceName, needEnabled, { enableDeps = false } = {}) {
    //     const service = this.getServiceByName(serviceName);
    //     if (needEnabled) {
    //         if (service.config.status === DISABLED) {
    //             await this._checkDependencies(service, (depName) => this.enable(depName, needEnabled, { enableDeps }), { checkDisabled: !enableDeps });
    //             service.config.status = ENABLED;
    //             return this._.configuration.saveServicesConfig();
    //         }
    //         throw new adone.x.IllegalState("Service is not disabled");

    //     } else {
    //         if (service.config.status !== DISABLED) {
    //             if (service.config.status === ACTIVE) {
    //                 await this.detachService(service);
    //             } else if (service.config.status !== ENABLED) {
    //                 throw new adone.x.IllegalState(`Cannot disable service with '${service.config.status}' status`);
    //             }
    //             service.config.status = DISABLED;
    //             return this._.configuration.saveServicesConfig();
    //         }
    //     }
    // }

    // @Public
    // @Description("Start service")
    // @Type()
    // start(serviceName) {
    //     const service = this.getServiceByName(serviceName);
    //     const status = service.config.status;
    //     if (status === DISABLED) {
    //         throw new adone.x.IllegalState("Service is disabled");
    //     } else if (status === ENABLED) {
    //         return this.attachService(serviceName, service.config);
    //     } else {
    //         throw new adone.x.IllegalState(`Illegal status of service: ${status}`);
    //     }
    // }

    // @Public
    // @Description("Stop service")
    // @Type()
    // stop(serviceName) {
    //     const service = this.getServiceByName(serviceName);
    //     const status = service.config.status;
    //     if (status === DISABLED) {
    //         throw new adone.x.IllegalState("Service is disabled");
    //     } else if (status === ACTIVE) {
    //         return this.detachService(service);
    //     } else {
    //         throw new adone.x.IllegalState(`Illegal status of service: ${status}`);
    //     }
    // }

    // @Public
    // @Description("Restart service")
    // @Type()
    // async restart(serviceName) {
    //     await this.stop(serviceName);
    //     return this.start(serviceName);
    // }
}

if (require.main === module) {
    if (!is.function(process.send)) {
        console.log(`${adone.terminal.styles.red.open}Omnitron cannot be launched directly${adone.terminal.styles.red.close}`);
        process.exit(application.Application.ERROR);
    }
    application.run(Omnitron);
}
