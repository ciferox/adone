const { is } = adone;
const { STATUSES } = adone.omnitron.const;

export default class Dispatcher {
    constructor(app, { noisily = true, configManager = null, omnitron = null } = {}) {
        this.app = app;
        this.noisily = noisily;
        this.configManager = configManager;
        this.omnitron = omnitron;
        this.netron = null;
        this.peer = null;
        this.descriptors = {
            stodut: null,
            stderr: null
        };
    }

    config() {
        if (is.null(this.configManager)) {
            this.configManager = new adone.omnitron.ConfigManager(this.app);
        }
        return this.configManager.load();
    }

    async connectLocal(options, forceStart = true, _secondTime = false) {
        if (is.null(this.netron)) {
            const omnitronConfig = await this.config();
            const localGate = omnitronConfig.getGate({ id: (is.plainObject(options) && is.string(options.gateId) ? options.gateId : "local") });
            if (is.nil(localGate)) {
                throw new adone.x.NotExists("Configuration for gate 'local' is not found");
            }
            if (localGate.status === adone.omnitron.const.DISABLED) {
                throw new adone.x.IllegalState("Gate 'local' is disabled");
            }
            let netron = null;
            let peer = null;
            try {
                if (is.netron(options)) {
                    netron = options;
                } else {
                    netron = new adone.netron.Netron(null, options);
                }
                peer = await netron.connect(localGate);
            } catch (err) {
                if (_secondTime) {
                    return null;
                }
                if (!forceStart) {
                    throw err;
                }

                const pid = await this.spawn();
                if (is.number(pid)) {
                    return this.connectLocal(options, forceStart, true);
                }
            }
            this.netron = netron;
            this.peer = peer;
        }
    }

    disconnect() {
        if (!is.null(this.netron)) {
            return this.netron.disconnect();
        }
    }

    spawn(spiritualWay = true) {
        const omnitronPath = adone.std.path.resolve(adone.appinstance.adoneRootPath, "lib/omnitron/index.js");
        if (spiritualWay) {
            return new Promise((resolve, reject) => {
                this.config().then((omnitronConfig) => {
                    this.descriptors.stdout = adone.std.fs.openSync(omnitronConfig.logFilePath, "a");
                    this.descriptors.stderr = adone.std.fs.openSync(omnitronConfig.errorLogFilePath, "a");
                    const child = adone.std.child_process.spawn(process.execPath || "node", [omnitronPath], {
                        detached: true,
                        cwd: process.cwd(),
                        env: Object.assign({
                            HOME: process.env.HOME || process.env.HOMEPATH
                        }, process.env),
                        stdio: ["ipc", this.descriptors.stdout, this.descriptors.stderr]
                    });
                    child.unref();
                    child.once("error", reject);
                    child.once("message", (msg) => {
                        child.removeListener("error", reject);
                        child.disconnect();
                        this.noisily && adone.log(`Omnitron successfully started (pid: ${msg.pid})`);
                        resolve(msg.pid);
                    });
                });
            });
        } else {
            let omnitron;
            if (is.null(this.omnitron)) {
                omnitron = new adone.omnitron.Omnitron();
            } else {
                omnitron = this.omnitron;
            }
            return omnitron.run({ ignoreArgs: true });
        }
    }

    async kill({ clean = false, killChildren = true } = {}) {
        const isOnline = await this.isOnline();
        if (isOnline) {
            this.netron && await this.netron.disconnect();
            this.netron = null;
            this.peer = null;
            // Can be used in test environment.
            if (is.string(this.app.config.omnitron.pidFilePath)) {
                try {
                    const pid = parseInt(adone.std.fs.readFileSync(this.app.config.omnitron.pidFilePath).toString());
                    if (killChildren) {
                        await this._killProcessChildren(pid);
                    }
                    await this._killProcess(pid, 10000); // awaiting 10 sec...
                } catch (err) {
                    this.noisily && adone.log("Omnitron is offline");
                }
            }
        } else {
            this.noisily && adone.log("Omnitron is offline");
        }

        if (!is.nil(this.descriptors.stdout)) {
            await adone.std.fs.closeAsync(this.descriptors.stdout);
            this.descriptors.stdout = null;
        }
        if (!is.nil(this.descriptors.stderr)) {
            await adone.std.fs.closeAsync(this.descriptors.stderr);
            this.descriptors.stderr = null;
        }
        if (clean) {
            await new adone.fs.Directory(this.app.config.adone.home).clean();
        }
    }

    async respawn({ options, clean = false, spiritualWay = true, killChildren = true } = {}) {
        await this.kill({ clean, killChildren });
        await this.spawn(spiritualWay);
        await this.connectLocal(options, false);
    }

    async isOnline(options, checkAttempts = 1) {
        const n = new adone.netron.Netron(null, { checkAttempts });
        let isOK = false;
        try {
            if (is.nil(options) || !options.port) {
                const omnitronConfig = await this.config();
                const localGate = omnitronConfig.getGate({ id: "local" });
                if (is.nil(localGate)) {
                    throw new adone.x.NotExists("Configuration for gate 'local' is not found");
                }
                if (localGate.status === adone.omnitron.const.DISABLED) {
                    throw new adone.x.IllegalState("Gate 'local' is disabled");
                }
                await n.connect(localGate);
                await n.disconnect();
                isOK = true;
            }
        } catch (err) {
            // adone.log(err);
        }

        return isOK;
    }

    getInterface(name) {
        return this.peer.getInterfaceByName(name);
    }

    async getService(name) {
        await this.connectLocal();
        return this.getInterface(name);
    }

    async getVersion() {
        return (await this.getService("omnitron")).version();
    }

    async ping() {
        await this.connectLocal();
        return this.netron.ping();
    }

    async uptime() {
        return (await this.getService("omnitron")).uptime();
    }

    async start(serviceName = "") {
        if (serviceName === "") {
            return this.connectLocal();
        } else {
            return (await this.getService("omnitron")).start(serviceName);
        }
    }

    async stop(serviceName = "") {
        if (serviceName === "") {
            return this.kill({ clean: false, killChildren: true });
        } else {
            return (await this.getService("omnitron")).stop(serviceName);
        }
    }

    async restart(serviceName = "") {
        if (serviceName === "") {
            return this.respawn();
        } else {
            return (await this.getService("omnitron")).restart(serviceName);
        }
    }

    async status(serviceName) {
        return (await this.getService("omnitron")).status(serviceName);
    }

    async enable(serviceName) {
        return (await this.getService("omnitron")).enable(serviceName, true);
    }

    async disable(serviceName) {
        return (await this.getService("omnitron")).enable(serviceName, false);
    }

    async list(status) {
        if (!STATUSES.includes(status)) {
            throw new adone.x.NotValid(`Not valid status: ${status}`);
        }

        return (await this.getService("omnitron")).list({
            status
        });
    }

    async gates() {
        return (await this.getService("omnitron")).gates();
    }

    async _isAlive(pid, timeout = 0) {
        try {
            let exists = true;
            const n = timeout / 100;
            if (timeout > 0) {
                for (let i = 0; i < n && exists; ++i) {
                    try {
                        process.kill(pid, 0); // check the existence
                        await adone.promise.delay(100);
                    } catch (err) {
                        exists = false;
                    }
                }
            } else {
                process.kill(pid, 0);
            }
            return exists;
        } catch (err) {
            return false;
        }
    }

    async _killProcess(pid, timeout = 0) {
        process.kill(pid);
        this.noisily && adone.log(`Sent SIGTERM to omnitron's process (PID: ${pid})`);
        let exists = await this._isAlive(pid, timeout);
        if (exists) {
            process.kill(pid, "SIGKILL");
            this.noisily && adone.log(`Sent SIGKILL to omnitron's process (PID: ${pid})`);
            exists = this._isAlive(pid, 3000); // wait 3 sec
            if (exists) {
                this.noisily && adone.error(`Process ${pid} is still running`);
            }
        }
        return exists;
    }

    async _killProcessChildren(pid) {
        const children = (await adone.metrics.system.getProcesses()).filter((x) => x.getParentPID() === pid);
        return Promise.all(children.map(async (child) => {
            await this._killProcessChildren(child.getPID());
            return this._killProcess(child.getPID());
        }));
    }
}