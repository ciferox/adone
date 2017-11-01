const {
    is,
    task,
    text,
    std
} = adone;

const taskNames = adone.std.fs.readdirSync(std.path.join(__dirname, "tasks")).filter((name) => !name.endsWith(".map"));
const types = {};

for (const name of taskNames) {
    types[adone.text.toCamelCase(std.path.basename(name, ".js"))] = `./${std.path.join("tasks", name)}`;
}

const DefaultTask = adone.lazify(types, null, require);

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
        for (const name of Object.keys(DefaultTask)) {
            await this.addTask(name, DefaultTask[name]); // eslint-disable-line
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
