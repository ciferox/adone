export default class ConfigTask extends adone.task.Task {
    run(/*peer*/) {
        return this.manager.options;
    }
}
