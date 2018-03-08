const {
    application: { lockfile },
    is,
    std,
    task,
    util,
    realm
} = adone;

export default class RealmManager extends task.Manager {
    constructor(id) {
        super();

        this.id = id;
        this.bar = null;
        this.typeHandler = null;
        this.peerInfo = null;
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
            return new THClass();
        });
    }

    registerComponent(adoneConf, destPath) {
        return this.getTypeHandler(adoneConf.raw.type).register(adoneConf, destPath);
    }

    unregisterComponent(adoneConf) {
        return this.getTypeHandler(adoneConf.raw.type).unregister(adoneConf);
    }

    async install(options) {
        let observer = null;
        if (!is.plainObject(options) || !is.string(options.name)) {
            throw new adone.error.InvalidArgument("Install options is not valid");
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

    async mount(options) {
        await this.lock();
        const observer = await this.run("mount", options);
        await observer.finally(() => this.unlock());
        return observer;
    }

    async unmount(options) {
        await this.lock();
        const observer = await this.run("unmount", options);
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
        return lockfile.create(adone.realm.config.LOCKFILE_PATH);
    }

    async unlock() {
        if (await lockfile.check(adone.realm.config.LOCKFILE_PATH)) {
            return lockfile.release(adone.realm.config.LOCKFILE_PATH);
        }
    }

    static async create() {
        const id = adone.crypto.hash.sha256(`${await util.machineId(true)}${adone.realm.config.realm}`, "hex");
        const manager = new adone.realm.Manager(id);

        // Add default tasks
        await manager.addTask("install", realm.task.Install);
        await manager.addTask("uninstall", realm.task.Uninstall);
        await manager.addTask("mount", realm.task.Mount);
        await manager.addTask("unmount", realm.task.Unmount);
        await manager.addTask("list", realm.task.List);
        await manager.addTask("create", realm.task.Create);
        await manager.addTask("fork", realm.task.Fork);

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
