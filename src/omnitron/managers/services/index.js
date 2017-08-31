const {
    application,
    configuration,
    x,
    is,
    fs,
    std,
    omnitron: { const: { ENABLED, DISABLED } },
    vault
} = adone;

const SERVICE_NAME_PREFIX = "service.";

export default class ServiceManager extends application.Subsystem {
    async configure() {
        this.meta = null;
        this.servicesDb = new vault.Vault({
            location: std.path.join(adone.config.varPath, "omnitron", "services.db")
        });

        await fs.mkdir(std.path.dirname(this.servicesDb.options.location));
    }

    async initialize() {
        await this.servicesDb.open();
        if (!this.servicesDb.has("$meta")) {
            this.meta = await this.servicesDb.create("$meta");

            // Initialize groups with one main group 'omnitron'.
            await this.meta.set("groups", ["omnitron"]);
        } else {
            this.meta = await this.servicesDb.get("$meta");
        }
    }

    async uninitialize() {
        await this.servicesDb.close();
    }

    async enumerate() {
        const actualNames = [];
        const services = [];

        const servicesPath = adone.config.omnitron.servicesPath;

        // Normalize statuses
        if (await fs.exists(servicesPath)) {
            const files = await fs.readdir(servicesPath);
            for (const file of files) {
                try {
                    const path = std.path.join(servicesPath, file);
                    // eslint-disable-next-line
                    const adoneConf = await configuration.load(std.path.join(path, "adone.conf.js"), null, {
                        transpile: true
                    });
                    actualNames.push(adoneConf.name);
                    services.push({
                        name: adoneConf.name,
                        description: adoneConf.description,
                        author: adoneConf.author,
                        path
                    });
                } catch (err) {
                    adone.error(err.message);
                }
            }
        }

        const names = this.meta.keys(new RegExp(`^${SERVICE_NAME_PREFIX}(.+)`));

        // Remove uninstalled services
        for (const name of names) {
            if (!actualNames.includes(name)) {
                await this.meta.delete(`${SERVICE_NAME_PREFIX}${name}`); // eslint-disable-line
            }
        }

        for (const service of services) {
            const internalName = `${SERVICE_NAME_PREFIX}${service.name}`;
            let runtimeData;
            if (!this.meta.has(internalName)) {
                runtimeData = {
                    status: DISABLED
                };
                // eslint-disable-next-line
                await this.meta.set(internalName, runtimeData);
            } else {
                runtimeData = await this.meta.get(internalName); // eslint-disable-line
            }
            service.status = runtimeData.status;
            if (is.string(runtimeData.group)) {
                service.group = runtimeData.group;
            }
        }

        return services;
    }

    getGroups() {
        return this.meta.get("groups");
    }

    async addGroup(name) {
        const groups = await this.getGroups();
        if (!groups.include(name)) {
            groups.push(name);
            await this.meta.set("groups", groups);
        }
    }

    async deleteGroup(name) {
        if (name === "omnitron") {
            throw new x.NotAllowed("You cannot delete this group");
        }
    }

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
    //                 throw new adone.x.NotAllowed("Only one context of service can be default");
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
    //                     throw new adone.x.Unknown(`Unknown service '${depName}' in dependency list of '${service.name}' service`);
    //                 }
    //                 config = depConfig;
    //             } else {
    //                 config = depService.config;
    //             }
    //             if (checkDisabled && config.status === DISABLED) {
    //                 throw new adone.x.IllegalState(`Dependent service '${depName}' is disabled`);
    //             }
    //             await handler(depName, config);
    //         }
    //     }
    // }
}
