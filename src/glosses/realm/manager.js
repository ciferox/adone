const {
    app: { lockfile },
    error,
    is,
    fs,
    realm,
    task,
    std,
    util
} = adone;

const CONNECTED = Symbol();
const CONNECTING = Symbol();
const SUPER_REALM = Symbol();

const checkEntry = (entry) => {
    if (is.nil(entry.dst)) {
        return false;
    }

    if (!is.string(entry.task)) {
        entry.task = "copy";
    }

    return true;
};

const loadTasks = (path, index) => {
    let indexFile;
    if (is.string(index)) {
        indexFile = index;
    } else {
        indexFile = "index.js";
    }
    const fullPath = std.path.join(path, indexFile);
    if (fs.existsSync(fullPath)) {
        const mod = adone.require(fullPath);
        return mod.default
            ? mod.default
            : mod;
    }
    return {};
};

const trySuperRealmAt = (cwd) => {
    let superRealm = new realm.Manager({
        cwd
    });
    try {
        // Validation...

        // try to require realm config
        require(std.path.join(superRealm.SPECIAL_PATH, "config.json"));

        // try to require package.json
        require(std.path.join(superRealm.ROOT_PATH, "package.json"));
    } catch (err) {
        superRealm = null;
    }
    return superRealm;
};

export default class RealmManager extends task.Manager {
    constructor({ cwd = process.cwd() } = {}) {
        super();

        if (!is.string(cwd)) {
            throw new error.NotValidException(`Invalid type of cwd: ${adone.typeOf(cwd)}`);
        }
        this.cwd = cwd;

        this.ROOT_PATH = std.path.join(cwd);
        this.BIN_PATH = std.path.join(cwd, "bin");
        this.RUNTIME_PATH = std.path.join(cwd, "run");
        this.ETC_PATH = std.path.join(cwd, "etc");
        this.OPT_PATH = std.path.join(cwd, "opt");
        this.VAR_PATH = std.path.join(cwd, "var");
        this.SHARE_PATH = std.path.join(cwd, "share");
        this.LIB_PATH = std.path.join(cwd, "lib");
        this.LOGS_PATH = std.path.join(cwd, "var", "logs");
        this.SPECIAL_PATH = std.path.join(cwd, ".adone");
        this.SRC_PATH = std.path.join(cwd, "src");
        this.TESTS_PATH = std.path.join(cwd, "tests");
        this.PACKAGES_PATH = std.path.join(cwd, "node_modules");
        this.LOCKFILE_PATH = std.path.join(cwd, "realm.lock");

        this.config = realm.Configuration.loadSync({
            cwd
        });
        this.package = require(std.path.join(cwd, "package.json"));

        // this.typeHandler = null;

        // Super realm instance
        this[SUPER_REALM] = null;

        // Scan for super realm
        const parentPath = std.path.dirname(this.cwd);
        const baseName = std.path.basename(parentPath);
        if (baseName === "opt") {
            this[SUPER_REALM] = trySuperRealmAt(std.path.dirname(parentPath));
        }
        // check 'dev' section for merge information
        if (is.null(this[SUPER_REALM]) && is.object(this.config.raw.dev) && is.string(this.config.raw.dev.merged)) {
            this[SUPER_REALM] = trySuperRealmAt(this.config.raw.dev.merged);
        }

        this[CONNECTED] = false;
        this[CONNECTING] = false;
    }

    get name() {
        return this.package.name;
    }

    get connected() {
        return this[CONNECTED];
    }

    get superRealm() {
        return this[SUPER_REALM];
    }

    async connect({ tag } = {}) {
        if (this[CONNECTED] || this[CONNECTING]) {
            return;
        }
        this[CONNECTING] = true;

        try {
            if (!is.null(this.superRealm)) {
                await this.superRealm.connect({ tag: realm.TAG_PUB });
            }

            const tags = {};
            tag = util.arrify(tag);
            const tasksConfig = this.config.raw.tasks;
            if (is.object(tasksConfig) && is.string(tasksConfig.basePath)) {
                const basePath = std.path.join(this.cwd, tasksConfig.basePath);
                if (fs.existsSync(basePath)) {
                    if (is.object(tasksConfig.tags)) {
                        for (const [t, indexFile] of Object.entries(tasksConfig.tags)) {
                            if (tag.length === 0 || tag.includes(t)) {
                                tags[t] = loadTasks(basePath, indexFile);
                            }
                        }
                    } else if (tag.length === 0 || tag.includes(realm.TAG_PUB)) {
                        // If tags not specified in config, then allow only pub tasks with default index file
                        tags[realm.TAG_PUB] = loadTasks(basePath, "index.js");
                    }
                }
            }

            for (const [tag, tasks] of Object.entries(tags)) {
                for (const [name, TaskClass] of Object.entries(tasks)) {
                    // eslint-disable-next-line no-await-in-loop
                    await this.addTask(name, TaskClass, {
                        tag
                    });
                }
            }

            // Add default type handlers
            // const handlerNames = (await adone.fs.readdir(std.path.join(__dirname, "handlers"))).filter((name) => name.endsWith(".js"));
            // const handlers = {};

            // for (const name of handlerNames) {
            //     handlers[std.path.basename(name, ".js").replace(/_/g, ".")] = `.${adone.std.path.sep}${std.path.join("handlers", name)}`;
            // }

            // this.typeHandler = adone.lazify(handlers, null, require);
            this[CONNECTED] = true;
        } catch (err) {
            this[CONNECTED] = false;
            throw err;
        } finally {
            this[CONNECTING] = false;
        }
    }

    hasTask(name) {
        let result = super.hasTask(name);
        if (!result && !is.null(this.superRealm)) {
            result = this.superRealm.hasTask(name);
        }
        return result;
    }

    getTask(name) {
        let taskInfo;
        try {
            taskInfo = super.getTask(name);
        } catch (err) {
            if (!is.null(this.superRealm)) {
                return this.superRealm.getTask(name);
            }
            throw err;
        }
        return taskInfo;
    }

    getTaskClass(name) {
        let TaskCls;
        try {
            TaskCls = super.getTaskClass(name);
        } catch (err) {
            if (!is.null(this.superRealm)) {
                return this.superRealm.getTaskClass(name);
            }
            throw err;
        }
        return TaskCls;
    }

    getTaskNames() {
        const result = super.getTaskNames();
        if (!is.null(this.superRealm)) {
            const superTasks = this.superRealm.getTaskNames();
            result.push(...superTasks.filter((name) => !result.includes(name)));
        }
        return result;
    }

    deleteTask(/*name*/) {
        throw new error.NotAllowedException("Not allowed to delete task");
    }

    async deleteAllTasks() {
        throw new error.NotAllowedException("Not allowed to delete all tasks");
    }

    async deleteTasksByTag(/*tag*/) {
        throw new error.NotAllowedException("Not allowed to delete task by tag");
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

    // addTypeHandler(typeName, handler) {
    // }

    // getTypeHandler(typeName) {
    //     const HandlerClass = this.typeHandler[typeName];

    //     if (!is.class(HandlerClass)) {
    //         throw new error.NotSupportedException(`Unsupported type: ${typeName}`);
    //     }

    //     return new HandlerClass(this);
    // }

    // getAllTypeHandlers() {
    //     return Object.keys(this.typeHandler).map((name) => {
    //         const THClass = this.typeHandler[name];
    //         return new THClass(this);
    //     });
    // }

    // registerComponent(adoneConf, destPath) {
    //     return this.getTypeHandler(adoneConf.raw.type).register(adoneConf, destPath);
    // }

    // unregisterComponent(adoneConf) {
    //     return this.getTypeHandler(adoneConf.raw.type).unregister(adoneConf);
    // }

    async run(name, ...args) {
        try {
            const result = await super.run(name, ...args);
            return result;
        } catch (err) {
            if (err instanceof error.NotExistsException && !is.null(this.superRealm)) {
                return this.superRealm.run(name, ...args);
            }
            throw err;
        }
    }

    async runSafe(name, ...args) {
        await this.lock();
        const observer = await this.run(name, ...args);
        await observer.finally(() => this.unlock());
        return observer;
    }

    async lock() {
        return lockfile.create(this.ROOT_PATH, {
            lockfilePath: this.LOCKFILE_PATH
        });
    }

    async unlock() {
        const options = {
            lockfilePath: this.LOCKFILE_PATH
        };
        if (await lockfile.check(this.ROOT_PATH, options)) {
            return lockfile.release(this.ROOT_PATH, options);
        }
    }
}
