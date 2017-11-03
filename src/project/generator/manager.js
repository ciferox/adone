const {
    is,
    task,
    text,
    util
} = adone;

export default class ProjectGenerator extends task.Manager {
    async useDefaultTasks() {
        for (const [name, Class] of Object.entries(adone.project.generator.task)) {
            await this.addTask(adone.text.toCamelCase(name), Class); // eslint-disable-line
        }
    }

    async loadCustomTasks() {
    }

    async createProject(input) {
        const context = adone.o({
            flag: {
                skipGit: false,
                skipNpm: false,
                skipJsconfig: false,
                skipEslint: false,
                ...util.pick(input, ["skipGit", "skipNpm", "skipJsconfig", "skipEslint"])
            },
            project: util.pick(input, ["name", "type", "description", "version", "author", "cwd"]),
            config: {}
        });

        this.setSharedData({
            context
        });

        await this._runTask(`${is.string(input.type) ? text.toCamelCase(input.type) : "default"}Project`);
        return context;
    }

    async createFile(input) {
        return this._runTask(text.toCamelCase(input.type), input);
    }

    async _runTask(taskName, input) {
        const observer = await this.run(taskName, input);
        return observer.result;
    }
}
