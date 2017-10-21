const {
    application,
    x,
    is,
    fs,
    std,
    omnitron: { STATUS },
    vault
} = adone;

const SERVICES_PATH = adone.realm.config.omnitron.servicesPath;

const api = adone.lazify({
    ServiceMaintainer: "./service_maintainer"
}, exports, require);

export default class ServiceManager extends application.Subsystem {
    async configure() {
        this.meta = null;
        this.services = null;
        this.serviceMaintainers = new Map();
        this.groupMaintainers = new Map();
    }

    async initialize() {
        this.meta = await this.parent.db.getServicesValuable();
        this.services = vault.slice(this.meta, "service");

        const VALID_STATUSES = [STATUS.DISABLED, STATUS.INACTIVE];

        const serviceGroups = await this.enumerateByGroup();
        for (const [group, services] of Object.entries(serviceGroups)) {
            const maintainer = this.getMaintainerForGroup(group); // eslint-disable-line
            for (const serviceData of services) {
                // Check service status and fix if necessary
                if (!VALID_STATUSES.includes(serviceData.status)) {
                    serviceData.status = STATUS.INACTIVE;
                    await this.services.set(serviceData.name, serviceData); // eslint-disable-line
                }
                if (serviceData.status === STATUS.INACTIVE) {
                    maintainer.startService(serviceData.name).catch((err) => {
                        adone.error(err);
                    }).then(() => {
                        adone.info(`Service '${serviceData.name}' has been started`);
                    });
                }
                this.serviceMaintainers.set(serviceData.name, maintainer);
            }
        }
    }

    async uninitialize() {
        // for (const maintainer of this.groupMaintainers.values()) {
        //     // await maintainer.kill(); // eslint-disable-line
        // }

        this.groupMaintainers.clear();
        this.serviceMaintainers.clear();
        this.services = null;
    }

    async enumerate({ name, status } = {}) {
        let services = [];
        if (is.string(name)) {
            name = [name];
        }

        let existingNames;

        if (await fs.exists(SERVICES_PATH)) {
            existingNames = await fs.readdir(SERVICES_PATH);
        } else {
            existingNames = [];
        }

        const names = this.services.keys().filter((is.array(name) && name.length > 0) ? (name) => name.includes(name) : adone.truly);

        for (const svcName of names) {
            const serviceData = await this.services.get(svcName); // eslint-disable-line
            // eslint-disable-next-line
            if (!existingNames.includes(svcName) || !(await fs.exists(serviceData.mainPath))) {
                serviceData.status = STATUS.INVALID;
                await this.services.set(svcName, serviceData); // eslint-disable-line
            }
            services.push(serviceData);
        }

        if (is.string(status)) {
            services = services.filter((s) => status === s.status);
        } else if (is.array(status) && status.length > 0) {
            services = services.filter((s) => status.includes(s.status));
        }

        return services;
    }

    async enumerateByGroup(group) {
        const services = await this.enumerate();

        if (is.string(group)) {
            const result = [];
            for (const serviceData of services) {
                if (serviceData.group === group) {
                    result.push(serviceData);
                }
            }

            return result;
        }

        const result = {};

        for (const service of services) {
            let list;
            if (is.array(result[service.group])) {
                list = result[service.group];
            } else {
                list = [];
                result[service.group] = list;
            }
            list.push(service);
        }

        return result;
    }

    async enumerateGroups() {
        const services = await this.enumerate();
        const result = [];

        for (const service of services) {
            if (!result.includes(service.group)) {
                result.push(service.group);
            }
        }

        return result;
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

    async setServiceGroup(name, group) {
        const serviceData = await this.services.get(name);
        serviceData.group = group;
        await this.services.set(name, serviceData);
    }

    async enable(name) {
        const serviceData = await this.services.get(name);
        if (serviceData.status === STATUS.DISABLED) {
            serviceData.status = STATUS.INACTIVE;
            return this.services.set(name, serviceData);
        }
        throw new x.IllegalState("Service is not disabled");
    }

    async disable(name) {
        const serviceData = await this.services.get(name);
        if (serviceData.status !== STATUS.DISABLED) {
            if (serviceData.status === STATUS.ACTIVE) {
                await this.stop(name);
            } else if (serviceData.status !== STATUS.INACTIVE) {
                throw new x.IllegalState(`Cannot disable service with '${serviceData.status}' status`);
            }
            serviceData.status = STATUS.DISABLED;
            return this.services.set(name, serviceData);
        }
    }

    async start(name) {
        const maintainer = await this.getMaintainerForService(name);
        return maintainer.startService(name);
    }

    async stop(name) {
        const maintainer = await this.getMaintainerForService(name);
        return maintainer.stopService(name);
    }

    async getMaintainerForService(name) {
        let maintainer = this.serviceMaintainers.get(name);
        if (is.undefined(maintainer)) {
            const serviceData = await this.services.get(name);
            maintainer = new api.ServiceMaintainer(this, serviceData.group);
            this.groupMaintainers.set(serviceData.group, maintainer);
            this.serviceMaintainers.set(serviceData.name, maintainer);
        }

        return maintainer;
    }

    getMaintainerForGroup(group) {
        let maintainer = this.groupMaintainers.get(group);
        if (is.undefined(maintainer)) {
            maintainer = new api.ServiceMaintainer(this, group);
            this.groupMaintainers.set(group, maintainer);
        }
        return maintainer;
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
