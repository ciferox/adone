const {
    configuration,
    is,
    fs,
    std,
    task,
    project
} = adone;

const VERSION_PARTS = ["major", "minor", "patch", "premajor", "preminor", "prepatch", "prerelease"];

export default class ProjectManager extends task.Manager {
    constructor({ cwd = process.cwd() } = {}) {
        super();
        this.name = null;
        this.cwd = cwd;
        this.config = null;
        this._loaded = false;
        this.silent = false;
        this.GeneratorClass = project.generator.Manager;
        this.generator = null;
    }

    useGenerator(GeneratorClass) {
        this.GeneratorClass = GeneratorClass;
    }

    setSilent(silent) {
        this.silent = silent;
    }

    getVersion() {
        return this.config.raw.version;
    }

    async load() {
        if (this._loaded) {
            throw new adone.x.IllegalState("Project already loaded");
        }

        this.config = await configuration.Adone.load({
            cwd: this.cwd
        });

        // Add default tasks
        await this.addTask("delete", project.task.Delete);
        await this.addTask("copy", project.task.Copy);
        await this.addTask("transpile", project.task.Transpile);
        await this.addTask("transpileExe", project.task.TranspileExe);

        // Load custom tasks
        const tasksPath = std.path.join(this.cwd, ".adone", "tasks.js");
        if (await fs.exists(tasksPath)) {
            const customTasks = adone.require(tasksPath).default;

            for (const [name, CustomTask] of Object.entries(customTasks)) {
                await this.addTask(name, CustomTask); // eslint-disable-line
            }
        }

        this._loaded = true;
    }

    async createProject(options) {
        const generator = await this.getGenerator();
        const context = await generator.createProject({
            ...options,
            cwd: this.cwd
        });

        await this.load();
        return context;
    }

    async createSubProject(input) {
        this._checkLoaded();
        const generator = await this.getGenerator();
        return generator.createSubProject(input);
    }

    async createFile(options) {
        const generator = await this.getGenerator();
        return generator.createFile(options);
    }

    getProjectEntries(path) {
        return this.config.getEntries(path);
    }

    async clean(path) {
        this._checkLoaded();
        const entries = this._getEntries(path);

        const results = [];
        for (const entry of entries) {
            const observer = await this.run("delete", entry); // eslint-disable-line
            results.push(observer.result);
        }

        return Promise.all(results);
    }

    async build(path) {
        this._checkLoaded();
        const entries = this._getEntries(path);

        const promises = [];
        for (const entry of entries) {
            if (!this._checkEntry(entry)) {
                continue;
            }

            const observer = await this.run(entry.$task, entry); // eslint-disable-line
            promises.push(observer.result);
        }

        return Promise.all(promises);
    }

    async rebuild(path) {
        await this.clean(path);
        await this.build(path);
    }

    async watch(path) {
        this._checkLoaded();
        const entries = this._getEntries(path);

        const promises = [];
        for (const entry of entries) {
            if (!this._checkEntry(entry)) {
                continue;
            }

            const observer = await this.runOnce(project.task.Watch, entry); // eslint-disable-line
            promises.push(observer.result);
        }

        return Promise.all(promises);
    }

    async incVersion({ part = "minor", preid = undefined, loose = false } = {}) {
        this._checkLoaded();
        if (!VERSION_PARTS.includes(part)) {
            throw new adone.x.NotValid(`Not valid version part: ${part}`);
        }
        // adone.log(this.config.raw.version);

        const version = this.config.raw.version;

        if (!adone.semver.valid(version, loose)) {
            throw new adone.x.NotValid(`Version is not valid: ${version}`);
        }

        this.config.raw.version = adone.semver.inc(adone.semver.clean(version, loose), part, loose, preid);

        await this.config.save();

        const updateConfig = async (name) => {
            if (await fs.exists(std.path.join(this.cwd, name))) {
                const cfg = await adone.configuration.load(name, null, {
                    cwd: this.cwd
                });
                cfg.raw.version = this.config.raw.version;
                await cfg.save(name, null, {
                    space: "  "
                });
            }
        };

        await updateConfig("package.json");
        await updateConfig("package-lock.json");
    }

    _getEntries(path) {
        const entries = this.config.getEntries(path);
        if (entries.length === 0) {
            adone.info(`No entries for '${path}'`);
        }

        return entries;
    }

    _checkEntry(entry) {
        if (is.nil(entry.$dst)) {
            return false;
        }

        if (!is.string(entry.$task)) {
            entry.$task = "copy";
        }

        return true;
    }

    _checkLoaded() {
        if (!this._loaded) {
            throw new adone.x.IllegalState("Project is not loaded");
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
}
