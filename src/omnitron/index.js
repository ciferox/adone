import adone from "adone";
const startedAt = adone.util.microtime.now();
import * as pkg from "adone/../package.json";
const { is, std, vendor: { lodash: _ } } = adone;
const { Contextable, Public, Private, Description, Type } = adone.netron.decorator;
const { DISABLED, ENABLED, INITIALIZING, ACTIVE, UNINITIALIZING, STATUSES } = adone.omnitron.const;

// Service requirements:
// 1. Each service should be in its own directory.
// 2. File index.js can obviously export one or more netron-contexts (default exports it not allowed).
// 3. Сonfiguration for each service must be placed in meta.json with folowing format:.
//    {
//        "description": String,
//        "enabled": Boolean,
//        "dependencies": Array,
//        "contexts": [
//            {
//                "id": String,
//                "class": String, // format: "filename[.ext]:classname"
//                "default": Boolean,
//                "options": Object
//            }
//        ]
//    }
//
// Service:
//   description (optional) - Service description.
//   enabled - Should be service enabled or disabled. Disabled services cannot be started.
//   dependencies (optional) - List of dependent services.
//   contexts - List of exposed contexts
//
// Context:
//   id - ID of context. If ID starts with '.', then full context ID wiil be 'name.id'.
//   class - Name of the context's class exported from index.js.
//   default - Indicates that the context is default (only one context can be default).
//   options (optional) - context-specific options (changable in user-defined configuration).
//

@Contextable
@Private
export class Omnitron extends adone.application.Application {
    async initialize() {
        this._.configManager = new adone.omnitron.ConfigurationManager(this);
        await this._.configManager.loadAll();

        await this.createPidFile();

        await adone.fs.mkdir(this.config.omnitron.servicesPath);

        this.exitOnSignal("SIGQUIT");
        this.exitOnSignal("SIGTERM");
        this.exitOnSignal("SIGINT");
        process.on("SIGILL", () => {
            global.gc();
            adone.info("running garbage collector");
        });

        this.createNetron({ isSuper: true });
        await this.bindNetron();

        // Save services config for pm-service-container.
        await this._.configManager.saveServicesConfig();

        await this.attachServices();

        await this._.configManager.saveGatesConfig();

        if (is.function(process.send)) {
            process.send({ pid: process.pid });
        }
    }

    async uninitialize() {
        await this.detachServices();

        await this._.configManager.saveServicesConfig();

        // Let netron gracefully complete all disconnects
        await adone.promise.delay(500);

        await this.unbindNetron();

        await this._.configManager.saveGatesConfig();

        return this.deletePidFile();
    }

    async createPidFile() {
        // Save PID.
        try {
            await adone.fs.writeFile(this.config.omnitron.pidFilePath, process.pid);
        } catch (err) {
            adone.error(err.message);
        }
    }

    deletePidFile() {
        return adone.fs.rm(this.config.omnitron.pidFilePath);
    }

    createNetron(options) {
        // Initialize netron and bind its gates.
        this._.netron = new adone.netron.Netron(options);
        this._.netron.on("peer online", (peer) => {
            adone.info(`peer '${peer.getRemoteAddress().full}' (uid: ${peer.uid}) connected`);
        }).on("peer offline", (peer) => {
            adone.info(`peer '${peer.getRemoteAddress().full}' (uid: ${peer.uid}) disconnected`);
        });
    }

    async bindNetron() {
        // Bind gates.
        for (const gate of this.config.omnitron.gates) {
            if (gate.status === ENABLED) {
                const bindOptions = _.omit(gate, ["id", "type", "enabled"]);
                switch (gate.type) {
                    case "socket": {
                        await this._.netron.bind(bindOptions);
                        gate.status = ACTIVE;
                        break;
                    }
                    case "websocket": {
                        const adapter = new adone.netron.ws.Adapter(bindOptions);
                        await this._.netron.attachAdapter(adapter);
                        await this._.netron.bind(gate.id);
                        gate.status = ACTIVE;
                        break;
                    }
                }
            }
        }
    }

    async unbindNetron() {
        try {
            await this._.netron.disconnect();
            await this._.netron.unbind();

            // this way is not reliable
            for (const gate of this.config.omnitron.gates) {
                if (gate.status === ACTIVE) {
                    gate.status = ENABLED;
                }
            }
        } catch (err) {
            adone.error(err);
        }
    }

    async attachServices() {
        this._.service = {};
        this._.uninitOrder = [];
        this._.context = {};

        // Attach enabled contexts
        for (const [name, svcConfig] of Object.entries(this.config.omnitron.services)) {
            try {
                if (name !== "omnitron") {
                    await this.attachService(name, svcConfig);
                }
            } catch (err) {
                adone.error(err.message);
            }
        }

        // Finally, attach omnitron service
        return this.attachService("omnitron", this.config.omnitron.services.omnitron, this);
    }

    async detachServices() {
        try {
            // First detach omnitron service
            this._.netron.detachContext("omnitron");
            this.config.omnitron.services.omnitron.status = ENABLED;
            adone.info("Service 'omnitron' detached");

            for (const serviceName of this._.uninitOrder) {
                const service = this._.service[serviceName];
                try {
                    if (serviceName !== "omnitron") {
                        await this.detachService(service);
                    }
                } catch (err) {
                    adone.error(err);
                }
            }
        } catch (err) {
            adone.error(err);
        }
    }

    getInterface(name) {
        const parts = name.split(".");
        const service = this._.service[parts[0]];
        if (is.undefined(service)) {
            throw new adone.x.Unknown(`Unknown service '${name}'`);
        }

        let defId;
        if (parts.length === 1) {
            if (is.undefined(service.defaultContext)) {
                throw new adone.x.InvalidArgument(`No default context of '${parts[0]}' service`);
            }
            defId = service.defaultContext.defId;
        } else {
            for (const context of service.contexts) {
                if (context.id === parts[1]) {
                    defId = context.defId;
                }
            }
            if (is.undefined(defId)) {
                throw new adone.x.NotFound(`Context '${name}' not found`);
            }
        }

        return this._.netron.getInterfaceById(defId);
    }

    getServiceByName(serviceName) {
        if (serviceName === "omnitron") {
            throw new adone.x.NotAllowed("Status of omnitron is inviolable");
        }
        const service = this._.service[serviceName];
        if (is.undefined(service)) {
            throw new adone.x.Unknown(`Unknown service: ${serviceName}`);
        }
        return service;
    }

    async attachService(serviceName, serviceConfig, instance) {
        let service = this._.service[serviceName];
        if (is.undefined(service)) {
            service = this._.service[serviceName] = {
                name: serviceName,
                config: serviceConfig,
                contexts: []
            };
        }

        if (serviceConfig.status === ENABLED) {
            await this._checkDependencies(service, (depName, depConfig) => this.attachService(depName, depConfig));

            let defaulted = false;
            const checkDefault = () => {
                if (defaulted) {
                    throw new adone.x.NotAllowed("Only one context of service can be default");
                }
                defaulted = true;
            };

            for (const contextConfig of serviceConfig.contexts) {
                const id = this._getContextId(serviceName, contextConfig, checkDefault);

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

                const defId = this._.netron.attachContext(instance, id);
                service.contexts.push(this._.context[id] = {
                    id,
                    defId,
                    instance,
                    config: contextConfig,
                    service
                });
                instance = undefined;

                if (defaulted) {
                    service.defaultContext = this._.context[id];
                }
                serviceConfig.status = ACTIVE;
            }
            this._.uninitOrder.unshift(serviceName);
            adone.info(`Service '${serviceName}' attached`);
        }
    }

    async detachService(service) {
        if (service.config.status !== DISABLED) {
            service.config.status = UNINITIALIZING;
            // Detach and unintialize contexts
            for (const context of service.contexts) {
                this._.netron.detachContext(context.id);
                if (is.function(context.instance.uninitialize)) {
                    await context.instance.uninitialize();
                }
            }
            service.contexts = [];
            service.config.status = ENABLED;
            adone.info(`Service '${service.name}' detached`);
        }
    }

    _getContextId(serviceName, contextConfig, validate = adone.noop) {
        let id;
        if (contextConfig.default === true) {
            validate();
            if (is.propertyOwned(contextConfig, "id") && is.string(contextConfig.id)) {
                id = contextConfig.id;
            } else {
                id = serviceName;
            }
        } else {
            if (is.propertyOwned(contextConfig, "id") && is.string(contextConfig.id)) {
                id = `${serviceName}.${contextConfig.id}`;
            } else {
                validate();
                id = serviceName;
            }
        }

        return id;
    }

    async _checkDependencies(service, handler = adone.noop) {
        if (is.array(service.config.dependencies)) {
            for (const depName of service.config.dependencies) {
                const depService = this._.service[depName];
                let config;
                if (is.undefined(depService)) {
                    const depConfig = this.config.omnitron.services[depName];
                    if (is.undefined(depConfig)) {
                        throw new adone.x.Unknown(`Unknown service '${depName}' in dependency list of '${service.name}' service`);
                    }
                    config = depConfig;
                } else {
                    config = depService.config;
                }
                if (config.status === DISABLED) {
                    throw new adone.x.IllegalState(`Dependent service '${depName}' is disabled`);
                }
                await handler(depName, config);
            }
        }
    }

    _signalExit(sigName) {
        adone.info(`Received signal '${sigName}'`);
        return super._signalExit(sigName);
    }

    // Omnitron interface

    @Public
    @Description("Uptime of omnitron")
    @Type(String)
    uptime() {
        const curr = adone.util.microtime.now();
        const ms = ((curr - startedAt) / 1000) >>> 0;
        return adone.util.humanizeTime(ms);
    }

    @Public
    @Description("The environment under which the omnitron is running")
    @Type(String)
    environment() {
        return adone.appinstance.config.adone.environment;
    }

    @Public
    @Description("Omnitron's environment variables")
    @Type(Object)
    envs() {
        return process.env;
    }

    @Public
    @Description("Version of omnitron")
    @Type(String)
    version() {
        return pkg.version;
    }

    @Public
    @Description("Service status")
    @Type(String)
    async status(serviceName) {
        let names;
        if (is.string(serviceName)) {
            if (serviceName === "") {
                names = Object.keys(this._.service);
            } else {
                names = [serviceName];
            }
        } else if (is.array(serviceName)) {
            if (serviceName.length === 0) {
                names = Object.keys(this._.service);
            } else {
                names = serviceName;
            }
        } else {
            throw new adone.x.InvalidArgument(`Invalid type of argument: ${typeof (serviceName)}`);
        }

        const result = [];
        for (const name of names) {
            if (is.propertyOwned(this._.service, name)) {
                result.push({
                    name,
                    status: this._.service[name].config.status
                });
            }
        }
        return result;
    }

    @Public
    @Description("Enable service with specified name")
    @Type()
    async enable(serviceName, needEnabled) {
        const service = this.getServiceByName(serviceName);
        if (needEnabled) {
            if (service.config.status === DISABLED) {
                await this._checkDependencies(service);
                service.config.status = ENABLED;
                return this._.configManager.saveServicesConfig();
            } else {
                throw new adone.x.IllegalState("Service is not disabled");
            }
        } else {
            if (service.config.status !== DISABLED) {
                if (service.config.status === ACTIVE) {
                    await this.detachService(service);
                } else if (service.config.status !== ENABLED) {
                    throw new adone.x.IllegalState(`Cannot disable service with '${service.config.status}' status`);
                }
                service.config.status = DISABLED;
                return this._.configManager.saveServicesConfig();
            }
        }
    }

    @Public
    @Description("Start service")
    @Type()
    start(serviceName) {
        const service = this.getServiceByName(serviceName);
        const status = service.config.status;
        if (status === DISABLED) {
            throw new adone.x.IllegalState("Service is disabled");
        } else if (status === ENABLED) {
            return this.attachService(serviceName, service.config);
        } else {
            throw new adone.x.IllegalState(`Illegal status of service: ${status}`);
        }
    }

    @Public
    @Description("Stop service")
    @Type()
    stop(serviceName) {
        const service = this.getServiceByName(serviceName);
        const status = service.config.status;
        if (status === DISABLED) {
            throw new adone.x.IllegalState("Service is disabled");
        } else if (status === ACTIVE) {
            return this.detachService(service);
        } else {
            throw new adone.x.IllegalState(`Illegal status of service: ${status}`);
        }
    }

    @Public
    @Description("Restart service")
    @Type()
    async restart(serviceName) {
        await this.stop(serviceName);
        return this.start(serviceName);
    }

    @Public
    @Description("Return list of all services services")
    @Type(Array)
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
                    contexts: []
                };

                for (const contextConfig of serviceConfig.contexts) {
                    const id = this._getContextId(name, contextConfig);

                    const descr = {
                        id,
                        class: contextConfig.class
                    };
                    if (is.boolean(contextConfig.default)) {
                        descr.default = contextConfig.default;
                    }
                    cfg.contexts.push(descr);
                }
                services.push(cfg);
            }
        }

        return services;
    }

    @Public
    @Description("Return list of all gates")
    @Type(Array)
    gates() {
        return this.config.omnitron.gates;
    }

    @Public
    @Description("")
    @Type()


    @Public
    @Description("Force garbage collector")
    gc() {

    }
}

if (require.main === module) {
    if (!is.function(process.send)) {
        console.log("omnitron cannot be launched directly (use adone cli)");
        process.exit(adone.Application.ERROR);
    }
    const omnitron = new Omnitron();
    omnitron.run();
}
