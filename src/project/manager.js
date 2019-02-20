const {
    error,
    configuration,
    is,
    fs,
    std,
    task,
    text,
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
        this.cwd = cwd;
        this.config = null;
        this._loaded = false;
    }

    get name() {
        if (!this._loaded) {
            throw new error.IllegalStateException("Project is not loaded");
        }
        return this.config.raw.name;
    }

    set name(newName) {
        if (!this._loaded) {
            throw new error.IllegalStateException("Project is not loaded");
        }
        this.config.set("name", newName);
    }

    async onNotification(selector, observer) {
        await super.onNotification(selector, observer);
    }

    getVersion() {
        return this.config.raw.version;
    }

    async load() {
        if (this._loaded) {
            throw new error.IllegalStateException("Project already loaded");
        }
        this._loaded = true;

        this.config = await configuration.Adone.load({
            cwd: this.cwd
        });

        this.name = this.config.raw.name;

        // Add default tasks
        for (const [name, Class] of Object.entries(project.task)) {
            await this.addTask(adone.text.toCamelCase(name), Class); // eslint-disable-line
        }
    
        // Load custom tasks from `.adone/tasks.js`.
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

        // Load other custom tasks.
        await this.loadCustomTasks();
        
        
    }

    async createProject(info = {}) {
        await this._checkAndCreateProject(info);

        // await this.load();

        this.notify(this, "progress", {
            message: `project ${term.theme.primary.bold(info.name)} successfully created`,
            status: true
        });
    }

    async createSubProject(info) {
        this._checkLoaded();
        const context = await this._createSubProject(info);
        await this.config.load();

        this.notify(this, "progress", {
            message: `sub project ${term.theme.primary.bold(info.name)} successfully created`,
            status: true
        });
        return context;
    }

    async _createSubProject(info) {
        const cwd = std.path.join(this.owner.cwd, info.dirName || info.name);
        const context = {};

        await this._checkAndCreateProject({
            name: this.owner.config.raw.name,
            description: this.owner.config.raw.description,
            version: this.owner.config.raw.version,
            author: this.owner.config.raw.author,
            ...info,
            cwd,
            skipGit: true,
            skipJsconfig: true
        }, context);

        this.contexts.set(cwd, context);

        // Adone parent adone.json
        const subName = info.dirName || info.name;
        this.owner.config.set(["struct", subName], std.path.relative(this.owner.cwd, cwd));
        await this.owner.config.save();

        if (is.string(info.type)) {
            // Update parent jsconfig.json if it exists
            if (await fs.exists(std.path.join(this.owner.cwd, configuration.Jsconfig.configName))) {
                await this.runAndWait("jsconfig", {
                    cwd: this.owner.cwd,
                    include: [std.path.relative(this.owner.cwd, std.path.join(cwd, "src"))]
                }, this.contexts.get(this.owner.cwd));
            }
        }

        return context;
    }

    async _checkAndCreateProject(info) {
        if (!is.string(info.name)) {
            throw new error.InvalidArgumentException("Invalid name of project");
        }

        if (!is.string(info.basePath)) {
            throw new error.InvalidArgumentException("Invalid base path");
        }

        if (!(await fs.exists(info.basePath))) {
            await fs.mkdirp(info.cwd);
        }

        const cwd = std.path.join(info.basePath, info.dirName || info.name);
        if (await fs.exists(cwd)) {
            throw new error.ExistsException(`Path '${cwd}' already exists`);
        }
        info.cwd = cwd;

        try {
            await this.runAndWait(`${is.string(info.type) ? text.toCamelCase(info.type) : "empty"}Project`, info);
        } catch (err) {
            await fs.rm(cwd);
        }
    }

    async createFile(input) {
        return this._createFile(input);
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
            throw new error.IllegalStateException("Project is not loaded");
        }
    }

    async loadCustomTasks() {
    }

    async _createFile(input) {
        return this.runAndWait(text.toCamelCase(input.type), input);
    }

    static async load(options) {
        const pm = new ProjectManager(options);
        await pm.load();
        return pm;
    }
}
