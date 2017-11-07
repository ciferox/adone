const {
    is,
    x,
    std,
    netron,
    omnitron,
    runtime
} = adone;

// NOTE: local gate always be first in list of gates in gates.json

export default class Dispatcher {
    constructor({ noisily = false, netronOptions = {} } = {}) {
        this.noisily = noisily;
        adone.vendor.lodash.extend(runtime.netron.options, netronOptions);

        if (noisily) {
            runtime.netron.on("peer online", (peer) => {
                adone.info(`Peer '${peer.getRemoteAddress().full}' (${peer.uid}) connected`);
            }).on("peer offline", (peer) => {
                adone.info(`Peer '${peer.getRemoteAddress().full}' (${peer.uid}) disconnected`);
            });
        }

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
            const localGate = (await adone.omnitron.loadConfig()).raw.gates[0];
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

    async startOmnitron(spiritualWay = true) {
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
                const result = await this.getInterface("omnitron").getInfo({
                    pid: true
                });

                if (shouldDisconnect) {
                    await this.peer.disconnect();
                }

                return result;
            }
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
            // Can be used in test environment.
            if (is.string(adone.realm.config.omnitron.pidFilePath)) {
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
                                throw new x.Timeout("Process is still alive");
                            }
                            await adone.promise.delay(100); // eslint-disable-line
                        }
                    };
                    const pid = parseInt(std.fs.readFileSync(adone.realm.config.omnitron.pidFilePath).toString());
                    if (is.windows) {
                        try {
                            await this.connectLocal({
                                forceStart: false
                            });
                            await this.killSelf();
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
                            await adone.system.process.kill(pid);
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
        await this.kill();
        await this.startOmnitron(spiritualWay);
        await this.connectLocal({
            forceStart: false
        });
    }

    async isOmnitronActive() {
        const n = new netron.Netron();
        let isOK = false;
        try {
            const localGate = (await adone.omnitron.loadConfig()).raw.gates[0];
            await n.connect(localGate);
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
            const systemDb = new omnitron.SystemDB();
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
            const systemDb = new omnitron.SystemDB();
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
}
