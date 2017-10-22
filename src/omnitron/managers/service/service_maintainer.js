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
        this.pid = null;
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
        switch (data.status) {
            case application.STATE.UNINITIALIZED:
            case application.STATE.FAILED:
                this.iServiceApp = null;
                break;
        }
        this.emitParallel("process", data);
    }

    @Public({
        description: "Notifies maintainer about service status"
    })
    async notifyServiceStatus(data) {
        switch (data.status) {
            case application.STATE.INITIALIZED:
                await this.setServiceStatus(data.name, STATUS.ACTIVE);
                adone.info(`Service '${data.name}' started`);
                break;
            case application.STATE.UNINITIALIZED:
                adone.info(`Service '${data.name}' successfully stopped`);
                await this.setServiceStatus(data.name, STATUS.INACTIVE);
                break;
            case application.STATE.FAILED:
                adone.error(`Service '${data.name}' stopped unsuccessfully`);
                adone.error(data.error);
                await this.setServiceStatus(data.name, STATUS.INACTIVE);
                break;
        }

        if (this._serviceAwaiters.has(data.name)) {
            const awaiter = this._removeAwaiter(data.name);
            is.function(awaiter) && awaiter(data);
        }

        this.emitParallel("service", data);
    }

    @Public()
    getPid() {
        return this.pid;
    }

    onProcessStopped() {
        return new Promise((resolve) => {
            const onProcess = (data) => {
                if ([application.STATE.UNINITIALIZED, application.STATE.FAILED].includes(data.status)) {
                    this.removeListener("process", onProcess);
                    resolve(data);
                }
            };
            this.on("process", onProcess);
        });
    }

    onServiceStopped(name) {
        return new Promise((resolve) => {
            const onService = (data) => {
                if (data.name === name) {
                    if ([application.STATE.UNINITIALIZED, application.STATE.FAILED].includes(data.status)) {
                        this.removeListener("service", onService);
                        resolve(data);
                    }
                }
            };
            this.on("service", onService);
        });
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
            if (is.null(this.iServiceApp)) {
                await this.spawn();
            }
            await this.iServiceApp.loadService(serviceData);

            return new Promise((resolve, reject) => {
                this._serviceAwaiters.set(name,
                    (result) => {
                        let err;
                        switch (result.status) {
                            case application.STATE.INITIALIZED:
                                return resolve();
                            case application.STATE.FAILED:
                                err = result.error;
                                break;
                            default:
                                err = new x.IllegalState(`Service status: ${result.status}`);
                        }

                        adone.error(`Unsuccessful attempt to start service '${serviceData.name}':`);
                        adone.error(err);
                        reject(err);
                    },
                    async () => {
                        await this.setServiceStatus(name, STATUS.INACTIVE);
                        adone.error(`Unsuccessful attempt to start service '${serviceData.name}':`);
                        const err = new x.Timeout("Timeout occured");
                        adone.error(err);
                        reject(err);
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
                        let err;
                        switch (result.status) {
                            case application.STATE.UNINITIALIZED:
                                return resolve();
                            case application.STATE.FAILED:
                                err = result.error;
                                break;
                            default:
                                err = new x.IllegalState(`Service status: ${result.status}`);
                        }
                        adone.error(`Unsuccessful attempt to stop service '${serviceData.name}':`);
                        adone.error(err);
                        reject(err);
                    },
                    async () => {
                        // Need additional verification
                        await this.setServiceStatus(name, STATUS.INACTIVE); // ???
                        adone.error(`Unsuccessful attempt to stop service '${serviceData.name}':`);
                        const err = new x.Timeout("Timeout occured");
                        adone.error(err);
                        reject(err);
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
        if (is.null(this.iServiceApp)) {
            return new Promise((resolve, reject) => {
                const stdout = std.fs.openSync(adone.realm.config.omnitron.logFilePath, "a");
                const stderr = std.fs.openSync(adone.realm.config.omnitron.errorLogFilePath, "a");

                const child = std.child_process.spawn(process.execPath, [SERVICE_APP_PATH], {
                    detached: true,
                    cwd: process.cwd(),
                    env: Object.assign(process.env, {
                        OMNITRON_PORT: this.manager.parent.subsystem("netron").getServicePort(),
                        OMNITRON_SERVICE_GROUP: this.group
                    }),
                    stdio: ["ipc", stdout, stderr]
                });
                child.unref();
                child.once("error", reject);

                const onExit = (code) => {
                    if (code !== 0) {
                        reject(new Error(`Process exited with error code: ${code}`));
                    }
                };
                child.once("exit", onExit);

                const onInitialized = (data) => {
                    if (data.status === application.STATE.INITIALIZED) {
                        this.pid = child.pid;
                        child.disconnect();
                        child.removeListener("exit", onExit);
                        child.removeListener("error", reject);
                        this.removeListener("process", onInitialized);
                        resolve();
                    }
                };
                this.on("process", onInitialized);
            });
        }
    }

    async kill() {
        if (!is.null(this.iServiceApp)) {
            process.kill(this.pid);
            this.pid = null;

            return this.onProcessStopped();
        }
    }

    _removeAwaiter(serviceName) {
        const awaiter = this._serviceAwaiters.get(serviceName);
        this._serviceAwaiters.delete(serviceName);
        return awaiter;
    }
}
