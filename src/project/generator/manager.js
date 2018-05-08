const {
    configuration,
    fs,
    is,
    std,
    task,
    text
} = adone;

export default class ProjectGenerator extends task.Manager {
    constructor(owner) {
        super();

        this.owner = owner;
        this.contexts = new Map();
    }

    async useDefaultTasks() {
        for (const [name, Class] of Object.entries(adone.project.generator.task)) {
            await this.addTask(adone.text.toCamelCase(name), Class); // eslint-disable-line
        }
    }

    async loadCustomTasks() {
    }

    async createProject(info) {
        const context = {};
        await this._checkAndCreateProject(info, context);
        this.contexts.set(info.cwd, context);
        return context;
    }

    async createSubProject(info) {
        const cwd = std.path.join(this.owner.cwd, info.dir || info.name);
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
        const subName = info.dir || info.name;
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

    async _checkAndCreateProject(info, context) {
        if (!is.string(info.name)) {
            throw new adone.error.InvalidArgument("Invalid name of project");
        }

        if (await fs.exists(info.cwd)) {
            const files = await fs.readdir(info.cwd);
            if (files.length > 0) {
                throw new adone.error.Exists(`Path '${info.cwd}' exists and contains files`);
            }
        } else {
            await fs.mkdirp(info.cwd);
        }

        await this.runAndWait(`${is.string(info.type) ? text.toCamelCase(info.type) : "default"}Project`, info, context);
    }

    async createFile(input) {
        return this.runAndWait(text.toCamelCase(input.type), input);
    }    
}
