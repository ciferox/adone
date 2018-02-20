const {
    application,
    collection,
    is,
    event: { AsyncEmitter },
    netron: { Context, Public },
    omnitron: { STATUS },
    std,
    error
} = adone;

const SERVICE_APP_PATH = std.path.join(__dirname, "service_application.js");

const PROCESS_STATUS = {
    NULL: 0,
    SPAWNING: 1,
    ALIVE: 2,
    KILLING: 3
};

@Context()
export default class ServiceMaintainer extends AsyncEmitter {
    constructor(manager, group) {
        super();
        this.manager = manager;
        this.group = group;
        this.procStatus = PROCESS_STATUS.NULL;
        this.pid = null;
        this.iServiceApp = null;
        this._awaiters = new collection.TimedoutMap(adone.math.max([this.manager.options.startTimeout, this.manager.options.stopTimeout]));
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
                this.pid = null;
                this.procStatus = PROCESS_STATUS.NULL;
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
                adone.logInfo(`Service '${data.name}' started`);
                break;
            case application.STATE.UNINITIALIZED:
                await this.setServiceStatus(data.name, STATUS.INACTIVE);
                adone.logInfo(`Service '${data.name}' successfully stopped`);
                break;
            case application.STATE.FAILED:
                await this.setServiceStatus(data.name, STATUS.INACTIVE);
                adone.logError(`Service '${data.name}' stopped unsuccessfully`);
                adone.logError(data.error);
                break;
        }

        const awaiter = this._awaiters.get(data.name);
        if (!is.undefined(awaiter)) {
            if (awaiter(data)) {
                this._awaiters.delete(data.name);
            }
        }

        this.emitParallel("service", data);
    }

    @Public()
    getPid() {
        return this.pid;
    }

    @Public()
    getGroup() {
        return this.group;
    }

    @Public()
    getServiceConfiguration(name) {
        return this.manager.parent.db.getServiceConfiguration(name);
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
            throw new error.NotAllowed(`Service '${name}' is not in group '${this.group}'`);
        }
        if (serviceData.status === STATUS.DISABLED) {
            throw new error.IllegalState("Service is disabled");
        } else if (serviceData.status === STATUS.INACTIVE) {
            const onError = async (reject) => {
                await this.setServiceStatus(name, STATUS.INACTIVE);
                adone.logError(`Unsuccessful attempt to start service '${serviceData.name}':`);
                const err = new error.Timeout("Timeout occured");
                adone.logError(err);
                reject(err);
            };

            await this.setServiceStatus(name, STATUS.STARTING);
            await this.spawn();
            if (this.procStatus === PROCESS_STATUS.SPAWNING) {
                await new Promise((resolve, reject) => {
                    const onProcess = (data) => {
                        switch (data.status) {
                            case application.STATE.INITIALIZED:
                                this.removeListener("process", onProcess);
                                resolve();
                                break;
                            case application.STATE.FAILED:
                                this.removeListener("process", onProcess);
                                onError(reject);
                                break;
                        }
                    };
                    this.on("process", onProcess);
                });
            }
            await this.iServiceApp.loadService({
                name: serviceData.name,
                description: serviceData.description,
                path: serviceData.mainPath
            });

            return new Promise((resolve, reject) => {
                this._awaiters.set(name,
                    (data) => {
                        let err;
                        switch (data.status) {
                            case application.STATE.CONFIGURED:
                                return false;
                            case application.STATE.INITIALIZED:
                                resolve();
                                return true;
                            case application.STATE.FAILED:
                                err = data.error;
                                break;
                            default:
                                err = new error.IllegalState(`Service status: ${data.status}`);
                        }

                        adone.logError(`Unsuccessful attempt to start service '${serviceData.name}':`);
                        adone.logError(err);
                        reject(err);
                        return true;
                    },
                    () => onError(reject),
                    this.manager.options.startTimeout
                );
            });
        } else {
            throw new error.IllegalState(`Service status: ${serviceData.status}`);
        }
    }

    async stopService(name) {
        const serviceData = await this.manager.services.get(name);
        if (serviceData.group !== this.group) {
            throw new error.NotAllowed(`Service '${name}' is not in group '${this.group}'`);
        }
        if (serviceData.status === STATUS.DISABLED) {
            throw new error.IllegalState("Service is disabled");
        } else if (serviceData.status === STATUS.ACTIVE) {
            await this.setServiceStatus(name, STATUS.STOPPING);
            await this.iServiceApp.unloadService(serviceData.name);

            return new Promise((resolve, reject) => {
                this._awaiters.set(name,
                    (result) => {
                        let err;
                        switch (result.status) {
                            case application.STATE.UNINITIALIZED:
                                return resolve();
                            case application.STATE.FAILED:
                                err = result.error;
                                break;
                            default:
                                err = new error.IllegalState(`Service status: ${result.status}`);
                        }
                        adone.logError(`Unsuccessful attempt to stop service '${serviceData.name}':`);
                        adone.logError(err);
                        reject(err);
                        return true;
                    },
                    async () => {
                        // Need additional verification
                        await this.setServiceStatus(name, STATUS.INACTIVE); // ???
                        adone.logError(`Unsuccessful attempt to stop service '${serviceData.name}':`);
                        const err = new error.Timeout("Timeout occured");
                        adone.logError(err);
                        reject(err);
                    },
                    this.manager.options.stopTimeout
                );
            });
        } else {
            throw new error.IllegalState(`Service status: ${serviceData.status}`);
        }
    }

    async setServiceStatus(name, status) {
        const serviceData = await this.manager.services.get(name);
        serviceData.status = status;
        await this.manager.services.set(name, serviceData);
    }

    spawn() {
        if (this.procStatus === PROCESS_STATUS.NULL) {
            this.procStatus = PROCESS_STATUS.SPAWNING;
            return new Promise((resolve, reject) => {
                const stdout = std.fs.openSync(std.path.join(adone.realm.config.omnitron.logsPath, `${this.group}.log`), "a");
                const stderr = std.fs.openSync(std.path.join(adone.realm.config.omnitron.logsPath, `${this.group}-err.log`), "a");

                const child = std.child_process.spawn(process.execPath, [SERVICE_APP_PATH], {
                    detached: true,
                    cwd: process.cwd(),
                    env: Object.assign({}, process.env, {
                        OMNITRON2_SERVICE_GROUP: this.group
                    }),
                    stdio: ["ignore", stdout, stderr]
                });
                child.unref();
                child.once("error", (err) => {
                    this.procStatus = PROCESS_STATUS.NULL;
                    reject(err);
                });

                const onExit = (code) => {
                    if (code !== 0) {
                        this.procStatus = PROCESS_STATUS.NULL;
                        reject(new Error(`Process exited with error code: ${code}`));
                    }
                };
                child.once("exit", onExit);

                const onInitialized = (data) => {
                    if (data.status === application.STATE.INITIALIZED) {
                        this.pid = child.pid;
                        this.procStatus = PROCESS_STATUS.ALIVE;
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

    kill() {
        if (this.procStatus === PROCESS_STATUS.ALIVE && is.number(this.pid)) {
            process.kill(this.pid);
            this.procStatus = PROCESS_STATUS.KILLING;

            return new Promise((resolve) => {
                const onProcess = (data) => {
                    if ([application.STATE.UNINITIALIZED, application.STATE.FAILED].includes(data.status)) {
                        this.removeListener("process", onProcess);
                        this.pid = null;
                        this.procStatus = PROCESS_STATUS.NULL;
                        resolve(data);
                    }
                };
                this.on("process", onProcess);
            });
        }
    }
}
