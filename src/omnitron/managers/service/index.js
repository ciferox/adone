const {
    application,
    x,
    is,
    fs,
    std,
    omnitron: { STATUS },
    vault,
    system: { process: { exec } }
} = adone;

const SERVICES_PATH = adone.realm.config.omnitron.servicesPath;

const SERVICE_APP_PATH = std.path.join(__dirname, "service_application.js");

class ServiceMaintainer {
    constructor({ group, services, port } = {}) {
        this.group = group;
        this.services = services;
        this.port = port;
        this.process = null;
        this.restarts = 0;
        this.maxRestarts = 3;
    }

    async start() {
        const serviceProcess = exec("node", [SERVICE_APP_PATH], {
            stdout: std.fs.openSync(adone.realm.config.omnitron.logFilePath, "a"),
            stderr: std.fs.openSync(adone.realm.config.omnitron.errorLogFilePath, "a"),
            env: {
                OMNITRON_PORT: this.port,
                OMNITRON_SERVICE_GROUP: this.group,
                OMNITRON_SERVICES: this.services.map((x) => x.path).join(";")
            }
        });

        serviceProcess.then((result) => {
            if (result.code !== 0) {
                this.process = null;
                if (++this.restarts <= this.maxRestarts) {
                    this.start();
                }
            }
        });

        this.process = serviceProcess;
        return serviceProcess;
    }

    async stop() {
        if (!is.null(this.process)) {
            this.process.kill("SIGTERM");
            const result = await this.process;
            return result.code;
        }
    }

    isRunning() {
        return !is.null(this.process);
    }
}

export default class ServiceManager extends application.Subsystem {
    async configure() {
        this.meta = null;
        this.services = null;
        this.serviceMaintainers = new Map();
        this.maintainers = new Map();
    }

    async initialize() {
        this.meta = await this.parent.db.getServicesValuable();
        this.services = vault.slice(this.meta, "service");

        await this.startAll();
    }

    async uninitialize() {
        await this.stopAll();
    }

    async enumerate() {
        const existingNames = [];
        const services = [];

        // Normalize statuses
        if (await fs.exists(SERVICES_PATH)) {
            const files = await fs.readdir(SERVICES_PATH);
            for (const file of files) {
                try {
                    const path = std.path.join(SERVICES_PATH, file);
                    // eslint-disable-next-line
                    const adoneConf = await adone.project.Configuration.load({
                        cwd: path
                    });
                    existingNames.push(adoneConf.raw.name);
                    services.push({
                        name: adoneConf.raw.name,
                        description: adoneConf.raw.description || "",
                        version: adoneConf.raw.version || "",
                        author: adoneConf.raw.author || "",
                        path
                    });
                } catch (err) {
                    adone.error(err.message);
                }
            }
        }

        const names = this.services.keys();

        // Remove nonexisting services
        for (const name of names) {
            if (!existingNames.includes(name)) {
                await this.services.delete(name); // eslint-disable-line
            }
        }

        for (const service of services) {
            Object.assign(service, await this.services.get(service.name)); // eslint-disable-line
        }

        return services;
    }

    async getService(name, checkExists = true) {
        const path = std.path.join(SERVICES_PATH, name);
        if (checkExists && !(await fs.exists(path))) {
            throw new x.Unknown(`UNknown service: ${name}`);
        }

        const adoneConf = await adone.project.Configuration.load({
            cwd: path
        });

        const result = {
            name: adoneConf.raw.name,
            description: adoneConf.raw.description || "",
            version: adoneConf.raw.version || "",
            author: adoneConf.raw.author || "",
            path
        };

        Object.assign(result, {
            group: null
        }, await this.services.get(name));

        return result;
    }

    async enumerateGroups() {
        const services = await this.enumerate();
        const groups = new Map();

        for (const service of services) {
            if (is.string(service.group)) {
                let list = groups.get(service.group);
                if (is.undefined(list)) {
                    list = [];
                    groups.set(service.group, list);
                }
                list.push(service);
            } else {
                const group = adone.text.random(16);
                await this.setServiceGroup(service.name, group); // eslint-disable-line
                groups.set(group, [service]);
            }
        }

        return groups;
    }

    async setServiceGroup(name, group) {
        const runtimeData = await this.services.get(name);
        runtimeData.group = group;
        await this.services.set(name, runtimeData);
    }

    async enable(name) {
        const runtimeData = await this.services.get(name);
        if (runtimeData.status === STATUS.DISABLED) {
            runtimeData.status = STATUS.INACTIVE;
            return this.services.set(name, runtimeData);
        }
        throw new x.IllegalState("Service is not disabled");
    }

    async disable(name) {
        const runtimeData = await this.services.get(name);
        if (runtimeData.status !== STATUS.DISABLED) {
            if (runtimeData.status === STATUS.ACTIVE) {
                await this.stop(name);
            } else if (runtimeData.status !== STATUS.INACTIVE) {
                throw new x.IllegalState(`Cannot disable service with '${runtimeData.status}' status`);
            }
            runtimeData.status = STATUS.DISABLED;
            return this.services.set(name, runtimeData);
        }
    }

    async startAll() {
        const groups = await this.enumerateGroups();
        const port = this.parent.subsystem("netron").getPort();

        for (const [group, services] of groups.entries()) {
            const maintainer = new ServiceMaintainer({
                group,
                services,
                port
            });
            this.maintainers.set(group, maintainer);
            for (const svc of services) {
                this.serviceMaintainers.set(svc.name, maintainer);
            }
            maintainer.start();
        }
    }

    async stopAll() {
        for (const maintainer of this.maintainers.values()) {
            await maintainer.stop(); // eslint-disable-line
        }
    }

    async start(name) {
        const runtimeData = await this.services.get(name);
        if (runtimeData.status === STATUS.DISABLED) {
            throw new x.IllegalState("Service is disabled");
        } else if (runtimeData.status === STATUS.INACTIVE) {
            // return this.attachService(serviceName, service.config);
        } else {
            throw new x.IllegalState(`Illegal status of service: ${runtimeData.status}`);
        }
    }

    static createMaintainer(options) {
        let maintainer;

        switch (options.group) {
            case "omnitron":
            default:
                maintainer = new ServiceMaintainer(options);
        }

        return maintainer;
    }

    // getGroups() {
    //     return this.meta.get("groups");
    // }

    // async addGroup(name) {
    //     const groups = await this.getGroups();
    //     if (!groups.include(name)) {
    //         groups.push(name);
    //         await this.meta.set("groups", groups);
    //     }
    // }

    // async deleteGroup(name) {
    //     if (name === "omnitron") {
    //         throw new x.NotAllowed("You cannot delete this group");
    //     }
    // }

    // async attachServices() {
    //     this._.service = {};
    //     this._.uninitOrder = [];
    //     this._.context = {};

    //     // Attach enabled contexts
    //     for (const [name, svcConfig] of Object.entries(this.config.omnitron.services)) {
    //         try {
    //             if (name !== "omnitron") {
    //                 await this.attachService(name, svcConfig);
    //             }
    //         } catch (err) {
    //             adone.error(err.message);
    //         }
    //     }

    //     // Finally, attach omnitron service
    //     return this.attachService("omnitron", this.config.omnitron.services.omnitron, this);
    // }

    // async detachServices() {
    //     try {
    //         // First detach omnitron service
    //         if (!is.null(this._.netron)) {
    //             this._.netron.detachContext("omnitron");
    //             this.config.omnitron.services.omnitron.status = ENABLED;
    //             adone.info("Service 'omnitron' detached");

    //             for (const serviceName of this._.uninitOrder) {
    //                 const service = this._.service[serviceName];
    //                 try {
    //                     if (serviceName !== "omnitron") {
    //                         await this.detachService(service);
    //                     }
    //                 } catch (err) {
    //                     adone.error(err);
    //                 }
    //             }
    //         }
    //     } catch (err) {
    //         adone.error(err);
    //     }
    // }

    getInterface(name) {
        const parts = name.split(".");
        const service = this._.service[parts[0]];
        if (is.undefined(service)) {
            throw new x.Unknown(`Unknown service '${name}'`);
        }

        let defId;
        if (parts.length === 1) {
            if (is.undefined(service.defaultContext)) {
                throw new x.InvalidArgument(`No default context of '${parts[0]}' service`);
            }
            defId = service.defaultContext.defId;
        } else {
            for (const context of service.contexts) {
                if (context.id === parts[1]) {
                    defId = context.defId;
                }
            }
            if (is.undefined(defId)) {
                throw new x.NotFound(`Context '${name}' not found`);
            }
        }

        return this._.netron.getInterfaceById(defId);
    }

    // async attachService(serviceName, serviceConfig, instance) {
    //     let service = this._.service[serviceName];
    //     if (is.undefined(service)) {
    //         service = this._.service[serviceName] = {
    //             name: serviceName,
    //             config: serviceConfig,
    //             contexts: []
    //         };
    //     }

    //     if (serviceConfig.status === ENABLED) {
    //         await this._checkDependencies(service, (depName, depConfig) => this.attachService(depName, depConfig));

    //         let defaulted = false;
    //         const checkDefault = () => {
    //             if (defaulted) {
    //                 throw new x.NotAllowed("Only one context of service can be default");
    //             }
    //             defaulted = true;
    //         };

    //         for (const contextConfig of serviceConfig.contexts) {
    //             const id = this._getContextId(serviceName, contextConfig, checkDefault);

    //             if (is.undefined(instance)) {
    //                 serviceConfig.status = INITIALIZING;

    //                 let contextPath;
    //                 let className = contextConfig.class;
    //                 if (className.indexOf(":") >= 0) {
    //                     const parts = className.split(":");
    //                     className = parts[1];
    //                     contextPath = std.path.join(serviceConfig.path, parts[0]);
    //                 } else {
    //                     contextPath = serviceConfig.path;
    //                 }
    //                 const serviceExports = require(contextPath);
    //                 const ServiceClass = serviceExports[className];

    //                 let options = { serviceName, id, omnitron: this, netron: this._.netron };
    //                 if (is.plainObject(contextConfig.options)) {
    //                     options = adone.vendor.lodash.defaults(options, contextConfig.options);
    //                 }
    //                 instance = new ServiceClass(options);
    //                 if (is.function(instance.initialize)) {
    //                     await instance.initialize();
    //                 }
    //             }

    //             const defId = this._.netron.attachContext(instance, id);
    //             service.contexts.push(this._.context[id] = {
    //                 id,
    //                 defId,
    //                 instance,
    //                 config: contextConfig,
    //                 service
    //             });
    //             instance = undefined;

    //             if (defaulted) {
    //                 service.defaultContext = this._.context[id];
    //             }
    //             serviceConfig.status = ACTIVE;
    //         }
    //         this._.uninitOrder.unshift(serviceName);
    //         adone.info(`Service '${serviceName}' attached`);
    //     }
    // }

    // async detachService(service) {
    //     if (service.config.status !== DISABLED) {
    //         service.config.status = UNINITIALIZING;
    //         // Detach and unintialize contexts
    //         for (const context of service.contexts) {
    //             this._.netron.detachContext(context.id);
    //             if (is.function(context.instance.uninitialize)) {
    //                 await context.instance.uninitialize();
    //             }
    //         }
    //         service.contexts = [];
    //         service.config.status = ENABLED;
    //         adone.info(`Service '${service.name}' detached`);
    //     }
    // }

    // _getContextId(serviceName, contextConfig, validate = adone.noop) {
    //     let id;
    //     if (contextConfig.default === true) {
    //         validate();
    //         if (is.propertyOwned(contextConfig, "id") && is.string(contextConfig.id)) {
    //             id = contextConfig.id;
    //         } else {
    //             id = serviceName;
    //         }
    //     } else {
    //         if (is.propertyOwned(contextConfig, "id") && is.string(contextConfig.id)) {
    //             id = `${serviceName}.${contextConfig.id}`;
    //         } else {
    //             validate();
    //             id = serviceName;
    //         }
    //     }

    //     return id;
    // }

    // async _checkDependencies(service, handler = adone.noop, { checkDisabled = true } = {}) {
    //     if (is.array(service.config.dependencies)) {
    //         for (const depName of service.config.dependencies) {
    //             const depService = this._.service[depName];
    //             let config;
    //             if (is.undefined(depService)) {
    //                 const depConfig = this.config.omnitron.services[depName];
    //                 if (is.undefined(depConfig)) {
    //                     throw new x.Unknown(`Unknown service '${depName}' in dependency list of '${service.name}' service`);
    //                 }
    //                 config = depConfig;
    //             } else {
    //                 config = depService.config;
    //             }
    //             if (checkDisabled && config.status === DISABLED) {
    //                 throw new x.IllegalState(`Dependent service '${depName}' is disabled`);
    //             }
    //             await handler(depName, config);
    //         }
    //     }
    // }
}
