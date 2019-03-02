const {
    app: { lockfile },
    error,
    is,
    realm: { Configuration },
    task,
    std
} = adone;

const INITIALIZED = Symbol();

const checkEntry = (entry) => {
    if (is.nil(entry.dst)) {
        return false;
    }

    if (!is.string(entry.task)) {
        entry.task = "copy";
    }

    return true;
};

export default class RealmManager extends task.Manager {
    constructor({ cwd = process.cwd() } = {}) {
        super();

        if (!is.string(cwd)) {
            throw new error.NotValidException(`Invalid type of cwd: ${adone.meta.typeOf(cwd)}`);
        }
        this.cwd = cwd;

        adone.lazify({
            config: () => Configuration.loadSync({
                cwd
            }),
            package: std.path.join(cwd, "package.json"),
            tasks: std.path.join(cwd, ".adone", "tasks"),
            env: std.path.join(cwd, ".adone", "env"),
            identity: std.path.join(cwd, ".adone", "identity.json")
        }, this, adone.require);

        this.typeHandler = null;
        // this.peerInfo = null;
        this[INITIALIZED] = false;
    }

    get initialized() {
        return this[INITIALIZED];
    }

    async initialize() {
        if (this[INITIALIZED]) {
            throw new error.IllegalStateException("Realm manager already initialized");
        }
        this[INITIALIZED] = true;

        // Load realm tasks
        try {
            const tasks = this.tasks;
            for (const [name, TaskClass] of Object.entries(tasks)) {
                // eslint-disable-next-line no-await-in-loop
                await this.addTask(name, TaskClass);
            }
        } catch (err) {
            //
        }

        // Add default type handlers
        const handlerNames = (await adone.fs.readdir(std.path.join(__dirname, "handlers"))).filter((name) => name.endsWith(".js"));
        const handlers = {};

        for (const name of handlerNames) {
            handlers[std.path.basename(name, ".js").replace(/_/g, ".")] = `.${adone.std.path.sep}${std.path.join("handlers", name)}`;
        }

        this.typeHandler = adone.lazify(handlers, null, require);
    }

    getEntries({ path, onlyNative = false, excludeVirtual = true } = {}) {
        let entries = this.config.getEntries(path);

        if (onlyNative) {
            const result = [];
            for (const entry of entries) {
                if (is.plainObject(entry.native)) {
                    result.push(entry);
                }
            }

            entries = result;
        }

        return excludeVirtual
            ? entries.filter(checkEntry)
            : entries;
    }

    addTypeHandler(typeName, handler) {
    }

    getTypeHandler(typeName) {
        const HandlerClass = this.typeHandler[typeName];

        if (!is.class(HandlerClass)) {
            throw new error.NotSupportedException(`Unsupported type: ${typeName}`);
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

    async runSafe(name, ...args) {
        await this.lock();
        const observer = await this.run(name, ...args);
        await observer.finally(() => this.unlock());
        return observer;
    }

    async lock() {
        return lockfile.create(this.env.ROOT_PATH, {
            lockfilePath: this.env.LOCKFILE_PATH
        });
    }

    async unlock() {
        const options = {
            lockfilePath: this.env.LOCKFILE_PATH
        };
        if (await lockfile.check(this.env.ROOT_PATH, options)) {
            return lockfile.release(this.env.ROOT_PATH, options);
        }
    }
}
