const { Contextable, Description, Public, Private, Type } = adone.netron.decorator;
const { is, vendor: { lodash: _ }, std, netron: { Netron }, AsyncEmitter } = adone;
const { DefaultMap } = adone.collection;

// a tmp solution(i hope)
class Logger {
    constructor(contexts = []) {
        this.muted = false;
        this.contexts = contexts;
        this.muted = false;
    }

    contextify(context) {
        const logger = new Logger(this.contexts.concat([context]));
        if (this.muted) {
            logger.mute();
        }
        return logger;
    }

    write(stream, data) {
        if (this.muted) {
            return;
        }
        const message = std.util.format(...data);
        const context = this.contexts.map((x) => `[${x}]`).join(" ");
        stream(`${context} ${message}`);
    }

    log(...args) {
        return this.write(adone.info, args);
    }

    error(...args) {
        return this.write(adone.error, args);
    }

    warning(...args) {
        return this.write(adone.error, args);
    }

    mute() {
        this.muted = true;
    }

    unmute() {
        this.muted = false;
    }
}

export const logger = new Logger();

export const netronOptions = {
    reconnects: 10,
    retryTimeout: 200,
    retryMaxTimeout: 2000,
    responseTimeout: 5000
};

export class IDGenerator {
    constructor(start, step = 1) {
        this.current = start;
        this.step = step;
    }

    next() {
        const value = this.current;
        this.current += this.step;
        return value;
    }
}

// in case of restarting it is better to restart processes...
export class RemoteProcess extends AsyncEmitter {
    constructor(pid) {
        super();
        this.pid = pid;
        process.nextTick(() => this._waitForExit());  // end the sync part, unhandled rejection
        this.exited = false;
        this.exitCode = null;
        this.exitSignal = null;
    }

    static alive(pid) {
        try {
            process.kill(pid, 0);
            return true;
        } catch (err) {
            return false;
        }
    }

    get alive() {
        if (this.exited) {
            return false;
        }
        return RemoteProcess.alive(this.pid);
    }

    /**
     * should not be used directly
     *
     *
     * @memberOf RemoteProcess
     */
    async _waitForExit() {
        const pollingInteval = 250;
        for (; ;) {
            await adone.promise.delay(pollingInteval);
            if (!this.alive) {
                break;
            }
        }
        this.exited = true;
        this.exitCode = -1; // ?
        this.exitSignal = "UNKNOWN";  // ?
        this.emitSerial("exit", this.exitCode, this.exitSignal);
    }

    kill(signal) {
        process.kill(this.pid, signal);
    }
}

export class PRemoteProcess extends RemoteProcess {
    constructor(pid, peer) {
        super(pid);
        this.peer = peer;
    }

    _waitForExit() {
        return new Promise((resolve) => {
            this.peer.on("disconnect", () => {
                if (this.alive) {
                    this.kill("SIGKILL");
                }
                resolve(super._waitForExit());
            });
        });
    }
}

@Contextable
@Private
export class ReEmitter {
    constructor(dest) {
        this.dest = dest;
    }

    @Public
    workerExit(...data) {
        this.dest.emitParallel("workerExit", ...data);
    }
}

export class Process extends AsyncEmitter {
    static containerPath = std.path.join(__dirname, "containers", "single.js");

    constructor(pm, config) {
        super();
        this.pm = pm;
        this.config = config;
        this.process = null;
        this.fd = {};
        this.meta = {
            restored: false,
            started: false,
            exited: false,
            exitCode: null,
            exitSignal: null
        };
        this.netron = null;
        this.peer = null;
        this.container = null;
    }

    get mode() {
        return this.config.mode;
    }

    get alive() {
        return this.meta.started === true && this.meta.exited === false;
    }

    get pid() {
        if (!this.process) {
            return null;
        }
        return this.process.pid;
    }

    async _write(path, ...args) {
        const timestamp = adone.datetime().format("DD.MM.YYYY hh:mm:ss");
        const message = adone.std.util.format(...args);
        if (!(await adone.fs.exists(std.path.dirname(path)))) {
            await adone.fs.mkdir(std.path.dirname(path));
        }
        await adone.fs.appendFile(path, `[${timestamp}][MASTER] ${message}\n`);
    }

    writeToStdout(...args) {
        return this._write(this.config.stdout, ...args);
    }

    writeToStderr(...args) {
        return this._write(this.config.stderr, ...args);
    }

    async openStdStreams() {
        const { config } = this;
        const stdoutDir = std.path.dirname(config.stdout);
        const stderrDir = std.path.dirname(config.stderr);

        await adone.fs.mkdir(stdoutDir);
        await adone.fs.mkdir(stderrDir);

        this.fd.stdout = await adone.fs.fd.open(config.stdout, "a");
        this.fd.stderr = await adone.fs.fd.open(config.stderr, "a");
    }

    async closeStdStreams() {
        await adone.fs.fd.close(this.fd.stdout);
        delete this.fd.stdout;
        await adone.fs.fd.close(this.fd.stderr);
        delete this.fd.stderr;
    }

    async start() {
        const { config } = this;

        await this.openStdStreams();

        const container = this.constructor.containerPath;
        const { port } = config;

        await adone.fs.rm(port).catch(adone.noop);
        this.process = std.child_process.spawn(config.interpreter, [container, port], {
            detached: true,
            stdio: ["ignore", this.fd.stdout, this.fd.stderr]
        });
        this.meta.started = true;
        this.process.on("exit", (code, signal) => {
            this.meta.exited = true;
            this.meta.exitCode = code;
            this.meta.exitSignal = signal;
        });
        this.netron = new Netron(netronOptions);
        try {
            this.peer = await this.netron.connect({ port: this.config.port });
        } catch (err) {
            this.process.kill("SIGKILL");
            this.netron = null;
            throw new adone.x.Exception(`Failed to connect to the container: ${err.message}`);
        }
        this.container = this.peer.getInterfaceByName("container");
        try {
            await this.container.start(config.path, config.args);
        } catch (err) {
            this.process.kill("SIGKILL");
            this.netron = this.container = null;

            if (!(err instanceof adone.x.NetronPeerDisconnected)) {  // may be a sync task
                throw new adone.x.Exception(`Failed to start the application: ${err.stack || err.message || err}`);
            }
        }

        if (this.meta.exited) {  // synchronous tasks or an immediate error
            // will it appear?
            setImmediate(() => this._onExit(this.meta.exitCode, this.meta.exitSignal));  // schedule after promises resolves
        } else {
            this.peer.on("disconnect", () => {  // if the peer dies => kill the process
                if (!this.meta.exited) {
                    this.process.kill("SIGKILL");
                }
            });
            this.process.on("exit", (code, signal) => this._onExit(code, signal));
        }
    }

    async _onExit(code, signal) {
        this.netron = this.peer = this.container = null;
        this.meta.exited = true;
        this.meta.exitCode = code;
        this.meta.exitSignal = signal;
        await this.closeStdStreams();
        this.emitSerial("exit", code, signal);
    }

    async kill(signal = "SIGKILL") {
        if (!this.process || this.meta.exited) {
            throw new adone.x.IllegalState("The process is not running");
        }
        this.process.kill(signal);
    }

    /**
     *
     *
     * @param {any} pid
     * @param {string} [_name="master"] for testing
     *
     * @memberOf Process
     */
    async attach(pid) {
        this.netron = new Netron(netronOptions);
        try {
            this.peer = await this.netron.connect({ port: this.config.port });
        } catch (err) {
            this.netron = null;
            throw new adone.x.Exception(`Failed to connect to the container: ${err.message}`);
        }

        this.container = this.peer.getInterfaceByName("container");
        this.meta.restored = true;
        this.meta.started = true;
        await this.openStdStreams();
        this.process = new PRemoteProcess(pid, this.peer);
        this.process.on("exit", (code, signal) => this._onExit(code, signal));
    }

    waitForExit() {
        if (this.meta.exited) {
            return Promise.reject(new adone.x.IllegalState("Has already exited"));
        }
        return new Promise((resolve) => {
            this.on("exit", (code, signal) => resolve({ code, signal }));
        });
    }

    async ping() {
        if (!this.peer) {
            throw new adone.x.IllegalState("No connection with the peer");
        }
        return this.container.ping();
    }

    /**
     *
     *
     * @param {any} [{ graceful = true, timeout = 2000 }={}]
     * @returns {Promise}
     *
     * @memberOf Process
     */
    exit({ graceful = true, timeout = 2000 } = {}) {
        if (!graceful) {
            this.kill("SIGKILL");
            return this.waitForExit();
        }
        return new Promise((resolve) => {
            this.container.initiateGracefulShutdown();
            const timer = setTimeout(() => {
                this.removeListener("exit", awaiter);
                this.kill("SIGKILL");
                resolve(this.waitForExit());
            }, timeout);
            const awaiter = () => {
                clearTimeout(timer);
                resolve();
            };
            this.on("exit", awaiter);
        });
    }
}

export class MainProcess extends Process {
    static containerPath = std.path.join(__dirname, "containers", "cluster.js");

    constructor(...args) {
        super(...args);
        this._workers = new Map();
        this.reemitter = null;
    }

    get workers() {
        if (!this.container) {
            return [];
        }
        const res = {};
        for (const [id, data] of this._workers.entries()) {
            res[id] = data;
        }
        return res;
    }

    get cluster() {
        return true;
    }

    async createNewWorker(id = this._workers.size) {
        const pid = await this.container.setNewWorker(id);
        this._workers.set(id, { pid, alive: true, appeared: new Date().getTime(), disappeared: null });
        this.emitParallel("newWorker", id, pid).catch(adone.noop);
        return [id, pid];
    }

    async deleteWorker(id, { graceful = false, timeout = 1000 } = {}) {
        if (this._workers.get(id).alive) {
            await this.killWorker(id, { graceful, timeout });
        }
        await this.container.deleteWorker(id);
        this._workers.delete(id);
        this.emitParallel("deleteWorker", id).catch(adone.noop);
    }

    killWorker(id, { graceful = false, timeout = 2000 } = {}) {
        return this.container.killWorker(id, { graceful, timeout });
    }

    async start() {
        await super.start();
        const { config } = this;
        this.reemitter = new ReEmitter(this);  // listening to exit events
        await this.container.register(this.reemitter);
        try {
            for (let i = 0; i < config.instances; ++i) {
                await this.createNewWorker();
            }
            this.on("workerExit", (id) => this._onWorkerExit(id));
        } catch (err) {
            this.kill("SIGKILL");
            throw err;
        }
    }

    _onWorkerExit(id) {
        if (this._workers.has(id)) {  // it can be deleted
            const worker = this._workers.get(id);
            worker.alive = false;
            worker.disappeared = new Date().getTime();
        }
    }

    attach(...args) {
        return super.attach(...args).then(async () => {
            const workers = await this.container.workers();
            for (const { id, pid, alive, appeared, disappeared } of workers) {
                this._workers.set(id, { pid, alive, appeared, disappeared });
            }
            this.on("workerExit", (id) => this._onWorkerExit(id));
            this.reemitter = new ReEmitter(this);
            await this.container.register(this.reemitter);
        });
    }

    async scale(instances, { graceful = true, timeout = 2000 } = {}) {
        const n = this._workers.size - instances;
        if (n > 0) {  // have to kill some
            const ids = [...this._workers.keys()].sort((a, b) => a - b).reverse().slice(0, n);
            await Promise.all(ids.map((id) => {
                return this.deleteWorker(id, { graceful, timeout });
            }));
        } else {  // have to spawn new workers
            for (let i = 0, m = -n; i < m; ++i) {
                await this.createNewWorker();
            }
        }
    }

    async restartWorker(id, { graceful = true, timeout = 2000 } = {}) {
        await this.killWorker(id, { graceful, timeout });
        await this.createNewWorker(id);
    }

    async reload({ graceful = true, timeout = 2000 } = {}) {
        for (const id of this._workers.keys()) {
            await this.restartWorker(id, { graceful, timeout });
        }
    }

    _onExit(...args) {
        this.reemitter = null;
        return super._onExit(...args);
    }

    exit({ graceful = true, timeout = 2000 } = {}) {
        return Promise.all(_.entries(this.workers).map(([id, { alive }]) => {
            if (alive) {
                return this.deleteWorker(Number(id), { graceful, timeout });
            }
        })).then(() => {  // cannot use async functions with super in node 7.2
            return super.exit({ graceful: false });
        });
    }
}

@Contextable
@Private
@Description("A single process")
export class IProcess {
    constructor(pm, process) {
        this.pm = pm;
        this.process = process;
    }

    @Public
    ping() {
        return this.process.ping();
    }

    @Public
    uptime() {
        return this.pm.uptime(this.process.config.name);   // not ok
    }

    @Public
    usage() {
        return this.pm.usage(this.process.config.name);  // not ok
    }

    @Public
    @Description("The process exit code")
    @Type([null, Number])
    exitCode() {
        return this.process.meta.exitCode;
    }

    @Public
    @Description("The signal terminated the process")
    @Type([null, Number])
    exitSignal() {
        return this.process.meta.exitSignal;
    }

    @Public
    @Description("Whether the process is alive")
    @Type(Boolean)
    alive() {
        return this.process.alive;
    }

    @Public
    @Description("Get the process pid")
    @Type([null, Number])
    pid() {
        return this.process.pid;
    }

    @Public
    @Description("KIll the process")
    @Type(undefined)
    kill(signal) {
        return this.process.kill(signal);
    }

    @Public
    @Description("Wait for the process exit")
    waitForExit() {
        return this.process.waitForExit();
    }
}

@Contextable
@Private
@Description("The main process of a cluster")
export class IMainProcess extends IProcess {
    @Public
    @Description("Get info about the workers")
    workers() {
        return this.process.workers;  // should return info related to the current process, but not the general
    }

    @Public
    scale(...args) {
        return this.pm.scale(this.process.config.name, ...args);
    }

    @Public
    reload(...args) {
        return this.pm.reload(this.process.config.name, ...args);
    }

    @Public
    killWorker(...args) {
        return this.pm.killWorker(this.process.config.name, ...args);
    }

    @Public
    restartWorker(...args) {
        return this.pm.killWorker(this.process.config.name, ...args);
    }
}

function getProcessInterface(pm, process) {
    if (process instanceof MainProcess) {
        return new IMainProcess(pm, process);
    }
    return new IProcess(pm, process);
}

export class UsageProvider {
    constructor(os) {
        this.os = os;
        this.history = new Map();
    }

    async lookup(pid) {
        const proc = await this.os.getProcess(pid);
        if (proc === null) {
            return { cpu: 0, memory: 0 };
        }
        const history = this.history.get(pid) || {};
        const rss = proc.getResidentSetSize();

        const kernelTime = proc.getKernelTime();
        const userTime = proc.getUserTime();
        const upTime = proc.getUpTime();

        const total = kernelTime - (history.kernelTime | 0) + userTime - (history.userTime | 0);
        const time = upTime - (history.upTime | 0);
        const usage = total / time * 100;

        this.history.set(pid, {
            kernelTime,
            userTime,
            upTime
        });
        return {
            cpu: usage,
            memory: rss
        };
    }

    clear(pid) {
        this.history.delete(pid);
    }
}

const STATES = {
    STARTING: 0,
    RUNNING: 1,
    STOPPING: 2,
    STOPPED: 3,
    FAILED: 4,
    WAITING_FOR_RESTART: 5,
    ATTACHING: 6,
    RESTARTING: 7,
    RELOADING: 8,
    SCALING: 9,
    STARTED: 10
};

// slow, debug
function humanizeState(s) {
    return _.entries(STATES).find((x) => x[1] === s)[0];
}

@Contextable
@Private
export default class ProcessManager {
    constructor(omnitron) {
        this.options = {
            datastore: {
                applications: {
                    filename: "pm-applications"
                },
                runtime: {
                    filename: "pm-runtime"
                }
            },
            defaultProcessConfig: {
                args: [],
                env: {},
                mode: "single",
                startup: false,
                autorestart: false,
                maxRestarts: 3,
                restartDelay: 0,
                killTimeout: 1600,
                normalStart: 1000
            }
        };
        this.omnitron = omnitron;
        this.processes = new Map();
        this.appmeta = new DefaultMap(() => new DefaultMap((key) => {
            switch (key) {
                case "restarts":
                    return 0;
                case "immediateRestarts":
                    return 0;
                case "workers":
                    return new DefaultMap(() => new DefaultMap({
                        restarts: 0,
                        immediateRestarts: 0,
                        state: STATES.STOPPED,
                        startingTimer: null,
                        lastRestartTimestamp: null
                    }));
                case "state":
                    return STATES.STOPPED;
                case "startingTimer":
                    return null;
                case "lastRestartTimestamp":
                    return null;
            }
        }));
        this.state = STATES.STOPPED;
        this.db = {};
    }

    async initialize() {
        this.state = STATES.STARTING;
        logger.log("Initialization");
        const { options: { datastore }, db } = this;
        const iDatabase = await this.omnitron.context("db");
        db.applications = await iDatabase.getDatastore(datastore.applications);
        db.runtime = await iDatabase.getDatastore(datastore.runtime);
        const [last] = await db.applications.execFind({}, "sort", { id: - 1 }, "limit", 1);
        let nextid;
        if (is.nil(last)) {
            nextid = 1;
        } else {
            nextid = last.id + 1;
        }
        this.ids = new IDGenerator(nextid);
        this.os = adone.metrics.system;
        this.usageProvider = new UsageProvider(this.os);
        logger.log("Initialized");
        this.state = STATES.RUNNING;
        this.basePath = await this.omnitron.config.omnitron.getServicePath("pm", "apps");
        await this.resurrect();
    }

    async uninitialize() {
        this.state = STATES.STOPPING;
        if (this.usageProvider) {
            this.usageProvider.clear();
        }
        // shouldnt stop the processes
        this.state = STATES.STOPPED;
    }

    @Description("Attach to all the running processes")
    async resurrect() {
        logger.log("Resurrection");
        // attach
        const { db } = this;
        const processes = await db.runtime.find({});
        const attached = new Set();
        for (const meta of processes) {
            const config = await this.getConfigByID(meta.id);
            if (is.null(config)) {
                logger.log(`There is no config for ${meta.id}`);
                continue;
            }
            logger.log(`Try to restore ${config.name}`);
            const l = logger.contextify(config.name);
            const remote = new RemoteProcess(meta.pid);
            if (remote.alive) {
                const p = await this.os.getProcess(meta.pid);
                const started = meta.timestamps.started;
                // the real start time must always be lower(or equal) than that
                // if the real is not than we have another process having the same pid
                if (p.getStartTime() <= started) {
                    const appmeta = this.appmeta.get(config.id);
                    appmeta.set("state", STATES.ATTACHING);
                    l.log("the process is alive, try to attach");
                    const constructor = config.mode === "cluster" ? MainProcess : Process;
                    const proc = new constructor(this, config);
                    try {
                        await proc.attach(meta.pid);
                        this.processes.set(config.id, {
                            process: proc,
                            iProcess: getProcessInterface(this, proc),
                            runtime: meta
                        });
                        appmeta.set("state", STATES.RUNNING);
                        proc.on("exit", () => this._onProcessExit(config.id));  // unhandled rejection
                        if (proc.cluster) {
                            const workers = proc.workers;
                            const workersmeta = appmeta.get("workers");
                            for (const [id, { alive }] of _.entries(workers)) {
                                const workermeta = workersmeta.get(Number(id));
                                if (alive) {
                                    workermeta.set("state", STATES.RUNNING);
                                } else {
                                    process.nextTick(() => this._onWorkerExit(config.id, id));  // restart may be
                                }
                            }
                            this._setupWorkerWatchers(config, proc);
                        }

                        await db.runtime.update({ id: config.id }, {
                            $set: {
                                "timestamps.attached": new Date().getTime()
                            }
                        });
                        l.log("successfully attached");
                        attached.add(config.id);
                    } catch (err) {
                        // can't connect to the process, kill the process
                        await db.runtime.remove({ id: config.id });
                        l.log("failed to attach, send SIGKILL to the process");
                        l.log(err.stack || err.message || err);
                        remote.kill("SIGKILL");
                        await new Promise((resolve) => remote.on("exit", resolve));
                    }
                }
            } else {
                logger.log(`${config.name} process has died`);
                await db.runtime.remove({ id: config.id });
            }
        }
        // startup
        const started = new Set();
        const apps = await db.applications.find({});
        for (const app of apps) {
            if (attached.has(app.id) || !app.startup) {
                // has attached or there is no need to start the app
                continue;
            }
            logger.log(`start ${app.id}:${app.name}`);
            try {
                await this.start(app, { store: false });  // there were no updates
                started.add(app.id);
            } catch (err) {
                logger.log(`Failed to start ${app.id}:${app.name}`);
                logger.log(err.stack || err.message || err);
            }
        }
        // restart
        for (const meta of processes) {
            const config = await this.getConfigByID(meta.id);
            if (is.null(config) || attached.has(meta.id) || started.has(meta.id) || !config.autorestart) {
                // has deleted, attached, started or there is no need to restart
                continue;
            }
            logger.log(`restart ${config.id}:${config.name}`);
            try {
                await this.start(config, { store: false });
            } catch (err) {
                logger.log(`Failed to restart ${config.id}:${config.name}`);
                logger.log(err.stack || err.message || err);
            }
        }
        logger.log("Resurrection done");
    }

    async getConfigFor(name) {
        return this.db.applications.findOne({ name }, { _id: 0 });
    }

    async getConfigByID(id) {
        return this.db.applications.findOne({ id }, { _id: 0 });
    }

    prepareConfig(config) {
        if (!config.path) {
            throw new adone.x.InvalidArgument("Path is required");
        }
        const ext = std.path.extname(config.path);
        if (!config.name) {
            config.name = std.path.basename(config.path, ext);
        }
        if (!config.interpreter) {
            switch (ext) {
                case ".js":
                    config.interpreter = "node";
                    break;
                default:
                    throw new adone.x.Exception(`Unknown file extension: ${ext}. You have to specify the interpreter manually`);
            }
        }
        if (config.interpreter !== "node" && config.mode === "cluster") {
            throw new adone.x.IllegalState("Cluster mode is supported only for NodeJS applications");
        }
        delete config.id;
        config = _.defaultsDeep(config, this.options.defaultProcessConfig);
        config.storage = std.path.join(this.basePath, config.name);
        config.stdout = config.stdout || std.path.join(config.storage, "logs", "stdout.log");
        config.stderr = config.stderr || std.path.join(config.storage, "logs", "stderr.log");
        config.port = config.port || (is.win32 ? "\\\\.\\pipe\\" : "") + std.path.join(config.storage, "port.sock");
        if (config.mode === "cluster" && !is.number(config.instances)) {
            config.instances = adone.std.os.cpus().length;
        }
        return config;
    }

    async updateDBConfig(config) {
        const { db } = this;
        await db.applications.update({ id: config.id }, { $set: config });
    }

    async storeDBConfig(config) {
        const { db } = this;
        config.id = this.ids.next();
        await db.applications.insert(config);
        return config;
    }

    /**
     * преобразует то что отдаётся в config в реальный конфиг приложения
     *
     * @param {any} config
     * @param {boolean} [update=true]
     * @returns
     *
     * @memberOf ProcessManager
     */
    async deriveConfig(config, store = false) {
        if (config instanceof IProcess) {
            config = config.process.config.id;  // IProcess -> config.id
        }
        if (is.object(config)) {
            let currentConfig;

            if ("id" in config) {
                currentConfig = await this.getConfigByID(config.id);
            }
            if (!currentConfig) {
                currentConfig = await this.getConfigFor(config.name);
            }
            if (currentConfig) {
                config = _.defaultsDeep(config, currentConfig);
                if (store) {
                    await this.updateDBConfig(config);
                }
            } else {
                config = this.prepareConfig(config);
                if (store) {
                    config = await this.storeDBConfig(config);
                }
            }
        } else if (is.string(config)) {
            const id = Number(config);
            let t;
            if (id && !is.null(t = await this.getConfigByID(id))) {
                config = t;
            } else {
                const name = config;
                config = await this.getConfigFor(name);
                if (is.null(config)) {
                    throw new adone.x.NotExists("There is no such application");
                }
            }
        } else if (is.number(config)) {
            const id = config;
            config = await this.getConfigByID(id);
            if (is.null(config)) {
                throw new adone.x.NotExists("There is no such application");
            }
        }
        if (config.interpreter !== "node") {
            throw new adone.x.Exception("Not supported yet");
        }
        return config;
    }

    @Public
    @Description("Start an application")
    @Type(Process)
    async start(config, { store = true } = {}) {
        config = await this.deriveConfig(config);

        const { db } = this;
        let stored = false;
        if (store && !(await this.hasApplication(config.id))) {
            config = await this.storeDBConfig(config);
            stored = true;
        }
        const appmeta = this.appmeta.get(config.id);
        const currentState = appmeta.get("state");
        const restarting = currentState === STATES.RESTARTING;
        if (!restarting && (currentState !== STATES.STOPPED && currentState !== STATES.FAILED)) {
            throw new adone.x.IllegalState("Stop the process first");
        }
        if (store && !stored) {
            await this.updateDBConfig(config);
        }

        logger.log(`starting ${config.name}`);
        const l = logger.contextify(config.name);
        const isCluster = config.mode === "cluster";
        const constructor = isCluster ? MainProcess : Process;
        let proc;

        let started = false;
        if (!restarting) {
            appmeta.set("state", STATES.STARTING);
            proc = new constructor(this, config);
            try {
                await proc.start();
                started = true;
            } catch (err) {
                appmeta.set("state", STATES.FAILED);
                if (!config.autorestart) {
                    throw err;
                }
            }
        }

        if (!started) {  // autorestart === true
            let err = null;
            let restarts = appmeta.get("restarts");
            let immediateRestarts = appmeta.get("immediateRestarts");
            for (let i = 0, n = config.maxRestarts - immediateRestarts; i < n; ++i) {
                appmeta.set("state", STATES.RESTARTING);
                proc = new constructor(this, config);
                try {
                    await proc.start();
                    started = true;
                } catch (_err) {
                    l.log(`${i + 1} attempt failed`);
                    err = _err;
                    l.log(err.stack || err.message || err);
                }
                appmeta.set("restarts", ++restarts);
                appmeta.set("immediateRestarts", ++immediateRestarts);
                if (started) {
                    break;
                }
                appmeta.set("state", STATES.WAITING_FOR_RESTART);
                await adone.promise.delay(config.restartDelay);
                if (appmeta.get("state") !== STATES.WAITING_FOR_RESTART) {  // stopped or stopping
                    break;
                }
            }
            if (!started) {
                if (appmeta.get("state") === STATES.WAITING_FOR_RESTART) {
                    appmeta.set("state", STATES.FAILED);
                    const message = [
                        `Failed to start the app after ${config.maxRestarts} attempts`,
                        `The last error: ${err.stack || err.message || err}`
                    ].join("\n");
                    throw new adone.x.Exception(message);
                } else {
                    throw new adone.x.Exception("Was stopped while starting");
                }
            }
        }

        const runtime = {
            id: config.id,
            pid: proc.pid,
            timestamps: {
                started: new Date().getTime(),
                attached: null
            }
        };

        await db.runtime.update({ id: config.id }, {
            $set: runtime
        }, { upsert: true });

        if (isCluster) {
            appmeta.set("state", STATES.RUNNING);
        } else {
            appmeta.set("state", STATES.STARTED);
            appmeta.set("startingTimer", setTimeout(() => {
                appmeta.set("state", STATES.RUNNING);
            }, config.normalStart));
        }

        if (!proc.alive) {
            process.nextTick(() => this._onProcessExit(config.id));  // unhandled rejection
        } else {
            proc.on("exit", () => this._onProcessExit(config.id));  // unhandled rejection
            if (isCluster) {
                const workers = appmeta.get("workers");
                const pworkers = proc.workers;
                for (const id of _.keys(pworkers)) {
                    const worker = workers.get(Number(id));
                    worker.set("state", STATES.STARTED);
                    worker.set("startingTimer", setTimeout(() => {
                        worker.set("state", STATES.RUNNING);
                    }, config.normalStart));
                }
                this._setupWorkerWatchers(config, proc);
            }
        }

        l.log(`started ${config.name}`);

        const iProcess = getProcessInterface(this, proc);
        this.processes.set(config.id, { process: proc, iProcess, runtime });

        return iProcess;
    }

    _setupWorkerWatchers(config, proc) {
        const { name, id: appid } = config;
        const l = logger.contextify(name);
        const workers = this.appmeta.get(appid).get("workers");
        proc.on("workerExit", (id) => {
            l.log("worker exit", id);
            this._onWorkerExit(appid, id);
        });
        proc.on("deleteWorker", (id) => {
            l.log("delete worker", id);
            workers.delete(id);
        });
        proc.on("newWorker", (id) => {
            l.log("new worker", id);
            const worker = workers.get(id);
            worker.set("state", STATES.STARTED);
            worker.set("startingTimer", setTimeout(() => {
                worker.set("state", STATES.RUNNING);
            }, config.normalStart));
        });
    }

    async _onWorkerExit(appid, id) {
        const config = await this.getConfigByID(appid);
        const appmeta = this.appmeta.get(config.id);
        const workers = appmeta.get("workers");
        const workermeta = workers.get(id);
        const workerstate = workermeta.get("state");
        if (workerstate === STATES.RUNNING) {
            workermeta.set("immediateRestarts", 0);
        } else {
            // otherwise something went wrong, it can be not started or exited before the normal start
            clearTimeout(workermeta.get("startingTimer"));
        }
        workermeta.set("state", STATES.STOPPED);


        const l = logger.contextify(config.name).contextify(id);
        l.log("worker exited");
        const { process } = await this.processes.get(config.id);

        const { pid } = process.workers[id].pid;
        this.usageProvider.clear(pid);
        let immediateRestarts = workermeta.get("immediateRestarts");
        const appstate = appmeta.get("state");
        if (this.state === STATES.STOPPING || this.state === STATES.STOPPED) {
            // the omnitron is stopping
            return;
        }
        if (config.autorestart && (appstate === STATES.RUNNING || appstate === STATES.STARTED) && immediateRestarts < config.maxRestarts) {
            l.log("wait", config.restartDelay);
            workermeta.set("state", STATES.WAITING_FOR_RESTART);
            await adone.promise.delay(config.restartDelay);
            l.log("try to restart");
            let restarted = false;
            let restarts = workermeta.get("restarts");
            for (let i = 0, n = config.maxRestarts - immediateRestarts; i < n; ++i) {
                workermeta.set("state", STATES.RESTARTING);
                try {
                    await process.restartWorker(id);
                    restarted = true;
                } catch (err) {
                    l.log(`${restarts + 1} attempt failed`);
                    l.log(`${err.stack || err.message || err}`);
                }
                workermeta.set("restarts", ++restarts);
                workermeta.set("immediateRestarts", ++immediateRestarts);
                if (restarted) {
                    break;
                }
                workermeta.set("state", STATES.WAITING_FOR_RESTART);
                await adone.promise.delay(config.restartDelay);
            }
            if (restarted) {
                l.log("restarted");
            } else {
                workermeta.set("state", STATES.FAILED);
            }
        }
    }

    async _onProcessExit(appid) {
        const { db } = this;
        let config;
        try {
            config = await this.getConfigByID(appid);
        } catch (err) {
            // no such app
            return;
        }
        const appmeta = this.appmeta.get(config.id);
        const state = appmeta.get("state");
        const stopping = state === STATES.STOPPING;
        const stopped = state === STATES.STOPPED;
        if (appmeta.get("state") === STATES.RUNNING) {
            appmeta.set("immediateRestarts", 0);
        } else {
            // otherwise something went wrong, it can be not started or exited before the normal start
            clearTimeout(appmeta.get("startingTimer"));
        }
        appmeta.set("state", STATES.STOPPED);
        const { process } = this.processes.get(config.id);
        const { meta: { exitCode, exitSignal } } = process;

        this.usageProvider.clear(process.pid);

        const l = logger.contextify(config.name);

        if (exitCode !== null) {
            l.log(`The process exited with code ${exitCode}`);
        } else {
            l.log(`The process was terminated by signal ${exitSignal}`);
        }
        await db.runtime.remove({ id: config.id });
        if (this.state === STATES.STOPPING || this.state === STATES.STOPPED) {
            // the omnitron is stopping
            return;
        }
        if (!stopping && !stopped && config.autorestart && appmeta.get("immediateRestarts") < config.maxRestarts) {
            l.log("Try to restart the app");
            l.log("wait", config.restartDelay);
            appmeta.set("state", STATES.WAITING_FOR_RESTART);
            await adone.promise.delay(config.restartDelay);
            if (appmeta.get("state") !== STATES.WAITING_FOR_RESTART) {  // stopping or stopped
                return;
            }
            appmeta.set("state", STATES.RESTARTING);
            try {
                await this.start(config.name);
                return;
            } catch (err) {
                l.log("The restart failed");
                l.log(err.stack || err.message || err);
            }
        }
    }

    @Public
    @Description("Whether an application is started")
    @Type(Boolean)
    async started(config) {
        config = await this.deriveConfig(config);
        const appmeta = this.appmeta.get(config.id);
        const currentState = appmeta.get("state");
        return currentState === STATES.STARTED || currentState === STATES.RUNNING;
    }

    @Public
    async hasApplication(ident, { checkID = true } = {}) {
        if (checkID) {
            const id = Number(ident);
            if (id) {
                const res = await this.db.applications.findOne({ id });
                if (res) {
                    return true;
                }
            }
        }
        return Boolean(await this.db.applications.findOne({ name: ident }));
    }

    @Public
    @Description("Stop an application")
    async stop(config, { graceful = false, timeout = 2000 } = {}) {
        config = await this.deriveConfig(config);
        const { name, id } = config;
        if (!this.appmeta.has(id)) {
            throw new adone.x.IllegalState("Has not been started");
        }
        const appmeta = this.appmeta.get(id);
        const state = appmeta.get("state");
        logger.log(`stopping ${name}`);
        if (state === STATES.STOPPING || state === STATES.STOPPED) {
            logger.log(`${name} has been already stopped`);
            throw new adone.x.IllegalState("Has been already stopped");  // or just return?
        }
        const p = this.processes.get(id);
        if (state === STATES.STARTED) {
            clearTimeout(appmeta.get("startingTimer"));
        }
        if (p && p.process.alive) {
            appmeta.set("state", STATES.STOPPING);
            await p.process.exit({ graceful, timeout });
        } else {
            appmeta.set("state", STATES.STOPPED);
        }
    }

    @Public
    @Description("Manually restart an application, resetting the state")
    async restart(config, stopOpts, startOpts) {
        if (await this.started(config)) {
            await this.stop(config, stopOpts);
        }
        return this.start(config, startOpts);
    }

    @Public
    @Description("Reload an app")
    async reload(config, options) {
        config = await this.deriveConfig(config);
        const { mode, id } = config;
        if (mode !== "cluster") {
            throw new adone.x.IllegalState("Reloading is supported only in cluster mode");
        }
        const appmeta = this.appmeta.get(id);
        if (appmeta.get("state") !== STATES.RUNNING) {
            throw new adone.x.IllegalState("The application must be started");
        }
        const { process } = this.processes.get(id);
        appmeta.set("state", STATES.RELOADING);
        try {
            await process.reload(options);
        } finally {  // catch ???
            appmeta.set("state", STATES.RUNNING);
        }
    }

    @Public
    @Description("Scane an application working in cluster mode")
    async scale(config, instances, { graceful = true, timeout = 2000, store = true } = {}) {
        config = await this.deriveConfig(config);
        const { mode, id } = config;
        if (mode !== "cluster") {
            throw new adone.x.IllegalState("Scaling is supported only in cluster mode");
        }
        if (!is.number(instances) || instances <= 0) {
            throw new adone.x.InvalidArgument("'instances' must be a non-negative integer");
        }
        const appmeta = this.appmeta.get(id);
        if (appmeta.get("state") !== STATES.RUNNING) {
            throw new adone.x.IllegalState("The application must be started");
        }
        const { process } = this.processes.get(id);
        appmeta.set("state", STATES.SCALING);
        try {
            const res = await process.scale(instances, { graceful, timeout });
            if (store) {
                await this.db.applications.update({ id }, { $set: { instances } });
            }
            return res;
        } finally {
            appmeta.set("state", STATES.RUNNING);
        }
    }

    @Public
    async killWorker(config, id, { graceful = false, timeout = 2000 } = {}) {
        config = await this.deriveConfig(config);
        const { name, mode, id: appid } = config;
        if (mode !== "cluster") {
            throw new adone.x.IllegalState("Non clsuter applications have no workers");
        }
        if (!(await this.started(name))) {
            throw new adone.x.IllegalState("Has not been started");
        }
        const { process } = this.processes.get(appid);
        await process.killWorker(id, { graceful, timeout });
    }

    @Public
    async restartWorker(config, id, { graceful = true, timeout = 2000 } = {}) {
        config = await this.deriveConfig(config);
        const { name, mode, id: appid } = config;
        if (mode !== "cluster") {
            throw new adone.x.IllegalState("Non cluster applications have no workers");
        }
        if (!(await this.started(name))) {
            throw new adone.x.IllegalState("Has not been started");
        }
        const workermeta = this.appmeta.get(appid).get("workers").get(id);
        const { process } = this.processes.get(appid);
        if (config.autorestart) {
            workermeta.set("immediateRestarts", 0);  // manual restart
            await process.killWorker(id, { graceful, timeout });  // the restarting will be handled by _onWorkerExit
        } else {
            workermeta.set("state", STATES.RESTARTING);
            await process.restartWorker(id, { graceful, timeout });
        }
    }

    @Public
    async workers(config) {
        config = await this.deriveConfig(config);
        const { name, mode, id } = config;
        if (mode !== "cluster") {
            throw new adone.x.IllegalState("Non clsuter applications have no workers");
        }
        if (!(await this.started(name))) {
            throw new adone.x.IllegalState("Has not been started");
        }
        const { process } = this.processes.get(id);
        return process.workers;
    }

    @Public
    @Description("Delete an application")
    async delete(config, stopOpts) {
        config = await this.deriveConfig(config);
        if (await this.started(config)) {
            await this.stop(config, stopOpts);
        }
        await this.db.applications.remove({ id: config.id });
        this.appmeta.delete(config.id);
        // TODO delete the storage
    }

    @Public
    @Description("Get the process for an application")
    async getProcess(config) {
        const { id } = await this.deriveConfig(config);
        if (!this.processes.has(id)) {
            throw new adone.x.Exception("Has not been started");
        }
        const { iProcess } = this.processes.get(id);
        return iProcess;
    }

    @Public
    async stdoutPath(config) {
        config = await this.deriveConfig(config);
        return config.stdout;
    }

    @Public
    @Description("Get the rest of the stdout")
    async tailStdout(config, lines = 10) {
        config = await this.deriveConfig(config);
        return adone.fs.tail(config.stdout, lines);
    }

    @Public
    @Description("Get the rest of the stderr")
    async tailStderr(config, lines = 10) {
        config = await this.deriveConfig(config);
        return adone.fs.tail(config.stderr, lines);
    }

    @Public
    async usage(config) {
        const { id: appid } = await this.deriveConfig(config);
        if (!this.processes.has(appid)) {
            return { main: { cpu: null, memory: null } };
        }
        const { process } = this.processes.get(appid);
        if (!process.alive) {
            return { main: { cpu: null, memory: null } };
        }
        const main = await this.usageProvider.lookup(process.pid);
        if (!process.cluster) {
            return { main };
        }
        const workers = {};
        for (const [id, { pid, alive }] of _.entries(process.workers)) {
            if (!alive) {
                workers[id] = { cpu: null, memory: null };
            } else {
                workers[id] = await this.usageProvider.lookup(pid);
            }
        }
        return { main, workers };
    }

    @Public
    async uptime(config) {
        const { id: appid } = await this.deriveConfig(config);
        if (!this.processes.has(appid)) {
            return { main: null };
        }
        const { process, runtime } = this.processes.get(appid);
        if (!process.alive) {
            return { main: null };
        }
        const main = new Date().getTime() - runtime.timestamps.started;
        if (!process.cluster) {
            return { main };
        }
        const workers = {};
        const now = new Date().getTime();
        for (const [id, { appeared, alive }] of _.entries(process.workers)) {
            workers[id] = alive ? now - appeared : null;
        }
        return { main, workers };
    }

    @Public
    @Description("List all the applications")
    async list() {
        const { db } = this;
        let apps = await db.applications.find({});
        apps = apps.sort((a, b) => a.id - b.id);
        const res = [];
        for (const { id, name, mode } of apps) {
            const appmeta = this.appmeta.get(id);
            const app = {
                id,
                name,
                mode,
                pid: null,
                usage: await this.usage(name),
                uptime: await this.uptime(name),
                state: humanizeState(appmeta.get("state")).toLowerCase(),
                restarts: appmeta.get("restarts"),
                immediateRestarts: appmeta.get("immediateRestarts"),
                lastRestartTimestamp: appmeta.get("lastRestartTimestamp"),
                alive: false
            };
            if (await this.started(name)) {
                app.alive = true;
                const { process } = this.processes.get(id);
                app.pid = process.pid;
                if (process.cluster) {
                    const _workers = process.workers;
                    const workersmeta = appmeta.get("workers");
                    const workers = [];
                    const ids = _.keys(_workers).map(Number).sort((a, b) => a - b);
                    for (const id of ids) {
                        const workermeta = workersmeta.get(Number(id));
                        const worker = _workers[id];
                        worker.id = id;
                        worker.pid = worker.alive ? worker.pid : null;
                        worker.state = humanizeState(workermeta.get("state")).toLowerCase();
                        worker.restarts = workermeta.get("restarts");
                        worker.immediateRestarts = workermeta.get("immediateRestarts");
                        worker.lastRestartTimestamp = appmeta.get("lastRestartTimestamp");
                        workers.push(worker);
                    }
                    app.workers = workers;
                }
            }
            res.push(app);
        }
        return res;
    }

    @Public
    async updateConfig(oldConfig, newConfig) {
        oldConfig = await this.deriveConfig(oldConfig);
        if (!is.object(newConfig)) {
            throw new adone.x.InvalidArgument("Should be an object");
        }
        delete newConfig.id;  // prevent id changing
        if ("name" in newConfig) {
            const { name } = newConfig;
            if (await this.hasApplication(name, { checkID: false })) {
                throw new adone.x.IllegalState("An application with that name already exists");
            }
        }
        newConfig = _.defaultsDeep(newConfig, oldConfig);
        await this.updateDBConfig(newConfig);
    }

    @Public
    runtimeDB() {
        return this.db.runtime.find({});
    }

    @Public
    appsDB() {
        return this.db.applications.find({});
    }
}
