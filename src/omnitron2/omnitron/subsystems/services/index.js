const {
    application,
    error,
    is,
    fs,
    omnitron: { STATUS }
} = adone;

const SERVICES_PATH = adone.realm.config.omnitron.SERVICES_PATH;

const api = adone.lazify({
    ServiceMaintainer: "./service_maintainer"
}, exports, require);

@application.DSubsystem({
    dependencies: [
        "netron",
        "database"
    ]
})
export default class Services extends application.Subsystem {
    constructor(options) {
        super(options);

        this.services = null;
        this.groupMaintainers = new Map();
    }

    async configure() {
        adone.logInfo("Services subsystem configured");
    }

    async initialize() {
    //     this.config = await this.root.db.getConfiguration();
    //     this.options = Object.assign({
    //         startTimeout: 10000,
    //         stopTimeout: 10000
    //     }, await this.config.get("service"));
    
    //     this.services = await this.parent.db.getMetaValuable("service");

    //     const VALID_STATUSES = [STATUS.DISABLED, STATUS.INACTIVE];

    //     const serviceGroups = await this.enumerateByGroup();
    //     for (const [group, services] of Object.entries(serviceGroups)) {
    //         const maintainer = await this.getMaintainer(group); // eslint-disable-line
    //         for (const serviceData of services) {
    //             // Check service status and fix if necessary
    //             if (!VALID_STATUSES.includes(serviceData.status)) {
    //                 serviceData.status = STATUS.INACTIVE;
    //                 await this.services.set(serviceData.name, serviceData); // eslint-disable-line
    //             }
    //             if (serviceData.status === STATUS.INACTIVE) {
    //                 maintainer.startService(serviceData.name).catch((err) => {
    //                     adone.logError(err);
    //                 });
    //             }
    //         }
    //     }

        adone.logInfo("Services subsystem initialized");
    }

    async uninitialize() {
    //     const promises = [];
    //     for (const maintainer of this.groupMaintainers.values()) {
    //         promises.push(maintainer.kill());
    //     }

    //     await Promise.all(promises);

    //     this.groupMaintainers.clear();

        adone.logInfo("Services subsystem uninitialized");
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

            const maintainer = this.groupMaintainers.get(serviceData.group);
            let pid;
            if (is.undefined(maintainer)) {
                pid = "";
            } else {
                pid = maintainer.getPid() || "";
            }

            services.push({
                pid,
                ...serviceData
            });
        }

        if (is.string(status)) {
            services = services.filter((s) => status === s.status);
        } else if (is.array(status) && status.length > 0) {
            services = services.filter((s) => status.includes(s.status));
        }

        return services;
    }

    async checkService(name) {
        const services = await this.enumerate({
            name
        });
        if (services.length === 0) {
            throw new adone.error.Unknown(`Unknown service: ${name}`);
        }

        if (services[0].status === adone.omnitron.STATUS.INVALID) {
            throw new adone.error.NotValid(`Service '${name}' is invalid`);
        }

        return services[0];
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

    async enableService(name) {
        const serviceData = await this.services.get(name);
        if (serviceData.status === STATUS.DISABLED) {
            serviceData.status = STATUS.INACTIVE;
            return this.services.set(name, serviceData);
        }
        throw new error.IllegalState("Service is not disabled");
    }

    async disableService(name) {
        const serviceData = await this.services.get(name);
        if (serviceData.status !== STATUS.DISABLED) {
            if (serviceData.status === STATUS.ACTIVE) {
                await this.stop(name);
            } else if (serviceData.status !== STATUS.INACTIVE) {
                throw new error.IllegalState(`Cannot disable service with '${serviceData.status}' status`);
            }
            serviceData.status = STATUS.DISABLED;
            return this.services.set(name, serviceData);
        }
    }

    async startService(name) {
        const serviceData = await this.services.get(name);
        const maintainer = await this.getMaintainer(serviceData.group);
        return maintainer.startService(name);
    }

    async stopService(name) {
        const serviceData = await this.services.get(name);
        const maintainer = await this.getMaintainer(serviceData.group);
        return maintainer.stopService(name);
    }

    async configureService(name, { group } = {}) {
        const serviceData = await this.services.get(name);

        if (![STATUS.DISABLED, STATUS.INACTIVE].includes(serviceData.status)) {
            throw new error.NotAllowed("Cannot configure active service");
        }

        if (is.string(group)) {
            const inGroupServices = await this.enumerateByGroup(serviceData.group);
            if (inGroupServices.length === 1) {
                const maintainer = await this.getMaintainer(serviceData.group);
                maintainer.group = group;
                this.groupMaintainers.delete(serviceData.group);
                this.groupMaintainers.set(group, maintainer);
            }
            serviceData.group = group;
        }

        await this.services.set(name, serviceData);
    }

    async getMaintainer(group, onlyExist = false) {
        let maintainer = this.groupMaintainers.get(group);
        if (is.undefined(maintainer)) {
            if (onlyExist) {
                const inGroupServices = await this.enumerateByGroup(group);
                if (inGroupServices.length === 0) {
                    throw new error.Unknown(`Unknown group: ${group}`);
                }
            }
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
    //                 throw new error.NotAllowed("Only one context of service can be default");
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
    //         adone.logInfo(`Service '${serviceName}' attached`);
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
    //         adone.logInfo(`Service '${service.name}' detached`);
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
    //                     throw new error.Unknown(`Unknown service '${depName}' in dependency list of '${service.name}' service`);
    //                 }
    //                 config = depConfig;
    //             } else {
    //                 config = depService.config;
    //             }
    //             if (checkDisabled && config.status === DISABLED) {
    //                 throw new error.IllegalState(`Dependent service '${depName}' is disabled`);
    //             }
    //             await handler(depName, config);
    //         }
    //     }
    // }
}
