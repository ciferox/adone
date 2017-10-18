import "adone";

const {
    application,
    is,
    std,
    fs,
    netron: { Context, Public },
    omnitron,
    runtime
} = adone;

const {
    STATUSES
} = omnitron;

@Context({
    description: "Omnitron"
})
export default class Omnitron extends application.Application {
    async configure() {
        // Force create home and runtime directories
        await fs.mkdirp(adone.config.runtimePath);

        // Load omnitron configuration
        this.config = await omnitron.Configuration.load();

        // Add managers as subsystems
        await this.addSubsystemsFrom(std.path.join(__dirname, "managers"), {
            useFilename: true,
            group: "manager"
        });

        this.exitOnSignal("SIGQUIT", "SIGTERM", "SIGINT");
        process.on("SIGILL", () => {
            if (is.function(global.gc)) {
                global.gc();
                adone.info("Forced garbage collector");
            }
        });
    }

    async initialize() {
        await this.createPidFile();
    }

    async main() {
        if (is.function(process.send)) {
            process.send({ pid: process.pid });
        }

        adone.info(`Omnitron v${adone.package.version} started`);

        // Attach common omnitron context
        runtime.netron.attachContext(this, "omnitron");
    }

    async uninitialize() {
        try {
            await this.uninitializeSubsystems();
        } catch (err) {
            adone.error(err);
        }

        return this.deletePidFile();
    }

    async createPidFile() {
        try {
            await fs.writeFile(adone.config.omnitron.pidFilePath, process.pid);
        } catch (err) {
            adone.error(err.message);
        }
    }

    async deletePidFile() {
        try {
            await fs.rm(adone.config.omnitron.pidFilePath);
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

    @Public({
        description: "Force garbage collector"
    })
    gc() {
        return is.function(global.gc) && global.gc();
    }

    @Public({
        description: "Kill omnitron"
    })
    killSelf() {
        this._signalExit();
    }

    @Public({
        description: "Returns information about omnitron",
        type: Object
    })
    async getInfo({ version = true, realm = true, uptime = true, envs = true } = {}) {
        const result = {};
        if (version) {
            result.version = adone.package.version;
        }

        if (realm) {
            result.realm = {
                uid: (await adone.realm.getInstance()).id,
                name: adone.config.realm
            };
        }

        if (uptime) {
            result.uptime = Math.floor(process.uptime());
        }

        if (envs) {
            result.envs = Object.assign({}, process.env);
        }

        return result;
    }

    @Public({
        description: "Updates omnitron's environment variables"
    })
    setEnvs(envs) {
        for (const [key, val] of Object.entries(envs)) {
            process.env[key] = val;
        }
    }

    @Public({
        description: "Updates omnitron's environment variables"
    })
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

    @Public({
        description: "Returns list of all gates",
        type: Array
    })
    gates() {
        return this.config.gates;
    }

    @Public({
        description: "Return list of all services services",
        type: Array
    })
    async list({ status = "all" } = {}) {
        if (!STATUSES.includes(status)) {
            throw new adone.x.NotValid(`Not valid status: ${status}`);
        }

        const services = await this.subsystem("service").enumerate();
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
        console.log(`${adone.terminal.esc.red.open}Omnitron cannot be launched directly${adone.terminal.esc.red.close}`);
        process.exit(application.EXIT_ERROR);
    }
    application.run(Omnitron);
}
