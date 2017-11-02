const {
    task
} = adone;

export default class BaseTask extends task.Task {
    async _runTask(name, ...args) {
        const observer = await this.manager.run(name, ...args);
        return observer.result;
    }
}
