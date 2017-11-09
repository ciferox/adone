const {
    configuration,
    fs,
    is,
    std,
    task,
    text,
    util
} = adone;

export default class ProjectGenerator extends task.Manager {
    constructor(owner) {
        super();

        this.owner = owner;
    }

    async useDefaultTasks() {
        for (const [name, Class] of Object.entries(adone.project.generator.task)) {
            await this.addTask(adone.text.toCamelCase(name), Class); // eslint-disable-line
        }
    }

    async loadCustomTasks() {
    }

    async createProject(input) {
        const context = {
            flag: {
                skipGit: false,
                skipNpm: false,
                skipJsconfig: false,
                skipEslint: false,
                ...util.pick(input, ["skipGit", "skipNpm", "skipJsconfig", "skipEslint"])
            },
            project: util.pick(input, ["name", "type", "description", "version", "author", "cwd"])
        };

        await this._checkAndCreateProject(context, input);
        return context;
    }

    async createSubProject(input) {
        const cwd = std.path.join(this.owner.cwd, is.string(input.dirName) ? input.dirName : input.name);
        const context = {
            flag: {
                ...util.pick(input, ["skipGit", "skipNpm", "skipJsconfig", "skipEslint"]),
                skipGit: true,
                skipEslint: true,
                skipJsconfig: true
            },
            project: {
                cwd,
                name: this.owner.config.raw.name,
                description: this.owner.config.raw.description,
                version: this.owner.config.raw.version,
                author: this.owner.config.raw.author,
                ...util.pick(input, ["name", "type", "description", "version", "author"])
            }
        };

        await this._checkAndCreateProject(context, input);

        // Update parent project
        this.useContext(this.owner.cwd);
        
        // Adone parent adone.json
        const subName = is.string(input.dirName) ? input.dirName : input.name;
        this.owner.config.set(["structure", subName], std.path.relative(this.owner.cwd, cwd));
        await this.owner.config.save();

        if (is.string(input.type)) {
            // Update parent jsconfig.json if it exists
            if (await fs.exists(std.path.join(this.owner.cwd, configuration.Jsconfig.name))) {
                await this.runAndWait("jsconfig", {
                    cwd: this.owner.cwd,
                    include: [std.path.relative(this.owner.cwd, std.path.join(cwd, "src"))]
                });
            }
        }

        return context;
    }

    async _checkAndCreateProject(context, input) {
        if (!is.string(context.project.name)) {
            throw new adone.x.InvalidArgument("Invalid name of project");
        }

        if (await fs.exists(context.project.cwd)) {
            const files = await fs.readdir(context.project.cwd);
            if (files.length > 0) {
                throw new adone.x.Exists(`Path '${context.project.cwd}' exists and is not empty`);
            }
        } else {
            await fs.mkdirp(context.project.cwd);
        }

        this.useContext(context.project.cwd, context);
        await this.runAndWait(`${is.string(input.type) ? text.toCamelCase(input.type) : "default"}Project`);
    }

    async createFile(input) {
        return this.runAndWait(text.toCamelCase(input.type), input);
    }    
}
