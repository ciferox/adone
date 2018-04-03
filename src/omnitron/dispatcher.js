const {
    application: {
        Subsystem
    },
    is,
    error,
    std,
    netron,
    omnitron,
    runtime
} = adone;

export default class Dispatcher extends Subsystem {
    constructor() {
        super();

        this.peer = null;
        this.descriptors = {
            stodut: null,
            stderr: null
        };

        runtime.netron.on("peer offline", (peer) => {
            if (!is.null(this.peer) && this.peer.uid === peer.uid) {
                this.peer = null;
            }
        });
    }

    async uninitialize() {
        if (this.db) {
            await this.db.close();
        }

        return this.disconnect();
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

    isConnected() {
        return is.netronPeer(this.peer);
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
            let peer = null;
            try {
                peer = await runtime.netron.connect({
                    port: omnitron.port
                });
                status = _counter >= 1 ? 0 : 1;
            } catch (err) {
                if (!forceStart || _counter >= 3) {
                    throw err;
                }

                const pid = await this.startOmnitron();
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

    async startOmnitron({ spiritualWay = true, gc = false } = {}) {
        if (spiritualWay) {
            const isActive = await this.isOmnitronActive();
            if (isActive) {
                let shouldDisconnect = false;
                if (is.null(this.peer)) {
                    shouldDisconnect = true;
                    await this.connectLocal({
                        forceStart: false
                    });
                }
                const result = await this.getInfo({
                    process: true
                });

                if (shouldDisconnect) {
                    await this.disconnect();
                }

                return result.process.id;
            }
            return new Promise(async (resolve, reject) => {
                const omniConfig = adone.realm.config.omnitron;
                await adone.fs.mkdirp(std.path.dirname(omniConfig.LOGFILE_PATH));
                this.descriptors.stdout = std.fs.openSync(omniConfig.LOGFILE_PATH, "a");
                this.descriptors.stderr = std.fs.openSync(omniConfig.ERRORLOGFILE_PATH, "a");
                const args = [std.path.resolve(adone.ROOT_PATH, "lib/omnitron/omnitron/index.js")];
                if (gc) {
                    args.unshift("--expose-gc");
                }
                const child = std.child_process.spawn(process.execPath || "node", args, {
                    detached: true,
                    cwd: process.cwd(),
                    stdio: ["ipc", this.descriptors.stdout, this.descriptors.stderr]
                });
                child.unref();
                child.once("error", reject);

                const onExit = (code) => {
                    if (code !== 0) {
                        reject(new Error(`Process exited with error code: ${code}`));
                    }
                };
                child.once("exit", onExit);
                child.once("message", (msg) => {
                    child.removeListener("error", reject);
                    child.removeListener("exit", onExit);
                    child.disconnect();
                    resolve(msg.pid);
                });
            });
        }
        return adone.application.run(omnitron.Omnitron);
    }

    async stopOmnitron() {
        const isActive = await this.isOmnitronActive();
        if (isActive) {
            if (await adone.fs.exists(adone.realm.config.omnitron.PIDFILE_PATH)) {
                try {
                    const checkAlive = async (pid) => {
                        let elapsed = 0;
                        for (; ;) {
                            // eslint-disable-next-line
                            if (!(await adone.system.process.exists(pid))) {
                                return;
                            }
                            elapsed += 100;
                            if (elapsed >= 3000) {
                                throw new error.Timeout("Process is still alive");
                            }
                            await adone.promise.delay(100); // eslint-disable-line
                        }
                    };
                    const pid = parseInt(std.fs.readFileSync(adone.realm.config.omnitron.PIDFILE_PATH).toString());
                    if (is.windows) {
                        try {
                            await this.connectLocal({
                                forceStart: false
                            });
                            await this.kill();
                            await this.peer.disconnect();
                            this.peer = null;
                            await checkAlive(pid);
                        } catch (err) {
                            return 0;
                        }
                    } else {
                        if (!is.null(this.peer)) {
                            await this.peer.disconnect();
                            this.peer = null;
                        }

                        try {
                            await adone.system.process.kill(pid, { tree: false });
                            await checkAlive(pid);
                        } catch (err) {
                            return 0;
                        }
                    }
                    return 1;
                } catch (err) {
                    return 0;
                }
            }
        } else {
            return 2;
        }

        if (!is.nil(this.descriptors.stdout)) {
            await adone.fs.close(this.descriptors.stdout);
            this.descriptors.stdout = null;
        }
        if (!is.nil(this.descriptors.stderr)) {
            await adone.fs.close(this.descriptors.stderr);
            this.descriptors.stderr = null;
        }
    }

    async restartOmnitron(spiritualWay = true) {
        await this.stopOmnitron();
        await this.startOmnitron(spiritualWay);
        await this.connectLocal({
            forceStart: false
        });
    }

    async isOmnitronActive() {
        const n = new netron.Netron({
            connect: {
                retries: 1,
                minTimeout: 10
            }
        });
        let isOK = false;
        try {
            await n.connect({
                port: omnitron.port
            });
            await n.disconnect();
            isOK = true;
        } catch (err) {
            // adone.log(err);
        }

        return isOK;
    }

    async ping() {
        return !is.null(this.peer) && is.null(await this.peer.ping());
    }

    getInterface(name) {
        return this.peer.getInterfaceByName(name);
    }

    async registerService(serviceName) {
        try {
            const systemDb = new omnitron.DB();
            await systemDb.open();
            await systemDb.registerService(serviceName);
            await systemDb.close();
        } catch (err) {
            await this.connectLocal({
                forceStart: false
            });
            await this.getInterface("omnitron").registerService(serviceName);
        }
    }

    async unregisterService(serviceName) {
        try {
            const systemDb = new omnitron.DB();
            await systemDb.open();
            await systemDb.unregisterService(serviceName);
            await systemDb.close();
        } catch (err) {
            await this.connectLocal({
                firceStart: false
            });
            await this.getInterface("omnitron").unregisterService(serviceName);
        }
    }

    // Omnitron interface

    async getConfiguration() {
        let config;
        if (await this.isOmnitronActive()) {
            await this.connectLocal({
                forceStart: false
            });
            config = await this.getInterface("omnitron").getConfiguration();
        } else {
            this.db = await adone.omnitron.DB.open();
            config = await this.db.getConfiguration();
        }
        return config;
    }

    kill() {
        return this.getInterface("omnitron").kill();
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

    startService(serviceName) {
        return this.getInterface("omnitron").startService(serviceName);
    }

    stopService(serviceName) {
        return this.getInterface("omnitron").stopService(serviceName);
    }

    configureService(serviceName, options) {
        return this.getInterface("omnitron").configureService(serviceName, options);
    }

    restart(serviceName = "") {
        return (serviceName === "") ? this.restartOmnitron() : this.getInterface("omnitron").restart(serviceName);
    }

    status(serviceName) {
        return this.getInterface("omnitron").status(serviceName);
    }

    enableService(serviceName, options) {
        return this.getInterface("omnitron").enableService(serviceName, options);
    }

    disableService(serviceName, options) {
        return this.getInterface("omnitron").disableService(serviceName, options);
    }

    enumerate(filter) {
        return this.getInterface("omnitron").enumerate(filter);
    }

    getPeers() {
        return this.getInterface("omnitron").getPeers();
    }

    getContexts() {
        return this.getInterface("omnitron").getContexts();
    }

    getReport() {
        return this.getInterface("omnitron").getReport();
    }

    getSubsystems() {
        return this.getInterface("omnitron").getSubsystems();
    }

    loadSubsystem(subsystem, options) {
        return this.getInterface("omnitron").loadSubsystem(subsystem, options);
    }

    unloadSubsystem(name) {
        return this.getInterface("omnitron").unloadSubsystem(name);
    }

    gc() {
        return this.getInterface("omnitron").gc();
    }

    addGate(gate) {
        return this.getInterface("omnitron").addGate(gate);
    }

    deleteGate(name) {
        return this.getInterface("omnitron").deleteGate(name);
    }

    getGates(options) {
        return this.getInterface("omnitron").getGates(options);
    }

    upGate(name) {
        return this.getInterface("omnitron").upGate(name);
    }

    downGate(name) {
        return this.getInterface("omnitron").downGate(name);
    }

    configureGate(name, options) {
        return this.getInterface("omnitron").configureGate(name, options);
    }
}
