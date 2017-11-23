const {
    application: { locking },
    is,
    fs,
    std,
    task,
    text,
    util,
    realm
} = adone;

export default class RealmManager extends task.Manager {
    constructor(id) {
        super();

        this.id = id;
        this.bar = null;
        this.silent = false;
        this.typeHandler = null;
    }

    addTypeHandler(typeName, handler) {
    }

    createTypeHandler(typeName) {
        const HandlerClass = this.typeHandler[typeName];

        if (!is.class(HandlerClass)) {
            throw new adone.x.NotSupported(`Unsupported type: ${typeName}`);
        }

        return new HandlerClass(this);
    }

    registerComponent(adoneConf, destPath) {
        return this.createTypeHandler(adoneConf.raw.type).register(adoneConf, destPath);
    }

    unregisterComponent(adoneConf) {
        return this.createTypeHandler(adoneConf.raw.type).unregister(adoneConf);
    }

    async install(options) {
        let observer = null;
        if (!is.plainObject(options) || !is.string(options.name)) {
            throw new adone.x.InvalidArgument("Install options is not valid");
        }
        await this.lock();
        observer = await this.run("install", options);
        await observer.finally(() => this.unlock());
        return observer;
    }

    async uninstall(options) {
        await this.lock();
        const observer = await this.run("uninstall", options);
        await observer.finally(() => this.unlock());
        return observer;
    }

    async list(options) {
        await this.lock();
        const observer = await this.run("list", options);
        await observer.finally(() => this.unlock());
        return observer;
    }

    async snapshot(options) {

    }

    // listFiles({ adone = true, extensions = true, apps = true, configs = true, data = true, logs = true } = {}) {
    //     const srcPaths = [];
    //     if (configs) {
    //         srcPaths.push(std.path.join(adone.realm.config.configsPath, "**/*"));
    //     }

    //     if (adone) {

    //     }
    // }

    async lock() {
        // Force create runtime directory.
        await adone.realm.createDirs();
        return locking.create(adone.realm.config.lockFilePath);
    }

    async unlock() {
        if (await locking.check(adone.realm.config.lockFilePath)) {
            return locking.release(adone.realm.config.lockFilePath);
        }
    }

    setSilent(silent) {
        this.silent = silent;
    }

    _createProgress({ schema = " :spinner" } = {}) {
        if (!this.silent) {
            this.bar = adone.runtime.term.progress({
                schema
            });
            this.bar.update(0);
        }
    }

    _updateProgress({ schema, result = null } = {}) {
        if (!is.null(this.bar) && !this.silent) {
            this.bar.setSchema(schema);
            is.boolean(result) && this.bar.complete(result);
        }
    }

    static async create() {
        const id = adone.math.hash("sha256", `${await util.machineId(true)}${adone.realm.config.realm}`);
        const manager = new adone.realm.Manager(id);

        // Add default tasks
        await manager.addTask("install", realm.task.Install);
        await manager.addTask("uninstall", realm.task.Uninstall);
        await manager.addTask("list", realm.task.List);

        // Add default type handlers
        const handlerNames = adone.std.fs.readdirSync(std.path.join(__dirname, "handlers")).filter((name) => name.endsWith(".js"));
        const handlers = {};

        for (const name of handlerNames) {
            handlers[std.path.basename(name, ".js").replace(/_/g, ".")] = `.${adone.std.path.sep}${std.path.join("handlers", name)}`;
        }

        manager.typeHandler = adone.lazify(handlers, null, require);

        return manager;
    }
}
