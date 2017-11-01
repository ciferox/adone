const {
    task
} = adone;

export default class BaseTask extends task.Task {
    async _runTask(name, input) {
        const observer = await this.manager.run(name, input);
        return observer.result;
    }
}
