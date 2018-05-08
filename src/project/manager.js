const {
    configuration,
    is,
    fs,
    std,
    task,
    project,
    runtime: { term }
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

export default class ProjectManager extends task.Manager {
    constructor({ cwd = process.cwd() } = {}) {
        super();
        this.name = null;
        this.cwd = cwd;
        this.config = null;
        this._loaded = false;
        this.GeneratorClass = project.generator.Manager;
        this.generator = null;
    }

    async onNotification(selector, observer) {
        await super.onNotification(selector, observer);

        const generator = await this.getGenerator();
        await generator.onNotification(selector, observer);
    }

    useGenerator(GeneratorClass) {
        this.GeneratorClass = GeneratorClass;
    }

    getVersion() {
        return this.config.raw.version;
    }

    async load() {
        if (this._loaded) {
            throw new adone.error.IllegalState("Project already loaded");
        }

        this.config = await configuration.Adone.load({
            cwd: this.cwd
        });

        // Add default tasks
        await this.addTask("clean", project.task.Clean);
        await this.addTask("copy", project.task.Copy);
        await this.addTask("transpile", project.task.Transpile);
        await this.addTask("transpileExe", project.task.TranspileExe);
        await this.addTask("watch", project.task.Watch);
        await this.addTask("incver", project.task.IncreaseVersion);
        await this.addTask("nbuild", project.task.NBuild);
        await this.addTask("nclean", project.task.NClean);

        // Load custom tasks
        const tasksPath = std.path.join(this.cwd, ".adone", "tasks.js");
        if (await fs.exists(tasksPath)) {
            let customTasks = adone.require(tasksPath);
            if (customTasks.__esModule === true && is.object(customTasks.default)) {
                customTasks = customTasks.default;
            }

            for (const [name, CustomTask] of Object.entries(customTasks)) {
                await this.addTask(name, CustomTask); // eslint-disable-line
            }
        }

        this._loaded = true;
    }

    async createProject(info) {
        const generator = await this.getGenerator();
        const context = await generator.createProject({
            ...info,
            cwd: this.cwd
        });

        await this.load();

        this.notify(this, "progress", {
            message: `project ${term.theme.primary.bold(info.name)} successfully created`,
            result: true
        });
        return context;
    }

    async createSubProject(info) {
        this._checkLoaded();
        const generator = await this.getGenerator();
        const context = await generator.createSubProject(info);
        await this.config.load();

        this.notify(this, "progress", {
            message: `sub project ${term.theme.primary.bold(info.name)} successfully created`,
            result: true
        });
        return context;
    }

    async createFile(input) {
        const generator = await this.getGenerator();
        return generator.createFile(input);
    }

    getProjectEntries({ path, onlyNative = false } = {}) {
        const entries = this.config.getEntries(path);

        if (onlyNative) {
            const result = [];
            for (const entry of entries) {
                if (is.plainObject(entry.native)) {
                    result.push(entry);
                }
            }

            return result;
        }

        return entries;
    }

    clean(path) {
        this._checkLoaded();
        return this.runInParallel(this._getEntries(path).map((entry) => ({
            task: "clean",
            args: {
                ...entry,
                task: "clean"
            }
        })));
    }

    build(path) {
        this._checkLoaded();
        return this.runInParallel(this._getEntries(path).map((entry) => ({
            task: entry.task,
            args: entry
        })));
    }

    nbuild(path) {
        this._checkLoaded();

        const entries = this.getProjectEntries({
            path,
            onlyNative: true
        });

        if (entries.length === 0) {
            return null;
        }

        return this.runInParallel(entries.map((entry) => ({
            task: "nbuild",
            args: entry
        })));
    }

    nclean(path) {
        this._checkLoaded();

        const entries = this.getProjectEntries({
            path,
            onlyNative: true
        });

        if (entries.length === 0) {
            return null;
        }

        return this.runInParallel(entries.map((entry) => ({
            task: "nclean",
            args: entry
        })));
    }

    rebuild(path) {
        this._checkLoaded();
        return this.runInSeries([
            async () => {
                const observer = await this.clean(path);
                return observer.result;
            },
            async () => {
                const observer = await this.build(path);
                return observer.result;
            }
        ]);
    }

    watch(path) {
        this._checkLoaded();
        return this.runInParallel(this._getEntries(path).map((entry) => ({
            task: "watch",
            args: entry
        })));
    }

    async incVersion(options) {
        this._checkLoaded();
        return this.run("incver", options);
    }

    _getEntries(path) {
        const entries = this.config.getEntries(path);
        if (entries.length === 0) {
            this.notify(null, "logInfo", `No entries'${is.string(path) ? ` for ${path}` : ""}'`);
        }

        return entries.filter(checkEntry);
    }

    _checkLoaded() {
        if (!this._loaded) {
            throw new adone.error.IllegalState("Project is not loaded");
        }
    }

    async getGenerator() {
        if (is.null(this.generator)) {
            this.generator = new this.GeneratorClass(this);
            await this.generator.useDefaultTasks();
            await this.generator.loadCustomTasks();
        }
        return this.generator;
    }

    static async load(options) {
        const pm = new ProjectManager(options);
        await pm.load();
        return pm;
    }
}
