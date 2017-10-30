const {
    is,
    x
} = adone;

export default class FlowTask extends adone.task.Task {
    run(tasks, options, ...args) {
        for (const task of tasks) {
            if (is.string(task)) {
                if (!this.manager.hasTask(task)) {
                    throw new x.Unknown(`Unknown task: ${task}`);
                }
            } else if (!is.class(task)) {
                throw new x.NotValid("Task should be a string (task name) or a class inherited from adone.task.Task");
            }
        }

        this.tasks = tasks;
        this.options = options;

        return this._run(...args);
    }

    _run() {
        throw new adone.x.NotImplemented("Method _run() is not implemented");
    }

    async _iterate(args, handler) {
        for (const task of this.tasks) {
            const [name, observer] = await this._runTask(task, args); // eslint-disable-line

            // eslint-disable-next-line
            if (await handler(name, observer)) {
                break;
            }
        }
    }

    async _runTask(task, args) {
        let name;
        let observer;
        if (is.string(task)) {
            name = task;
            observer = await this.manager.run(task, ...args); // eslint-disable-line
        } else if (is.class(task)) {
            name = task.name;
            observer = await this.manager.runOnce(task, ...args); // eslint-disable-line
        }

        return [name, observer];
    }

}
adone.tag.add(FlowTask, "FLOW_TASK");
