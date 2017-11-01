const {
    is,
    task,
    text
} = adone;

export default class ProjectGenerator extends task.Manager {
    constructor() {
        super();

        this.setSharedData({
            context: adone.lazify({
                helper: "./helpers"
            }, null, require)
        });
    }

    async useDefaultTasks() {
        for (const [name, Class] of Object.entries(adone.project.generator.task)) {
            await this.addTask(adone.text.toCamelCase(name), Class); // eslint-disable-line
        }
    }

    async loadCustomTasks() {
    }

    async initializeProject(input) {
        const taskName = is.string(input.type) ? `${text.toCamelCase(input.type)}Project` : "defaultProject";
        return this._runTask(taskName, input);
    }

    async generateFile(input) {
        return this._runTask(text.toCamelCase(input.type), input);
    }

    async _runTask(taskName, input) {
        const observer = await this.run(taskName, input);
        return observer.result;
    }
}
