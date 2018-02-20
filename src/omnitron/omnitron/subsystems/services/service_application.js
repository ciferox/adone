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
        this.group = process.env.OMNITRON_SERVICE_GROUP;

        this.exitOnSignal("SIGTERM");

        this.peer = await runtime.netron.connect({
            port: adone.omnitron.port
        });

        // Waiting for omnitron context is available.
        await this.peer.waitForContext("omnitron");
        this.iOmnitron = this.peer.getInterface("omnitron");
        this.iMaintainer = await this.iOmnitron.getMaintainer(this.group);
        await this.iMaintainer.link(this);

        await this.iMaintainer.notifyStatus({
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
            } finally {
                this.peer = null;
            }
        }
    }

    async error(error) {
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
    async loadService({ name, description, path } = {}) {
        // It's important that application should be fully initialized before any service can be loaded.
        if (this.state <= application.STATE.INITIALIZED) {
            await this.waitForState(application.STATE.INITIALIZED);
        }
        if (this.hasSubsystem(name)) {
            throw new adone.error.Exists(`Service ${name} already loaded`);
        }

        const mod = require(path);
        if (!mod.__esModule) {
            throw new adone.error.NotValid("Service module should be es6-module");
        }
        const ServiceClass = mod.default;
        if (!is.class(ServiceClass)) {
            throw new adone.error.NotValid("Service should be a class");
        }

        const subsystem = new ServiceClass({ name });
        subsystem[Symbol.for("omnitron.Service#peer")] = this.peer;

        if (!(subsystem instanceof adone.omnitron.Service)) {
            throw new adone.error.NotValid("The class of service should inherit the class 'adone.omnitron.BaseService'");
        }

        this.addSubsystem({
            name,
            description,
            group: "service",
            subsystem
        });

        // It is not necessary to wait for the subsystem to be configured and initialized, since it will notify about it.
        process.nextTick(async () => {
            const deleteAndNotify = async (error) => {
                this.deleteSubsystem(name, true);
                await this.iMaintainer.notifyServiceStatus({
                    name,
                    status: application.STATE.FAILED,
                    error
                });
                if (!this.hasSubsystems()) {
                    this.exit(1);
                }
            };

            try {
                await this.configureSubsystem(name);
            } catch (err) {
                return deleteAndNotify(err);
            }
            try {
                await this.initializeSubsystem(name);
            } catch (err) {
                return deleteAndNotify(err);
            }
        });
    }

    @Public()
    async unloadService(name) {
        if (!this.hasSubsystem(name)) {
            throw new adone.error.NotExists(`Service ${name} not loaded`);
        }

        const service = this.getSubsystem(name);
        if (service.state === application.STATE.INITIALIZED) {
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
                    if (!this.hasSubsystems()) {
                        this.exit(0);
                    }
                }
            });
        } else if (service.state === application.STATE.UNINITIALIZING) {
            throw new adone.error.IllegalState(`Serivce '${name}' is being uninitialized`);
        } else {
            throw new adone.error.IllegalState(`Service '${name}' is in non stopable state: ${application.humanizeState(service.state)}`);
        }
    }
}

application.run(ServiceApplication);
