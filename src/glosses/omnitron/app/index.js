import "adone";

const {
    app,
    configuration,
    is,
    // std,
    fs,
    netron: { Netron },
    util
} = adone;

// const {
//     logger
// } = runtime;

// const previousUsage = process.cpuUsage();

// const CORE_GROUP = "core";

// Configuration file may have arbitrary layout, but one required application parameter 'omnitron'
// should be used accross all applications.


export default
// @Context({
//     description: "Omnitron"
// })
class OmniApplication extends app.Application {
    async configure(options) {
        if (!is.undefined(process.report)) {
            Object.assign(process.report, util.pick(this.config.omnitron.report || {}, [
                "reportOnFatalError",
                "reportOnSignal",
                "reportOnUncaughtException",
                "signal",
                "filename",
                "directory"
            ]));
        }

        if (is.string(options.config)) {
            // Load app configuration from file.
            this.config = await configuration.load(options.config);
        } else {
            // Default configuration
            this.config = new configuration.GenericConfig();
            this.config.set("omnitron", {});
        }

        // The generic communication core of omni-application.
        this.netron = new Netron(this.config.omnitron.netron);

        // this._configureLogger();

        // await this.addSubsystemsFrom(std.path.join(__dirname, "subsystems"), {
        //     bind: true,
        //     useFilename: true,
        //     group: CORE_GROUP
        // });

        // if (!is.windows) {
        //     this.exitOnSignal("SIGQUIT", "SIGTERM", "SIGINT");
        //     process.on("SIGILL", () => {
        //         if (is.function(global.gc)) {
        //             global.gc();
        //             // logger.info("Forced garbage collector");
        //         }
        //     });
        // }
    }

    async initialize() {
        await this.initializeSubsystems();
        await this.createPidFile();
    }

    async main() {
        // if (is.function(process.send)) {
        //     process.send({
        //         pid: process.pid
        //     });
        // }

        // logger.info(`Omnitron v${adone.package.version} started`);
    }

    async uninitialize() {
        await this.deletePidFile();

        // Unitialize services in omnitron group
        // ...

        await this.uninitializeSubsystems({
            ignoreErrors: true
        });

        // logger.info("Omnitron stopped");
    }

    async createPidFile() {
        try {
            await fs.writeFile(this.config.omnitron.pidFile, process.pid.toString());
        } catch (err) {
            console.error(err.message);
        }
    }

    async deletePidFile() {
        try {
            await fs.rm(this.config.omnitron.pidFile);
        } catch (err) {
            console.error(err.message);
        }
    }

    // // _configureLogger() {
    // //     const {
    // //         app: { logger: { format } }
    // //     } = adone;

    // //     logger.configure({
    // //         level: "info",
    // //         format: format.printf((info) => {
    // //             return `${info.timestamp} [${info.level}] ${info.message}`;
    // //         }),
    // //         transports: [
    // //             new adone.app.logger.transport.Console()
    // //         ]
    // //     });
    // // }

    // _signalExit(sigName) {
    //     if (is.string(sigName)) {
    //         // logger.info(`Killed by signal '${sigName}'`);
    //     } else {
    //         // logger.info("Killed using api");
    //     }
    //     return super._signalExit(sigName);
    // }

    // // Omnitron interface

    // @Public({
    //     description: "Force garbage collector"
    // })
    // gc() {
    //     if (is.function(global.gc)) {
    //         global.gc();
    //         return "done";
    //     }
    //     return "none";
    // }

    // @Public({
    //     description: "Kill omnitron"
    // })
    // kill() {
    //     process.nextTick(() => {
    //         this._signalExit();
    //     });
    // }

    // @Public({
    //     description: "Returns information about omnitron",
    //     type: Object
    // })
    // async getInfo({ process: proc = false, version = false, realm = false, env = false, netron = false } = {}) {
    //     const result = {};

    //     if (!proc && !version && !realm && !env && !netron) {
    //         proc = true;
    //         version = true;
    //         realm = true;
    //         env = true;
    //         netron = true;
    //     }

    //     if (proc) {
    //         const cpuUsage = process.cpuUsage(previousUsage);
    //         cpuUsage.user = cpuUsage.user / 1000;
    //         cpuUsage.system = cpuUsage.system / 1000;

    //         const totalMemory = adone.std.os.totalmem();
    //         const memoryUsage = process.memoryUsage();

    //         result.process = {
    //             id: process.pid,
    //             uptime: adone.pretty.time(1000 * Math.floor(process.uptime())),
    //             cpu: {
    //                 user: adone.pretty.time(cpuUsage.user),
    //                 system: adone.pretty.time(cpuUsage.system)
    //             },
    //             memory: {
    //                 total: adone.pretty.size(totalMemory),
    //                 used: `${adone.pretty.size(memoryUsage.rss)} (${(memoryUsage.rss / totalMemory * 100).toFixed(0)}%)`,
    //                 detail: {
    //                     total: totalMemory,
    //                     ...memoryUsage
    //                 }
    //             }
    //         };
    //     }

    //     if (version) {
    //         result.version = {
    //             adone: adone.package.version,
    //             ...process.versions
    //         };
    //     }

    //     if (realm) {
    //         result.realm = {
    //             id: runtime.realm.identity.id,
    //             config: adone.util.omit(runtime.config, "identity")
    //         };
    //     }

    //     if (env) {
    //         result.env = Object.assign({}, process.env);
    //     }

    //     if (netron) {
    //         result.netron = adone.util.omit(runtime.netron.options, (key, val) => is.function(val));
    //     }

    //     return result;
    // }

    // @Public({
    //     description: "Updates omnitron's environment variables"
    // })
    // setEnvs(envs) {
    //     for (const [key, val] of Object.entries(envs)) {
    //         process.env[key] = val;
    //     }
    // }

    // @Public({
    //     description: "Updates omnitron's environment variables"
    // })
    // updateEnvs(envs) {
    //     for (const [key, val] of Object.entries(envs)) {
    //         process.env[key] = val;
    //     }

    //     for (const key of Object.keys(process.env)) {
    //         if (!is.propertyDefined(envs, key)) {
    //             delete process.env[key];
    //         }
    //     }
    // }

    // @Public({
    //     description: "Register new service"
    // })
    // async registerService(name) {
    //     const registry = await this.db.getConfiguration("registry");
    //     await registry.registerService(name);
    // }

    // @Public({
    //     description: "Register existing service"
    // })
    // async unregisterService(name) {
    //     const registry = await this.db.getConfiguration("registry");
    //     return registry.unregisterService(name);
    // }

    // @Public({
    //     description: "Return list of services",
    //     type: Array
    // })
    // enumerate(filter) {
    //     return this.services.enumerate(filter);
    // }

    // @Public({
    //     description: "Return object of grouped services",
    //     type: Array
    // })
    // enumerateByGroup(group) {
    //     return this.services.enumerateByGroup(group);
    // }

    // @Public({
    //     description: "Return list of groups",
    //     type: Array
    // })
    // enumerateGroups() {
    //     return this.services.enumerateGroups();
    // }

    // @Public({})
    // getMaintainer(group) {
    //     return this.services.getMaintainer(group, true);
    // }

    // @Public({
    //     description: "Enables service"
    // })
    // enableService(name, options) {
    //     return this.services.enableService(name, options);
    // }

    // @Public({
    //     description: "Disables service"
    // })
    // disableService(name, options) {
    //     return this.services.disableService(name, options);
    // }

    // @Public({
    //     description: "Starts service"
    // })
    // startService(name) {
    //     return this.services.startService(name);
    // }

    // @Public({
    //     description: "Stops service"
    // })
    // stopService(name) {
    //     return this.services.stopService(name);
    // }

    // @Public({
    //     description: "Configures service"
    // })
    // configureService(name, options) {
    //     return this.services.configureService(name, options);
    // }

    // @Public({
    //     description: "Returns valuable used as service configuration store"
    // })
    // async getServiceConfiguration(name) {
    //     return this.services.getServiceConfiguration(name);
    // }

    // @Public({
    //     description: "Restarts service"
    // })
    // async restart(serviceName) {
    //     await this.stop(serviceName);
    //     return this.start(serviceName);
    // }

    // @Public({
    //     description: "Reports about omnitron process"
    // })
    // getReport() {
    //     return adone.app.report.getReport();
    // }

    // @Public({
    //     description: "Returns list of attached contexts"
    // })
    // getContexts() {
    //     const result = [];

    //     for (const [name, stub] of runtime.netron.contexts.entries()) {
    //         result.push({
    //             name,
    //             description: stub.definition.description
    //         });
    //     }

    //     return result;
    // }

    // // Subsystems
    // @Public()
    // getSubsystems() {
    //     return super.getSubsystems().map((ss) => ({
    //         name: ss.name,
    //         group: ss.group,
    //         description: ss.description,
    //         path: ss.path
    //     }));
    // }

    // @Public()
    // async loadSubsystem(path, options) {
    //     await super.loadSubsystem(path, options);
    // }

    // @Public()
    // async unloadSubsystem(name) {
    //     const sysInfo = this.getSubsystemInfo(name);
    //     if (sysInfo.group === CORE_GROUP) {
    //         throw new adone.error.NotAllowedException("Unload core subsystem is not possible");
    //     }
    //     await super.unloadSubsystem(name);
    // }

    // @Public({
    //     description: "Returns omnitron's database"
    // })
    // getDB() {
    //     return this.db;
    // }

    // // // Gates
    // // @Public()
    // // addGate(gate) {
    // //     return this.gates.addGate(gate);
    // // }

    // // @Public()
    // // deleteGate(gate) {
    // //     return this.gates.deleteGate(gate);
    // // }

    // // @Public()
    // // upGate(name) {
    // //     return this.gates.upGate(name);
    // // }

    // // @Public()
    // // downGate(name) {
    // //     return this.gates.downGate(name);
    // // }

    // // @Public()
    // // getNetworks() {
    // //     return this.db.getAllNetworks();
    // // }

    // // @Public()
    // // configureGate(name, options) {
    // //     return this.gates.configureGate(name, options);
    // // }
}
