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

    async createProject(input) {
        const context = {};
        await this._checkAndCreateProject(input, context);
        this.contexts.set(input.cwd, context);
        return context;
    }

    async createSubProject(input) {
        const cwd = std.path.join(this.owner.cwd, is.string(input.dirName) ? input.dirName : input.name);
        const context = {};

        await this._checkAndCreateProject({
            name: this.owner.config.raw.name,
            description: this.owner.config.raw.description,
            version: this.owner.config.raw.version,
            author: this.owner.config.raw.author,
            ...input,
            cwd,
            skipGit: true,
            skipEslint: true,
            skipJsconfig: true
        }, context);

        this.contexts.set(cwd, context);
        
        // Adone parent adone.json
        const subName = is.string(input.dirName) ? input.dirName : input.name;
        this.owner.config.set(["structure", subName], std.path.relative(this.owner.cwd, cwd));
        await this.owner.config.save();

        if (is.string(input.type)) {
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

    async _checkAndCreateProject(input, context) {
        if (!is.string(input.name)) {
            throw new adone.x.InvalidArgument("Invalid name of project");
        }

        if (await fs.exists(input.cwd)) {
            const files = await fs.readdir(input.cwd);
            if (files.length > 0) {
                throw new adone.x.Exists(`Path '${input.cwd}' exists and is not empty`);
            }
        } else {
            await fs.mkdirp(input.cwd);
        }

        await this.runAndWait(`${is.string(input.type) ? text.toCamelCase(input.type) : "default"}Project`, input, context);
    }

    async createFile(input) {
        return this.runAndWait(text.toCamelCase(input.type), input);
    }    
}
