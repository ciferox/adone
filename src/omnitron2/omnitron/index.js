import "adone";

const {
    application,
    is,
    std,
    fs,
    netron2: { DContext, DPublic },
    runtime
} = adone;

const previousUsage = process.cpuUsage();

const CORE_GROUP = "core";

@DContext({
    description: "Omnitron"
})
export default class Omnitron extends application.Application {
    async configure() {
        this.enableReport({
            directory: adone.runtime.config.omnitron.LOGS_PATH
        });

        this.config = await adone.omnitron2.Configuration.load({
            cwd: adone.runtime.config.CONFIGS_PATH
        });

        await this.addSubsystemsFrom(std.path.join(__dirname, "subsystems"), {
            bind: true,
            useFilename: true,
            group: CORE_GROUP
        });

        if (!is.windows) {
            this.exitOnSignal("SIGQUIT", "SIGTERM", "SIGINT");
            process.on("SIGILL", () => {
                if (is.function(global.gc)) {
                    global.gc();
                    adone.logInfo("Forced garbage collector");
                }
            });
        }
    }

    async initialize() {
        await this.initializeSubsystems();
        await this.createPidFile();
    }

    async main() {
        if (is.function(process.send)) {
            process.send({
                pid: process.pid
            });
        }

        adone.logInfo(`Omnitron v${adone.package.version} started`);
    }

    async uninitialize() {
        await this.deletePidFile();

        // Unitialize services in omnitron group
        // ...

        await this.uninitializeSubsystems({
            ignoreErrors: true
        });

        adone.logInfo("Omnitron stopped");
    }

    async createPidFile() {
        try {
            await fs.writeFile(adone.runtime.config.omnitron.PIDFILE_PATH, process.pid.toString());
        } catch (err) {
            adone.logError(err.message);
        }
    }

    async deletePidFile() {
        try {
            await fs.rm(adone.runtime.config.omnitron.PIDFILE_PATH);
        } catch (err) {
            adone.logError(err.message);
        }
    }

    _signalExit(sigName) {
        if (is.string(sigName)) {
            adone.logInfo(`Killed by signal '${sigName}'`);
        } else {
            adone.logInfo("Killed using api");
        }
        return super._signalExit(sigName);
    }

    // Omnitron interface

    @DPublic({
        description: "Force garbage collector"
    })
    gc() {
        if (is.function(global.gc)) {
            global.gc();
            return "done";
        }
        return "none";
    }

    @DPublic({
        description: "Kill omnitron"
    })
    kill() {
        process.nextTick(() => {
            this._signalExit();
        });
    }

    @DPublic({
        description: "Returns information about omnitron",
        type: Object
    })
    async getInfo({ process: proc = false, version = false, realm = false, env = false, netron = false } = {}) {
        const result = {};

        if (!proc && !version && !realm && !env && !netron) {
            proc = true;
            version = true;
            realm = true;
            env = true;
            netron = true;
        }

        if (proc) {
            const cpuUsage = process.cpuUsage(previousUsage);
            cpuUsage.user = cpuUsage.user / 1000;
            cpuUsage.system = cpuUsage.system / 1000;

            const totalMemory = adone.std.os.totalmem();
            const memoryUsage = process.memoryUsage();

            result.process = {
                id: process.pid,
                uptime: adone.pretty.time(1000 * Math.floor(process.uptime())),
                cpu: {
                    user: adone.pretty.time(cpuUsage.user),
                    system: adone.pretty.time(cpuUsage.system)
                },
                memory: {
                    total: adone.pretty.size(totalMemory),
                    used: `${adone.pretty.size(memoryUsage.rss)} (${(memoryUsage.rss / totalMemory * 100).toFixed(0)}%)`,
                    detail: {
                        total: totalMemory,
                        ...memoryUsage
                    }
                }
            };
        }

        if (version) {
            result.version = {
                adone: adone.package.version,
                ...process.versions
            };
        }

        if (realm) {
            result.realm = {
                id: adone.runtime.realm.identity.id,
                config: adone.util.omit(adone.runtime.config, "identity")
            };
        }

        if (env) {
            result.env = Object.assign({}, process.env);
        }

        if (netron) {
            result.netron = adone.util.omit(adone.runtime.netron2.options, (key, val) => is.function(val));
        }

        return result;
    }

    @DPublic({
        description: "Updates omnitron's environment variables"
    })
    setEnvs(envs) {
        for (const [key, val] of Object.entries(envs)) {
            process.env[key] = val;
        }
    }

    @DPublic({
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

    @DPublic({
        description: "Register new service"
    })
    registerService(name) {
        return this.db.registerService(name);
    }

    @DPublic({
        description: "Register existing service"
    })
    unregisterService(name) {
        return this.db.unregisterService(name);
    }

    @DPublic({
        description: "Return list of services",
        type: Array
    })
    enumerate(filter) {
        return this.services.enumerate(filter);
    }

    @DPublic({
        description: "Return object of grouped services",
        type: Array
    })
    enumerateByGroup(group) {
        return this.services.enumerateByGroup(group);
    }

    @DPublic({
        description: "Return list of groups",
        type: Array
    })
    enumerateGroups() {
        return this.services.enumerateGroups();
    }

    @DPublic({})
    getMaintainer(group) {
        return this.services.getMaintainer(group, true);
    }

    @DPublic({
        description: "Enables service"
    })
    enableService(name, options) {
        return this.services.enableService(name, options);
    }

    @DPublic({
        description: "Disables service"
    })
    disableService(name, options) {
        return this.services.disableService(name, options);
    }

    @DPublic({
        description: "Starts service"
    })
    startService(name) {
        return this.services.startService(name);
    }

    @DPublic({
        description: "Stops service"
    })
    stopService(name) {
        return this.services.stopService(name);
    }

    @DPublic({
        description: "Configures service"
    })
    configureService(name, options) {
        return this.services.configureService(name, options);
    }

    @DPublic({
        description: "Returns valuable used as service configuration store"
    })
    async getServiceConfiguration(name) {
        await this.services.checkService(name);
        return this.db.getServiceConfiguration(name);
    }

    @DPublic({
        description: "Restarts service"
    })
    async restart(serviceName) {
        await this.stop(serviceName);
        return this.start(serviceName);
    }

    @DPublic({
        description: "Reports about omnitron process"
    })
    getReport() {
        return adone.application.report.getReport();
    }

    @DPublic({
        description: "Returns list of attached contexts"
    })
    getContexts() {
        const result = [];

        for (const [name, stub] of runtime.netron2.contexts.entries()) {
            result.push({
                name,
                description: stub.definition.description
            });
        }

        return result;
    }

    // Subsystems
    @DPublic()
    getSubsystems() {
        return super.getSubsystems().map((ss) => ({
            name: ss.name,
            group: ss.group,
            description: ss.description,
            path: ss.path
        }));
    }

    @DPublic()
    async loadSubsystem(path, options) {
        await super.loadSubsystem(path, options);
    }

    @DPublic()
    async unloadSubsystem(name) {
        const sysInfo = this.getSubsystemInfo(name);
        if (sysInfo.group === CORE_GROUP) {
            throw new adone.error.NotAllowed("Unload core subsystem is not possible");
        }
        await super.unloadSubsystem(name);
    }

    // Configuration
    @DPublic()
    getConfiguration() {
        return this.db.getConfiguration();
    }

    // Gates
    @DPublic()
    addGate(gate) {
        return this.gates.addGate(gate);
    }

    @DPublic()
    deleteGate(gate) {
        return this.gates.deleteGate(gate);
    }

    @DPublic()
    upGate(name) {
        return this.gates.upGate(name);
    }

    @DPublic()
    downGate(name) {
        return this.gates.downGate(name);
    }

    @DPublic()
    getGates(options) {
        return this.gates.getGates(options);
    }

    @DPublic()
    configureGate(name, options) {
        return this.gates.configureGate(name, options);
    }
}

if (require.main === module) {
    if (!is.function(process.send)) {
        console.log(adone.terminal.chalk.red("Omnitron cannot be launched directly"));
        process.exit(application.EXIT_ERROR);
    }
    // Declare omnitron environment
    adone.runtime.isOmnitron = true;
    application.run(Omnitron);
}
