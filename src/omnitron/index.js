import adone from "adone";
import * as pkg from "adone/../package.json";
const { is, std } = adone;
const { Contextable, Public, Private, Description, Type } = adone.netron.decorator;
const { DISABLED, ENABLED, INITIALIZING, RUNNING, UNINITIALIZING, STATUSES } = adone.omnitron.const;

const startedAt = adone.util.microtime.now();

// Service requirements:
// 1. Each service should be in its own directory.
// 2. File index.js can obviously export one or more netron-contexts (default exports it not allowed).
// 3. Сonfiguration for each service must be placed in meta.json with folowing format:.
//    {
//        "name": String
//        "description": String,
//        "enabled": Boolean,
//        "dependencies": Array,
//        "contexts": [
//            {
//                "id": String,
//                "class": String, // format: "filename[.ext]:classname"
//                "options": Object
//            }
//        ]
//    }
//
// Service:
//   name (optional) - Name of service.
//   description (optional) - Service description.
//   enabled - Should be service enabled or disabled. Disabled services cannot be started.
//   dependencies (optional) - List of dependent services.
//   contexts - List of exposed contexts
//
// Context:
//   id - ID of context. If ID starts with '.', then full context ID wiil be 'name.id'.
//   class - Name of the context's class exported from index.js.
//   options (optional) - context-specific options (changable in user-defined configuration).
//


@Contextable
@Private
export class Omnitron extends adone.Application {
    async initialize() {
        await this.loadAdoneConfig("omnitron");

        // Save PID.
        try {
            std.fs.writeFileSync(this.config.omnitron.pidFilePath, process.pid);
        } catch (err) {
            adone.error(err.message);
        }

        await adone.fs.mkdir(this.config.omnitron.servicesPath);

        this.exitOnSignal("SIGQUIT");
        this.exitOnSignal("SIGTERM");
        this.exitOnSignal("SIGINT");
        process.on("SIGILL", () => {
            global.gc();
            adone.info("running garbage collector");
        });

        // Initialize netron and bind its gates.
        this._.netron = new adone.netron.Netron({ isSuper: true });
        this._.netron.on("peer online", (peer) => {
            adone.info(`peer '${peer.getRemoteAddress().full}' (uid: ${peer.uid}) connected`);
        }).on("peer offline", (peer) => {
            adone.info(`peer '${peer.getRemoteAddress().full}' (uid: ${peer.uid}) disconnected`);
        });
        await adone.netron.Netron.bindGates(this._.netron, this.config.omnitron.gates);

        // Subconfiguration for services...
        this.config.omnitron.services = {};

        // Load configurations of core services.
        const coreServicesPath = std.path.resolve(__dirname, "services");
        if (adone.fs.exists(coreServicesPath)) {
            await adone.glob(`${coreServicesPath}/*/meta.json`).map(async (configPath) => {
                const servicePath = std.path.dirname(configPath);
                const serviceName = std.path.basename(servicePath);
                await this.config.load(configPath, `omnitron.services.${serviceName}`);
                const config = this.config.omnitron.services[serviceName];
                delete config.name;
                config.path = servicePath;
            });
        }

        // Merge with user-defined configuration.
        try {
            await this.config.load(this.config.omnitron.servicesConfigFilePath, "omnitron.services");
        } catch (err) {
            if (err instanceof adone.x.NotFound) {
                adone.info(`Configuration '${this.config.omnitron.servicesConfigFilePath}' is not found`);
            } else {
                adone.error(err);
            }
        }

        this._.service = {};
        this._.context = {};
        
        // Attach enabled contexts
        for (const [name, svcConfig] of Object.entries(this.config.omnitron.services)) {
            if (name !== "omnitron") {
                await this._attachService(name, svcConfig);
            }
        }

        // Finally, redefine and attach omnitron service
        this.config.omnitron.services.omnitron = {
            description: "Omnitron service",
            path: __dirname,
            status: INITIALIZING,
            contexts: [
                {
                    id: "omnitron",
                    class: "Omnitron"
                }
            ]
        };
        await this._attachService("omnitron", this.config.omnitron.services.omnitron, this);

        await this._saveServicesConfig();

        if (is.function(process.send)) {
            process.send({ pid: process.pid });
        }
    }

    async uninitialize() {
        try {
            // First detach omnitron service
            this._.netron.detachContext("omnitron");
            this.config.omnitron.services.omnitron.status = ENABLED;
            adone.info("Service 'omnitron' detached");

            for (const [serviceName, service] of Object.entries(this._.service)) {
                if (serviceName !== "omnitron") {
                    try {
                        await this._detachService(service);
                    } catch (err) {
                        adone.error(err);
                    }
                }
            }

            await this._.netron.disconnect();
        } catch (err) {
            adone.error(err);
        }

        await this._saveServicesConfig();

        // Let netron gracefully complete all disconnects
        await adone.promise.delay(500);
        await this._.netron.unbind();
        await adone.fs.rm(this.config.omnitron.pidFilePath);
    }

    @Public
    @Description("Uptime of omnitron")
    @Type(String)
    uptime() {
        const curr = adone.util.microtime.now();
        const ms = ((curr - startedAt) / 1000) >>> 0;
        return adone.text.humanizeTime(ms);
    }

    @Public
    @Description("Version of omnitron")
    @Type(String)
    version() {
        return pkg.version;
    }

    @Public
    @Description("Enable service with specified name")
    @Type()
    async enable(serviceName, needEnabled) {
        if (serviceName === "omnitron") {
            throw new adone.x.NotAllowed("Status of omnitron is inviolable");
        }
        const service = this._.service[serviceName];
        if (is.undefined(service)) {
            throw new adone.x.Unknown(`Unknown service: ${serviceName}`);
        }
        if (needEnabled) {
            if (service.config.status === DISABLED) {
                service.config.status = ENABLED;
                return this._saveServicesConfig();
            } else {
                throw new adone.x.IllegalState("Service is not disabled");
            }
        } else {
            if (service.config.status !== DISABLED) {
                if (service.config.status === RUNNING) {
                    await this._detachService(service);
                } else if (service.config.status !== ENABLED) {
                    throw new adone.x.IllegalState(`Cannot disable service with '${service.config.status}' status`);
                }
                service.config.status = DISABLED;
                return this._saveServicesConfig();
            }
        }
    }

    @Public
    @Description("List services")
    @Type(Object)
    list({ status = "all" } = {}) {
        if (!STATUSES.includes(status)) {
            throw new adone.x.NotValid(`Not valid status: ${status}`);
        }

        const services = [];
        for (const [name, serviceConfig] of Object.entries(this.config.omnitron.services)) {
            if (serviceConfig.status === status || status === "all") {
                const cfg = {
                    name,
                    description: serviceConfig.description || "",
                    status: serviceConfig.status,
                    path: serviceConfig.path,
                    contexts: serviceConfig.contexts
                };
                services.push(cfg);
            }
        }

        return services;
    }

    @Public
    @Description("Force garbage collector")
    gc() {

    }

    async _attachService(serviceName, serviceConfig, instance) {
        const service = this._.service[serviceName] = {
            name: serviceName,
            config: serviceConfig,
            contexts: []
        };
        if (serviceConfig.status !== DISABLED) {
            for (const contextConfig of serviceConfig.contexts) {
                let id;
                if (is.propertyOwned(contextConfig, "id") && is.string(contextConfig.id)) {
                    if (contextConfig.id.startsWith(".")) {
                        id = `${serviceName}${contextConfig.id}`;
                    } else {
                        id = contextConfig.id;
                    }
                } else {
                    id = (is.string(serviceConfig.name) ? serviceConfig.name : serviceName);
                }

                if (is.undefined(instance)) {
                    serviceConfig.status = INITIALIZING;

                    let contextPath;
                    let className = contextConfig.class;
                    if (className.indexOf(":") >= 0) {
                        const parts = className.split(":");
                        className = parts[1];
                        contextPath = std.path.join(serviceConfig.path, parts[0]);
                    } else {
                        contextPath = serviceConfig.path;
                    }
                    const serviceExports = require(contextPath);
                    const ServiceClass = serviceExports[className];
                    let options = { serviceName, id, omnitron: this, netron: this._.netron };
                    if (is.plainObject(contextConfig.options)) {
                        options = adone.vendor.lodash.defaults(options, contextConfig.options);
                    }
                    instance = new ServiceClass(options);
                    if (is.function(instance.initialize)) {
                        await instance.initialize();
                    }
                }

                service.contexts.push(this._.context[id] = {
                    id,
                    instance,
                    config: contextConfig,
                    service
                });
                
                this._.netron.attachContext(instance, id);
                serviceConfig.status = RUNNING;
            }
            adone.info(`Service '${serviceName}' attached`);
        }
    }

    async _detachService(service) {
        if (service.config.status === RUNNING) {
            service.config.status = UNINITIALIZING;
            // Detach and unintialize contexts
            for (const context of service.contexts) {
                this._.netron.detachContext(context.id);
                if (is.function(context.instance.uninitialize)) {
                    await context.instance.uninitialize();
                }
            }
            service.config.status = ENABLED;
            adone.info(`Service '${service.name}' detached`);
        }
    }

    async _saveServicesConfig() {
        // Save actual configuration of services
        try {
            await this.config.save(this.config.omnitron.servicesConfigFilePath, "omnitron.services", { space: 4 });
            adone.info(`Configuration '${this.config.omnitron.servicesConfigFilePath}' saved`);
        } catch (err) {
            adone.error(err);
        }
    }

    _signalExit(sigName) {
        adone.info(`Received signal '${sigName}'`);
        return super._signalExit(sigName);
    }
}

if (require.main === module) {
    if (!is.function(process.send)) {
        console.log("omnitron cannot be launched directly (use adone cli)");
        process.exit(adone.Application.ERROR);
    }
    const omnitron = new Omnitron({ defaultConfigsPath: process.env.ADONE_DEFAULT_CONFIG_PATH });
    omnitron.run();
}
