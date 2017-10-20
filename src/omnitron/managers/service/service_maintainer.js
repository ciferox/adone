const {
    application,
    collection,
    is,
    event: { AsyncEmitter },
    netron: { Context, Public },
    omnitron: { STATUS },
    std,
    system: { process: { exec } },
    x
} = adone;

const SERVICE_APP_PATH = std.path.join(__dirname, "service_application.js");

@Context()
export default class ServiceMaintainer extends AsyncEmitter {
    constructor(manager, group) {
        super();
        this.manager = manager;
        this.group = group;
        this.process = null;
        this.iServiceApp = null;
        this._serviceAwaiters = new collection.TimedoutMap(10000);
        this.restarts = 0;
        this.maxRestarts = 3;
    }

    @Public({
        description: "Links application instance to maintainer"
    })
    link(iServiceApp) {
        this.iServiceApp = iServiceApp;
    }

    @Public({
        description: "Notifies maintainer about application status"
    })
    async notifyStatus(data) {
        this.emitParallel("process", data);
    }

    @Public({
        description: "Notifies maintainer about service status"
    })
    async notifyServiceStatus(data) {
        switch (data.status) {
            case application.STATE.INITIALIZED:
                await this.setServiceStatus(data.name, STATUS.ACTIVE);
                break;
            case application.STATE.UNINITIALIZED:
                await this.setServiceStatus(data.name, STATUS.INACTIVE);
        }

        if (this._serviceAwaiters.has(data.name)) {
            const awaiter = this._removeAwaiter(data.name);
            if (is.function(awaiter)) {
                awaiter(data);
            }
        }

        this.emitParallel("service", data);
    }

    async startService(name) {
        const serviceData = await this.manager.services.get(name);
        if (serviceData.group !== this.group) {
            throw new x.NotAllowed(`Service '${name}' is not in group '${this.group}'`);
        }
        if (serviceData.status === STATUS.DISABLED) {
            throw new x.IllegalState("Service is disabled");
        } else if (serviceData.status === STATUS.INACTIVE) {
            await this.setServiceStatus(name, STATUS.STARTING);
            if (is.null(this.process)) {
                await this.spawn();
            }
            await this.iServiceApp.loadService(serviceData);

            return new Promise((resolve, reject) => {
                this._serviceAwaiters.set(name,
                    (result) => {
                        result.status === application.STATE.INITIALIZED ? resolve() : reject(new x.IllegalState(`Service status: ${result.status}`));
                    },
                    async () => {
                        await this.setServiceStatus(name, STATUS.INACTIVE);
                        reject(new x.Timeout("Timeout occured while waiting for service to start"));
                    }
                );
            });
        } else {
            throw new x.IllegalState(`Service status: ${serviceData.status}`);
        }
    }

    async stopService(name) {
        const serviceData = await this.manager.services.get(name);
        if (serviceData.group !== this.group) {
            throw new x.NotAllowed(`Service '${name}' is not in group '${this.group}'`);
        }
        if (serviceData.status === STATUS.DISABLED) {
            throw new x.IllegalState("Service is disabled");
        } else if (serviceData.status === STATUS.ACTIVE) {
            await this.setServiceStatus(name, STATUS.STOPPING);
            await this.iServiceApp.unloadService(serviceData.name);

            return new Promise((resolve, reject) => {
                this._serviceAwaiters.set(name,
                    (result) => {
                        result.status === application.STATE.UNINITIALIZED ? resolve() : reject(new x.IllegalState(`Service status: ${result.status}`));
                    },
                    async () => {
                        // Need additional verification
                        await this.setServiceStatus(name, STATUS.INACTIVE); // ???
                        reject(new x.Timeout("Timeout occured while waiting for service to stop"));
                    }
                );
            });
        } else {
            throw new x.IllegalState(`Service status: ${serviceData.status}`);
        }
    }

    async setServiceStatus(name, status) {
        const serviceData = await this.manager.services.get(name);
        serviceData.status = status;
        await this.manager.services.set(name, serviceData);
    }

    async spawn() {
        if (is.null(this.process)) {
            return new Promise((resolve, reject) => {
                const onInitialized = (data) => {
                    if (data.status === application.STATE.INITIALIZED) {
                        this.removeListener("process", onInitialized);
                        resolve();
                    }
                };
                this.on("process", onInitialized);

                const serviceProcess = exec("node", [SERVICE_APP_PATH], {
                    stdout: std.fs.openSync(adone.realm.config.omnitron.logFilePath, "a"),
                    stderr: std.fs.openSync(adone.realm.config.omnitron.errorLogFilePath, "a"),
                    env: {
                        OMNITRON_PORT: this.manager.parent.subsystem("netron").getServicePort(),
                        OMNITRON_SERVICE_GROUP: this.group
                    }
                });

                // serviceProcess.then((result) => {
                //     if (result.code !== 0) {
                //         this.process = null;
                //         if (++this.restarts <= this.maxRestarts) {
                //             this.start();
                //         }
                //     }
                // });

                this.process = serviceProcess;
            });
        }
    }

    async kill() {
        if (!is.null(this.process)) {
            this.process.kill("SIGTERM");
            const result = await this.process;
            return result.code;
        }
    }

    isRunning() {
        return !is.null(this.process);
    }

    _removeAwaiter(serviceName) {
        const awaiter = this._serviceAwaiters.get(serviceName);
        this._serviceAwaiters.delete(serviceName);
        return awaiter;
    }
}
