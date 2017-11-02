const {
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
        this.Generator = project.generator.Manager;
    }

    useGenerator(Generator) {
        this.Generator = Generator;
    }

    setSilent(silent) {
        this.silent = silent;
    }

    getVersion() {
        return this.config.raw.version;
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

    async load() {
        if (this._loaded) {
            throw new adone.x.IllegalState("Project already loaded");
        }

        this.config = await project.Configuration.load({
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

    async create(options) {
        const generator = new this.Generator();
        await generator.useDefaultTasks();
        await generator.loadCustomTasks();
        return generator.initializeProject({
            cwd: this.cwd,
            ...options
        });
    }

    async generateFile(options) {
        const generator = new this.Generator();
        await generator.useDefaultTasks();
        await generator.loadCustomTasks();
        return generator.generateFile(options);
    }

    getProjectEntries(options) {
        return this.config.getProjectEntries(options);
    }

    async clean(path) {
        this._checkLoaded();
        const entries = this.config.getProjectEntries({ path });

        const results = [];
        for (const entry of entries) {
            const observer = await this.run("delete", entry); // eslint-disable-line
            results.push(observer.result);
        }

        return Promise.all(results);
    }

    async build(path) {
        this._checkLoaded();
        const entries = this.config.getProjectEntries({ path });

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
        const entries = this.config.getProjectEntries({ path });

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
}
