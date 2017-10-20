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
        this.exitOnSignal("SIGTERM");

        return this.iMaintainer.notifyStatus({
            pid: process.pid,
            status: adone.application.STATE.INITIALIZED
        });
    }

    async uninitialize() {
        // Uninitialize subsystems first
        await this.uninitializeSubsystems();

        if (!is.null(this.peer)) {
            await this.peer.disconnect();
        }

        return this.iMaintainer.notifyStatus({
            pid: process.pid,
            status: adone.application.STATE.UNINITIALIZED
        });
    }

    exception(err) {
        return this.iMaintainer.notifyStatus({
            pid: process.pid,
            status: adone.application.STATE.FAILED,
            err
        });
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
        this.configureSubsystem(serviceData.name).then(() => {
            this.initializeSubsystem(serviceData.name);
        });
    }

    @Public()
    async unloadService(name) {
        if (!this.hasSubsystem(name)) {
            throw new adone.x.NotExists(`Service ${name} not loaded`);
        }

        const sysInfo = this.getSubsystemInfo(name);
        if (sysInfo.state === application.STATE.INITIALIZED) {
            this.uninitializeSubsystem(name).then(() => {
                this.deleteSubsystem(name);
            });
        } else if (sysInfo.state === application.STATE.UNINITIALIZING) {
            throw new adone.x.IllegalState(`Serivce '${name}' is being uninitialized`);
        } else {
            throw new adone.x.NotAllowed(`Service '${name}' is not possible to stop now`);
        }
    }
}

application.run(ServiceApplication);
