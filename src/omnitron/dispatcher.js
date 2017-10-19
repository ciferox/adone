const {
    is,
    x,
    std,
    netron,
    omnitron,
    runtime
} = adone;

const {
    Configuration,
    STATUSES
} = omnitron;

// NOTE: local gate always be first in list of gates in gates.json

export default class Dispatcher {
    constructor({ noisily = false, configuration = null, netronOptions = {} } = {}) {
        this.noisily = noisily;
        this._configuration = configuration;
        Object.assign(runtime.netron.options, netronOptions);

        runtime.netron.on("peer online", (peer) => {
            noisily && adone.info(`Peer '${peer.getRemoteAddress().full}' (${peer.uid}) connected`);
        }).on("peer offline", (peer) => {
            noisily && adone.info(`Peer '${peer.getRemoteAddress().full}' (${peer.uid}) disconnected`);
        });

        this.peer = null;
        this.descriptors = {
            stodut: null,
            stderr: null
        };
    }

    bind(options) {
        return runtime.netron.bind(options);
    }

    async bindGates(gates, { adapters = null } = {}) {
        if (is.plainObject(adapters)) {
            for (const [name, AdapterClass] of Object.entries(adapters)) {
                runtime.netron.registerAdapter(name, AdapterClass);
            }
        }

        for (const gate of gates) {
            // eslint-disable-next-line
            await this.bind(gate);
        }
    }

    async configuration() {
        if (is.null(this._configuration)) {
            this._configuration = new Configuration();
            await this._configuration.loadAll();
        }
        return this._configuration;
    }

    async connect(gate = null) {
        if (is.nil(gate) || is.nil(gate.port)) {
            return this.connectLocal();
        }

        this.peer = await runtime.netron.connect(gate);
        return this.peer;
    }

    async connectLocal({ forceStart = true } = {}, _counter = 0) {
        let status = 0;
        if (is.null(this.peer)) {
            const configuration = await this.configuration();
            const localGate = configuration.raw.gates[0];
            if (is.nil(localGate)) {
                throw new x.NotExists("Configuration for gate 'local' is not found");
            }

            let peer = null;
            try {
                peer = await runtime.netron.connect(localGate);
                status = _counter >= 1 ? 0 : 1;
            } catch (err) {
                if (!forceStart || _counter >= 3) {
                    throw err;
                }

                const pid = await this._spawnOmnitron();
                if (is.number(pid)) {
                    return this.connectLocal({
                        forceStart
                    }, ++_counter);
                }
            }
            this.peer = peer;
        }

        return status;
    }

    async disconnect() {
        if (!is.null(this.peer)) {
            await runtime.netron.disconnect();
            await runtime.netron.unbind();
            this.peer = null;
        }
    }

    startOmnitron(options) {
        return this._spawnOmnitron(options);
    }

    async stopOmnitron({ killChildren = true } = {}) {
        const isActive = await this.isOmnitronActive();
        if (isActive) {
            // Can be used in test environment.
            if (is.string(adone.realm.config.omnitron.pidFilePath)) {
                try {
                    const pid = parseInt(std.fs.readFileSync(adone.realm.config.omnitron.pidFilePath).toString());
                    if (is.windows) {
                        try {
                            await this.connectLocal({
                                forceStart: false
                            });
                            await this.killSelf();
                            this.noisily && adone.log("Called omnitron's killSelf()");
                            await this._isAlive(pid, 3000); // wait 3 sec
                        } catch (err) {
                            this.noisily && adone.error(err.message);
                        }
                    } else {
                        await runtime.netron.disconnect();
                        this.peer = null;

                        try {
                            const pid = parseInt(std.fs.readFileSync(adone.realm.config.omnitron.pidFilePath).toString());
                            if (killChildren) {
                                await this._killProcessChildren(pid);
                            }
                            await this._killProcess(pid, 10000); // awaiting 10 sec...
                        } catch (err) {
                            this.noisily && adone.log(err.message);
                        }
                    }
                } catch (err) {
                    this.noisily && adone.log("Omnitron is offline");
                }
            }
        } else {
            this.noisily && adone.log("Omnitron is offline");
        }

        if (!is.nil(this.descriptors.stdout)) {
            await adone.fs.fd.close(this.descriptors.stdout);
            this.descriptors.stdout = null;
        }
        if (!is.nil(this.descriptors.stderr)) {
            await adone.fs.fd.close(this.descriptors.stderr);
            this.descriptors.stderr = null;
        }
    }

    async restartOmnitron({ spiritualWay = true, killChildren = false } = {}) {
        await this.kill({ killChildren });
        await this._spawnOmnitron({ spiritualWay });
        await this.connectLocal({
            forceStart: false
        });
    }

    async isOmnitronActive() {
        const n = new netron.Netron();
        let isOK = false;
        try {
            const localGate = (await this.configuration()).raw.gates[0];
            await n.connect(localGate);
            await n.disconnect();
            isOK = true;
        } catch (err) {
            // adone.log(err);
        }

        return isOK;
    }

    async ping() {
        return is.null(await this.peer.ping());
    }

    getInterface(name) {
        return this.peer.getInterfaceByName(name);
    }

    async registerService(serviceName) {
        try {
            const systemDb = new omnitron.SystemDB();
            await systemDb.open();
            await systemDb.registerService(serviceName);
            await systemDb.close();
        } catch (err) {
            const isActive = await this.isOmnitronActive();
            await this.connectLocal();
            await this.getInterface("omnitron").registerService(serviceName);
            if (!isActive) {
                await this.stopOmnitron();
            }
        }
    }

    async unregisterService(serviceName) {
        try {
            const systemDb = new omnitron.SystemDB();
            await systemDb.open();
            await systemDb.unregisterService(serviceName);
            await systemDb.close();
        } catch (err) {
            const isActive = await this.isOmnitronActive();
            await this.connectLocal();
            await this.getInterface("omnitron").unregisterService(serviceName);
            if (!isActive) {
                await this.stopOmnitron();
            }
        }
    }

    // Omnitron interface

    killSelf() {
        return this.getInterface("omnitron").killSelf();
    }

    getInfo(options) {
        return this.getInterface("omnitron").getInfo(options);
    }

    setEnvs(envs) {
        return this.getInterface("omnitron").setEnvs(envs);
    }

    updateEnvs(envs) {
        return this.getInterface("omnitron").updateEnvs(envs);
    }

    start(serviceName = "") {
        if (serviceName === "") {
            return this.connectLocal();
        }
        return this.getInterface("omnitron").start(serviceName);

    }

    stop(serviceName = "") {
        if (serviceName === "") {
            return this.kill({ killChildren: false });
        }
        return this.getInterface("omnitron").stop(serviceName);

    }

    restart(serviceName = "") {
        return (serviceName === "") ? this.restartOmnitron() : this.getInterface("omnitron").restart(serviceName);
    }

    status(serviceName) {
        return this.getInterface("omnitron").status(serviceName);
    }

    enable(serviceName, options) {
        return this.getInterface("omnitron").enable(serviceName, true, options);
    }

    disable(serviceName) {
        return this.getInterface("omnitron").enable(serviceName, false);
    }

    list(status) {
        if (!STATUSES.includes(status)) {
            throw new x.NotValid(`Not valid status: ${status}`);
        }

        return this.getInterface("omnitron").list({
            status
        });
    }

    _spawnOmnitron({ spiritualWay = true } = {}) {
        if (spiritualWay) {
            return new Promise(async (resolve, reject) => {
                const omnitronConfig = adone.realm.config.omnitron;
                await adone.fs.mkdirp(std.path.dirname(omnitronConfig.logFilePath));
                this.descriptors.stdout = std.fs.openSync(omnitronConfig.logFilePath, "a");
                this.descriptors.stderr = std.fs.openSync(omnitronConfig.errorLogFilePath, "a");
                const child = std.child_process.spawn(process.execPath || "node", [std.path.resolve(adone.rootPath, "lib/omnitron/omnitron.js")], {
                    detached: true,
                    cwd: process.cwd(),
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
        }
        return adone.application.run(omnitron.Omnitron);
    }

    async _isAlive(pid, timeout = 0) {
        try {
            let exists = true;
            const n = timeout / 100;
            if (timeout > 0) {
                for (let i = 0; i < n && exists; ++i) {
                    try {
                        process.kill(pid, 0); // check the existence
                        // eslint-disable-next-line
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
            exists = await this._isAlive(pid, 3000); // wait 3 sec
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
