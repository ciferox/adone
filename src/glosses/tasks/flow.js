const {
    is,
    error
} = adone;

export default class FlowTask extends adone.task.Task {
    run(tasks, options, ...args) {
        const _checkTask = (task) => {
            if (is.string(task)) {
                if (!this.manager.hasTask(task)) {
                    throw new error.UnknownException(`Unknown task: ${task}`);
                }
            } else if (!is.class(task) && !is.function(task)) {
                throw new error.NotValidException("Task should be a string (task name) or a class inherited from 'adone.task.Task' or function");
            }
        };

        for (const task of tasks) {
            _checkTask(is.plainObject(task) ? task.task : task);
        }

        this.tasks = tasks;
        this.args = args;
        this.observers = [];
        this.options = options;

        return this._run(...args);
    }

    _run() {
        throw new adone.error.NotImplementedException("Method _run() is not implemented");
    }

    async _iterate(handler) {
        for (const taskInfo of this.tasks) {
            let task;
            let args;
            if (is.plainObject(taskInfo)) {
                task = taskInfo.task;
                args = is.undefined(taskInfo.args) ? taskInfo.args : adone.util.arrify(taskInfo.args);
            } else {
                task = taskInfo;
                args = this.args;
            }
            const observer = await this._runTask(task, args); // eslint-disable-line
            this.observers.push(observer);

            // eslint-disable-next-line
            if (await handler(observer)) {
                break;
            }
        }
    }

    _runTask(task, args) {
        if (is.string(task)) {
            return this.manager.run(task, ...args); // eslint-disable-line
        } else if (is.class(task)) {
            return this.manager.runOnce(task, ...args); // eslint-disable-line
        } else if (is.function(task)) {
            return this.manager.runOnce(task, ...args); // eslint-disable-line
        }

        throw new adone.error.NotAllowedException("Invalid task");
    }
}
