import "adone";

const {
    is,
    application,
    netron: { Context, Public },
    runtime
} = adone;

@Context()
class ServiceApplication extends application.Application {
    async configure() {
        this.omnitronPort = process.env.OMNITRON_PORT;
        this.group = process.env.OMNITRON_SERVICE_GROUP;

        this.exitOnSignal("SIGTERM");

        this.peer = await runtime.netron.connect({
            port: this.omnitronPort
        });

        // Waiting for omnitron context is available.
        await this.peer.waitForContext("omnitron");
        this.iOmnitron = this.peer.getInterface("omnitron");
        this.iMaintainer = await this.iOmnitron.getMaintainer(this.group);
        await this.iMaintainer.link(this);

        return this.iMaintainer.notifyStatus({
            pid: process.pid,
            status: adone.application.STATE.CONFIGURED
        });
    }

    async initialize() {
        return this.iMaintainer.notifyStatus({
            pid: process.pid,
            status: adone.application.STATE.INITIALIZED
        });
    }

    async uninitialize() {
        // Uninitialize subsystems first

        const subsystems = this.getSubsystems();
        for (const sysInfo of subsystems) {
            try {
                await this.uninitializeSubsystem(sysInfo.name); // eslint-disable-line
            } catch (error) {
                // eslint-disable-next-line
                await this.iMaintainer.notifyServiceStatus({
                    name: sysInfo.name,
                    status: application.STATE.FAILED,
                    error
                });
            }
        }

        await this.iMaintainer.notifyStatus({
            pid: process.pid,
            status: application.STATE.UNINITIALIZED
        });

        if (!is.null(this.peer)) {
            try {
                await this.peer.disconnect();
            } catch (err) {
                //
            }
        }
    }

    async exception(error) {
        if (!is.null(this.peer)) {
            await this.iMaintainer.notifyStatus({
                pid: process.pid,
                status: adone.application.STATE.FAILED,
                error
            });
            await this.peer.disconnect();
        }
    }

    @Public()
    async loadService(serviceData) {
        if (this.hasSubsystem(serviceData.name)) {
            throw new adone.x.Exists(`Service ${serviceData.name} already loaded`);
        }

        const mod = require(serviceData.mainPath);
        if (!mod.__esModule) {
            throw new adone.x.NotValid("Service module should be es6-module");
        }
        const ServiceClass = mod.default;
        if (!is.class(ServiceClass)) {
            throw new adone.x.NotValid("Service should be a class");
        }

        const subsystem = new ServiceClass({
            peer: this.peer,
            config: serviceData
        });
        if (!(subsystem instanceof adone.omnitron.Service)) {
            throw new adone.x.NotValid("The class of service should inherit the class 'adone.omnitron.BaseService'");
        }

        this.addSubsystem({
            name: serviceData.name,
            description: serviceData.description,
            group: this.group,
            subsystem
        });

        // It is not necessary to wait for the subsystems to be configured and initialized, since it will notify about it.
        process.nextTick(async () => {
            const deleteAndNotify = (error) => {
                this.deleteSubsystem(serviceData.name, true);
                return this.iMaintainer.notifyServiceStatus({
                    name: serviceData.name,
                    status: application.STATE.FAILED,
                    error
                });
            };

            try {
                await this.configureSubsystem(serviceData.name);
            } catch (err) {
                return deleteAndNotify(err);
            }
            try {
                await this.initializeSubsystem(serviceData.name);
            } catch (err) {
                return deleteAndNotify(err);
            }
        });
    }

    @Public()
    async unloadService(name) {
        if (!this.hasSubsystem(name)) {
            throw new adone.x.NotExists(`Service ${name} not loaded`);
        }

        const sysInfo = this.getSubsystemInfo(name);
        if (sysInfo.state === application.STATE.INITIALIZED) {
            process.nextTick(async () => {
                try {
                    await this.uninitializeSubsystem(name);
                } catch (error) {
                    this.iMaintainer.notifyServiceStatus({
                        name,
                        status: application.STATE.FAILED,
                        error
                    });
                } finally {
                    this.deleteSubsystem(name, true);
                }
            });
        } else if (sysInfo.state === application.STATE.UNINITIALIZING) {
            throw new adone.x.IllegalState(`Serivce '${name}' is being uninitialized`);
        } else {
            throw new adone.x.NotAllowed(`Service '${name}' is not possible to stop now`);
        }
    }
}

application.run(ServiceApplication);
