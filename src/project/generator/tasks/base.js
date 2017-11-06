const {
    task
} = adone;

export default class BaseTask extends task.Task {
    async runTask(name, ...args) {
        return this.manager.runAndWait(name, ...args);
    }
}
