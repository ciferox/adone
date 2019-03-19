const {
    is,
    error,
    task: { IsomorphicTask },
    util
} = adone;

const normalizeAndCheck = (manager, tasks) => {
    const result = [];
    for (const t of tasks) {
        let item;
        if (is.string(t) || is.function(t)/* || is.class(t)*/) {
            item = {
                task: t
            };
        } else if (is.object(t)) {
            if (!is.exist(t.task)) {
                throw new error.NotValidException("Missing task property");
            }
            item = t;
        } else {
            throw new error.NotValidException(`Invalid type of task: ${adone.typeOf(t)}. Should be string, class or function`);
        }

        if (is.string(item.task)) {
            if (!manager.hasTask(item.task)) {
                throw new error.NotExistsException(`Task '${item.task}' not exists`);
            }
        }

        result.push(item);
    }
        
    return result;
};

/**
 * This task implements common logic for running flows.
 * 
 * 
 * 
 * See other flow tasks for details.
 */
export default class FlowTask extends IsomorphicTask {
    _run(...args) {
        const taskData = this._validateArgs(args);

        this.tasks = normalizeAndCheck(this.manager, taskData.tasks);
        this.args = util.arrify(taskData.args);
        this.observers = [];
        // this.options = options;

        return this.main(...this.args);
    }

    async _iterate(handler) {
        for (const t of this.tasks) {
            const args = is.exist(t.args)
                ? util.arrify(t.args)
                : this.args;
            const observer = await this._runTask(t.task, args); // eslint-disable-line
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
        } else if (is.function(task)/* || is.class(task)*/) {
            return this.manager.runOnce(task, ...args); // eslint-disable-line
        }

        throw new error.NotAllowedException(`Invalid type of task: ${adone.typeOf(task)}`);
    }
}
