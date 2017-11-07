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

@Context({
    description: "Omnitron"
})
export default class Omnitron extends application.Application {
    async configure() {
        // Force create home and runtime directories
        await fs.mkdirp(adone.realm.config.runtimePath);

        // Load omnitron configuration
        this.config = await omnitron.loadConfig();

        this.db = new omnitron.SystemDB();

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
        await this.db.open();
        await runtime.netron.attachContext(this, "omnitron");
        await this.createPidFile();
    }

    async main() {
        if (is.function(process.send)) {
            process.send({ pid: process.pid });
        }

        adone.info(`Omnitron v${adone.package.version} started`);
    }

    async uninitialize() {
        // Unitialize services in omnitron group
        // ...
        
        // Uninitialize managers in right order
        for (const manager of ["service", "netron"]) {
            try {
                await this.uninitializeSubsystem(manager); // eslint-disable-line
                adone.info(`Manager '${manager}' uninitialized`);
            } catch (err) {
                adone.error(err);
            }
        }

        await runtime.netron.detachContext("omnitron");
        adone.info("Omnitron context detached");

        await this.db.close();
        adone.info("System database closed");

        return this.deletePidFile();
    }

    async createPidFile() {
        try {
            await fs.writeFile(adone.realm.config.omnitron.pidFilePath, process.pid.toString());
        } catch (err) {
            adone.error(err.message);
        }
    }

    async deletePidFile() {
        try {
            await fs.rm(adone.realm.config.omnitron.pidFilePath);
        } catch (err) {
            adone.error(err.message);
        }
    }

    _signalExit(sigName) {
        if (is.string(sigName)) {
            adone.info(`Killed by signal '${sigName}'`);
        } else {
            adone.info("Killed by self");
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
    async getInfo({ pid = true, version = true, realm = true, uptime = true, envs = true } = {}) {
        const result = {};

        if (pid) {
            result.pid = process.pid;
        }

        if (version) {
            result.version = adone.package.version;
        }

        if (realm) {
            result.realm = {
                uid: (await adone.realm.getInstance()).id,
                name: adone.realm.config.realm
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

    // @Public({
    //     description: "Returns list of all gates",
    //     type: Array
    // })
    // gates() {
    //     return this.config.gates;
    // }

    @Public({
        description: "Register new service"
    })
    registerService(name) {
        return this.db.registerService(name);
    }

    @Public({
        description: "Register existing service"
    })
    unregisterService(name) {
        return this.db.unregisterService(name);
    }

    @Public({
        description: "Return list of services",
        type: Array
    })
    enumerate(filter) {
        return this.subsystem("service").enumerate(filter);
    }

    @Public({
        description: "Return object of grouped services",
        type: Array
    })
    enumerateByGroup(group) {
        return this.subsystem("service").enumerateByGroup(group);
    }

    @Public({
        description: "Return list of groups",
        type: Array
    })
    enumerateGroups() {
        return this.subsystem("service").enumerateGroups();
    }

    @Public({})
    getMaintainer(group) {
        return this.subsystem("service").getMaintainer(group, true);
    }

    @Public({
        description: "Enables service"
    })
    enableService(name, options) {
        return this.subsystem("service").enableService(name, options);
    }

    @Public({
        description: "Disables service"
    })
    disableService(name, options) {
        return this.subsystem("service").disableService(name, options);
    }

    @Public({
        description: "Starts service"
    })
    startService(name) {
        return this.subsystem("service").startService(name);
    }

    @Public({
        description: "Stops service"
    })
    stopService(name) {
        return this.subsystem("service").stopService(name);
    }

    @Public({
        description: "Configures service"
    })
    configureService(name, options) {
        return this.subsystem("service").configureService(name, options);
    }

    @Public({
        description: "Restarts service"
    })
    async restart(serviceName) {
        await this.stop(serviceName);
        return this.start(serviceName);
    }

    @Public({
        description: "Returns connected peer UIDs"
    })
    getPeers() {
        const peers = [...runtime.netron.getPeers().values()];

        return peers.map((peer) => {
            return {
                uid: peer.uid,
                address: peer.getRemoteAddress().full,
                connectedTime: peer.connectedTime
            };
        });
    }
}

if (require.main === module) {
    if (!is.function(process.send)) {
        console.log(`${adone.terminal.esc.red.open}Omnitron cannot be launched directly${adone.terminal.esc.red.close}`);
        process.exit(application.EXIT_ERROR);
    }
    application.run(Omnitron);
}
