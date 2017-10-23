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

    async stopOmnitron({ killChildren = false } = {}) {
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
                            await adone.system.process.kill(pid, {
                                tree: killChildren
                            });
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
                    this.noisily && adone.log(`Omnitron successfully started (pid: ${msg.pid})`);
                    resolve(msg.pid);
                });
            });
        }
        return adone.application.run(omnitron.Omnitron);
    }
}
