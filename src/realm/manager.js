const {
    application: { lockfile },
    is,
    task,
    std
} = adone;

const {
    join
} = require("path");

const __ = adone.lazify({
    task: "./tasks"
}, null, require);

export default class RealmManager extends task.Manager {
    constructor({ cwd }) {
        super();

        if (!is.string(cwd)) {
            throw new adone.error.NotValid(`Invalid type of cwd: ${adone.meta.typeOf(cwd)}`);
        }

        const ROOT_PATH = cwd;
        const RUNTIME_PATH = join(ROOT_PATH, "runtime");
        const VAR_PATH = join(ROOT_PATH, "var");
        const CONFIGS_PATH = join(ROOT_PATH, "configs");
        const omnitronVarPath = join(VAR_PATH, "omnitron");
        const omnitronDataPath = join(omnitronVarPath, "data");
        const LOGS_PATH = join(VAR_PATH, "logs");
        const omnitronLogsPath = join(LOGS_PATH, "omnitron");
        
        this.cwd = cwd;
        this.config = {
            ROOT_PATH,
            RUNTIME_PATH,
            CONFIGS_PATH,
            VAR_PATH,
            LOGS_PATH,
            KEYS_PATH: join(ROOT_PATH, "keys"),
            PACKAGES_PATH: join(ROOT_PATH, "packages"),
            LOCKFILE_PATH: join(RUNTIME_PATH, "realm"),
            devmntPath: join(CONFIGS_PATH, "devmnt.json"),
        
            omnitron: {
                LOGS_PATH: omnitronLogsPath,
                LOGFILE_PATH: join(omnitronLogsPath, "omnitron.log"),
                ERRORLOGFILE_PATH: join(omnitronLogsPath, "omnitron-err.log"),
                PIDFILE_PATH: join(RUNTIME_PATH, "omnitron.pid"),
                VAR_PATH: omnitronVarPath,
                DATA_PATH: omnitronDataPath,
                SERVICES_PATH: join(omnitronVarPath, "services"),
                DB_PATH: join(omnitronVarPath, "db")
            }
        };

        adone.lazify({
            identity: std.path.join(this.config.CONFIGS_PATH, "identity.json")
        }, this.config);

        this.typeHandler = null;
        this.peerInfo = null;
    }

    async initialize() {
        await this.addTask("install", __.task.Install);
        await this.addTask("uninstall", __.task.Uninstall);
        await this.addTask("mount", __.task.Mount);
        await this.addTask("unmount", __.task.Unmount);
        await this.addTask("list", __.task.List);
        await this.addTask("createRealm", __.task.CreateRealm);
        await this.addTask("forkRealm", __.task.ForkRealm);
        await this.addTask("validateRealm", __.task.ValidateRealm);

        // Add default type handlers
        const handlerNames = (await adone.fs.readdir(std.path.join(__dirname, "handlers"))).filter((name) => name.endsWith(".js"));
        const handlers = {};

        for (const name of handlerNames) {
            handlers[std.path.basename(name, ".js").replace(/_/g, ".")] = `.${adone.std.path.sep}${std.path.join("handlers", name)}`;
        }

        this.typeHandler = adone.lazify(handlers, null, require);
    }

    addTypeHandler(typeName, handler) {
    }

    getTypeHandler(typeName) {
        const HandlerClass = this.typeHandler[typeName];

        if (!is.class(HandlerClass)) {
            throw new adone.error.NotSupported(`Unsupported type: ${typeName}`);
        }

        return new HandlerClass(this);
    }

    getAllTypeHandlers() {
        return Object.keys(this.typeHandler).map((name) => {
            const THClass = this.typeHandler[name];
            return new THClass(this);
        });
    }

    registerComponent(adoneConf, destPath) {
        return this.getTypeHandler(adoneConf.raw.type).register(adoneConf, destPath);
    }

    unregisterComponent(adoneConf) {
        return this.getTypeHandler(adoneConf.raw.type).unregister(adoneConf);
    }

    async runGraceful(name, ...args) {
        await this.lock();
        const observer = await this.run(name, ...args);
        await observer.finally(() => this.unlock());
        return observer;
    }

    async forkRealm(options) {
        return this.runGraceful("forkRealm", options);
    }

    async createRealm(options) {
        return this.runGraceful("createRealm", options);
    }

    async validateRealm(options) {
        return this.runGraceful("validateRealm", options);
    }

    async install(options) {
        if (!is.plainObject(options) || !is.string(options.name)) {
            throw new adone.error.InvalidArgument("Install options is not valid");
        }
        return this.runGraceful("install", options);
    }

    async uninstall(options) {
        return this.runGraceful("uninstall", options);
    }

    async mount(options) {
        return this.runGraceful("mount", options);
    }

    async unmount(options) {
        return this.runGraceful("unmount", options);
    }

    async list(options) {
        return this.runGraceful("list", options);
    }

    async snapshot(options) {

    }

    // listFiles({ adone = true, extensions = true, apps = true, configs = true, data = true, logs = true } = {}) {
    //     const srcPaths = [];
    //     if (configs) {
    //         srcPaths.push(std.path.join(this.config.configsPath, "**/*"));
    //     }

    //     if (adone) {

    //     }
    // }

    async lock() {
        return lockfile.create(this.config.LOCKFILE_PATH);
    }

    async unlock() {
        if (await lockfile.check(this.config.LOCKFILE_PATH)) {
            return lockfile.release(this.config.LOCKFILE_PATH);
        }
    }
}
