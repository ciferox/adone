const {
    app: { lockfile },
    error,
    is,
    fs,
    path: aPath, 
    realm,
    task,
    std,
    util
} = adone;

const checkEntry = (entry) => {
    if (is.nil(entry.dst)) {
        return false;
    }

    if (!is.string(entry.task)) {
        entry.task = "copy";
    }

    return true;
};

const trySuperRealmAt = (cwd) => {
    try {
        // Validation...

        // try to require realm config
        require(aPath.join(cwd, ".adone", "config.json"));

        // try to require package.json
        require(aPath.join(cwd, "package.json"));

        return new realm.RealmManager({
            cwd
        });
    } catch (err) {
        //
    }
    return null;
};

export default class RealmManager extends task.TaskManager {
    #connected = false;

    #connectiong = false;

    #connectOptions = {};

    #superRealm = null;

    constructor({ cwd = process.cwd() } = {}) {
        super();

        if (!is.string(cwd)) {
            throw new error.NotValidException(`Invalid type of cwd: ${adone.typeOf(cwd)}`);
        }
        this.cwd = cwd;

        try {
            this.config = realm.Configuration.loadSync({
                cwd
            });
        } catch (err) {
            this.config = new realm.Configuration({
                cwd
            });
        }

        adone.lazify({
            devConfig: () => {
                let cfg;
                try {
                    cfg = realm.DevConfiguration.loadSync({
                        cwd
                    });
                } catch (err) {
                    if (err.code && err.code === "MODULE_NOT_FOUND") {
                        cfg = new realm.DevConfiguration({
                            cwd
                        });
                    } else {
                        throw err;
                    }
                }
                return cfg;
            }
        }, this)

        this.package = require(aPath.join(cwd, "package.json"));

        this.#checkSuperRealm();
    }

    get name() {
        return this.package.name;
    }

    get connected() {
        return this.#connected;
    }

    get superRealm() {
        return this.#superRealm;
    }

    async connect(options = {}) {
        if (this.#connected || this.#connectiong) {
            return;
        }
        this.#connectiong = true;
        this.#connectOptions = options;

        try {
            const tasksConfig = this.config.raw.tasks;
            if (is.object(tasksConfig) && is.string(tasksConfig.basePath)) {
                let tasksBasePath = this.getPath(tasksConfig.basePath);

                const loadTasks = async (basePath) => {
                    if (is.object(tasksConfig.tags)) {
                        for (const [tag, path] of Object.entries(tasksConfig.tags)) {
                            await this.loadTasksFrom(aPath.join(basePath, path), {
                                transpile: options.transpile,
                                tag
                            });
                        }
                    }
                };

                if (fs.existsSync(tasksBasePath)) {
                    await loadTasks(tasksBasePath);
                } else if (is.string(tasksConfig.altBasePath)) {
                    tasksBasePath = this.getPath(tasksConfig.altBasePath);
                    fs.existsSync(tasksBasePath) && await loadTasks(tasksBasePath);
                }

                if (tasksConfig.default !== false) {
                    const ignore = is.object(tasksConfig.tags)
                        ? [...Object.values(tasksConfig.tags)]
                        : [];
                    await this.loadTasksFrom(tasksBasePath, {
                        transpile: options.transpile,
                        ignore
                    });
                }
            }

            if (this.#checkSuperRealm()) {
                await this.#connectSuperRealm(options);
            }

            this.artifacts = await realm.RealmArtifacts.collect(this);

            this.#connected = true;
        } catch (err) {
            this.#connected = false;
            throw err;
        } finally {
            this.#connectiong = false;
        }
    }

    getPath(...args) {
        return aPath.join(this.cwd, ...args);
    }

    async run(name, ...args) {
        let result;
        try {
            result = await super.run(name, ...args);
            return result;
        } catch (err) {
            if (err instanceof error.NotExistsException) {                
                if (this.#checkSuperRealm() === 1) {
                    await this.#connectSuperRealm(this.#connectOptions);
                }
                if (!is.null(this.superRealm)) {
                    // try again
                    return super.run(name, ...args);
                }
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
        return lockfile.create(this.cwd, {
            lockfilePath: this.LOCKFILE_PATH
        });
    }

    async unlock() {
        const options = {
            lockfilePath: this.LOCKFILE_PATH
        };
        if (await lockfile.check(this.cwd, options)) {
            return lockfile.release(this.cwd, options);
        }
    }

    async #connectSuperRealm(options) {
        // Use resources from super realm.
        if (!is.null(this.superRealm)) {
            await this.superRealm.connect(options);

            // add tasks from super realm
            const tasks = this.superRealm.getTasksByTag(realm.TAG.PUB);
            for (const taskInfo of tasks) {
                if (!this.hasTask(taskInfo.name)) {
                    // eslint-disable-next-line no-await-in-loop
                    await this.addTask({
                        name: taskInfo.name,
                        task: taskInfo.Class,
                        ...util.pick(taskInfo, ["suspendable", "cancelable", "concurrency", "interval", "singleton", "description", "tag"])
                    });
                }
            }
        }
    }

    #checkSuperRealm() {
        if (is.null(this.superRealm)) {
            // Scan for super realm
            const parentPath = aPath.dirname(this.cwd);
            const baseName = aPath.basename(parentPath);

            // Nested realms are always in the 'opt' directory of the parent realm.
            // So, we can check parent/super if detect such directory name
            if (baseName === "opt") {
                this.#superRealm = trySuperRealmAt(aPath.dirname(parentPath));
            }
            // check 'superRealm' property in configuration
            if (is.null(this.#superRealm)) {
                if (is.string(this.config.raw.superRealm)) {
                    // Here we have two cases
                    // 1. relative path: name of the globally installed realm
                    // 2. absolute path to realm root
                    if (aPath.isAbsolute(this.config.raw.superRealm)) {
                        this.#superRealm = trySuperRealmAt(this.config.raw.superRealm);
                    } else {
                        try {
                            const resolvedPath = adone.require.resolve(this.config.raw.superRealm);
                            this.#superRealm = trySuperRealmAt(resolvedPath);
                        } catch (err) {
                            // nothing to do
                        }
                    }
                } else if (adone.cwd !== this.cwd) {
                    // default super-realm is ADONE
                    this.#superRealm = trySuperRealmAt(adone.cwd);
                }
            }
            return is.null(this.#superRealm) ? 0 : 1;
        }
        return 2;
    }
}
