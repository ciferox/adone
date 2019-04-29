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
    let superRealm = new realm.RealmManager({
        cwd
    });
    try {
        // Validation...

        // try to require realm config
        require(std.path.join(superRealm.cwd, ".adone", "config.json"));

        // try to require package.json
        require(std.path.join(superRealm.cwd, "package.json"));
    } catch (err) {
        superRealm = null;
    }
    return superRealm;
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

        this.config = realm.Configuration.loadSync({
            cwd
        });

        adone.lazify({
            devConfig: () => {
                let cfg;
                try {
                    cfg = realm.DevConfiguration.loadSync({
                        cwd
                    });
                } catch (err) {
                    cfg = null;
                }
                return cfg;
            }
        }, this)

        this.package = require(std.path.join(cwd, "package.json"));

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
                const tasksBasePath = this.getPath(tasksConfig.basePath);

                if (fs.existsSync(tasksBasePath)) {
                    if (is.object(tasksConfig.tags)) {
                        for (const [tag, path] of Object.entries(tasksConfig.tags)) {
                            await this.loadTasksFrom(std.path.join(tasksBasePath, path), {
                                transpile: options.transpile,
                                tag
                            });
                        }
                    }
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
        return std.path.join(this.cwd, ...args);
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
            const parentPath = std.path.dirname(this.cwd);
            const baseName = std.path.basename(parentPath);
            if (baseName === "opt") {
                this.#superRealm = trySuperRealmAt(std.path.dirname(parentPath));
            }
            // check 'dev' section for merge information
            if (is.null(this.#superRealm)) {
                try {
                    const devConfig = adone.realm.DevConfiguration.loadSync({
                        cwd: this.cwd
                    });

                    if (is.string(devConfig.raw.superRealm)) {
                        this.#superRealm = trySuperRealmAt(devConfig.raw.superRealm);
                    }
                } catch (err) {
                    //

                }
            }
            return is.null(this.#superRealm) ? 0 : 1;
        }
        return 2;
    }
}
