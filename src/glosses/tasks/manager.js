const {
    is,
    x
} = adone;

/**
 * Basic implementation of task manager that owns and manages tasks.
 * 
 * To implement more advanced manager you should inherit this class.
 */
export default class TaskManager extends adone.event.AsyncEmitter {
    constructor() {
        super();
        this._tasks = new Map();
    }

    /**
     * Adds task to manager.
     * 
     * @param {string} name name of task
     * @param {class|function} task task class inherited from {adone.task.Task} or function
     * @param {object} options 
     */
    addTask(name, task, options) {
        if (this._tasks.has(name)) {
            throw new x.Exists(`Task '${name}' already exists`);
        }
        return this.setTask(name, task, options);
    }

    /**
     * Adds or replaces task with specified name.
     * 
     * @param {string} name task name
     * @param {class|function} task task class inherited from {adone.task.Task} or function
     * @param {object} options 
     */
    setTask(name, task, options) {
        this._checkTask(task);
        const taskInfo = this._initTaskInfo(Object.assign({
            name
        }, options));

        let TaskClass;
        if (is.class(task)) {
            TaskClass = task;
        } else {
            TaskClass = class extends adone.task.Task {
                run(...args) {
                    return task(...args);
                }
            };
        }

        taskInfo.meta.Class = TaskClass;
        return this._installTask(taskInfo);
    }

    /**
     * Returns task info.
     * 
     * @param {object} name task name
     */
    getTask(name) {
        return this._getTaskInfo(name);
    }

    /**
     * Returns task class.
     * 
     * @param {string} name task name
     */
    getTaskClass(name) {
        const taskInfo = this._getTaskInfo(name);
        return taskInfo.meta.Class;
    }

    /**
     * Returns task instance.
     * 
     * @param {string} name task name
     */
    getTaskInstance(name) {
        return this._createTaskInstance(this._getTaskInfo(name));
    }

    /**
     * Returns true if task with such name owned by the manager.
     * @param {string} name 
     */
    hasTask(name) {
        return this._tasks.has(name);
    }

    /**
     * Deletes task with specified name.
     * 
     * @param {string} name 
     */
    deleteTask(name) {
        const taskInfo = this._getTaskInfo(name);
        if (taskInfo.instances.size > 0) {
            taskInfo.zombi = true;
        } else {
            return this._uninstallTask(taskInfo);
        }
    }

    /**
     * Returns list of task names.
     */
    getTaskNames() {
        return [...this._tasks.keys()];
    }

    /**
     * Runs task.
     * 
     * @param {*} name task name
     * @param {*} args task arguments
     */
    run(name, ...args) {
        return this._run(null, name, ...args);
    }

    /**
     * Runs tasks and wait for result.
     * 
     * @param {*} name task name
     * @param {*} args task arguments
     */
    async runAndWait(name, ...args) {
        const observer = await this.run(name, ...args);
        return observer.result;
    }

    /**
     * Runs task in series.
     * 
     * @param {array} tasks array of task names
     */
    runInSeries(tasks, options, ...args) {
        return this.runOnce(adone.task.flow.Series, tasks, options, ...args);
    }

    /**
     * Runs tasks in parallel.
     * 
     * @param {array} tasks array of tasks
     */
    runInParallel(tasks, options, ...args) {
        return this.runOnce(adone.task.flow.Parallel, tasks, options, ...args);
    }

    /**
     * Runs task once.
     * 
     * @param {class} task 
     * @param {*} args 
     */
    async runOnce(task, ...args) {
        let name;
        if (is.class(task) && !this.hasTask(task.name)) {
            name = task.name;
        } else {
            name = adone.text.random(32);
        }
        await this.addTask(name, task);
        const observer = await this._run(null, name, ...args);
        this.deleteTask(name);

        return observer;
    }

    async _run(context, name, ...args) {
        const taskInfo = this._getTaskInfo(name);

        if (taskInfo.instances.size >= taskInfo.meta.concurrency) {
            throw new x.LimitExceeded(`Limit of running task instances is exceeded (max ${taskInfo.meta.concurrency})`);
        }

        const runTask = await this._createTaskRunner(context, taskInfo);
        taskInfo.instances.add(runTask);
        const taskObserver = runTask(args);

        const releaseRunner = () => {
            taskInfo.instances.delete(runTask);
            if (taskInfo.zombi === true && taskInfo.instances.size === 0) {
                this._uninstallTask(taskInfo);
            }
        };

        if (is.promise(taskObserver.result)) {
            adone.promise.finally(taskObserver.result, releaseRunner).catch(adone.noop);
        } else {
            releaseRunner();
        }

        return taskObserver;
    }

    async _createTaskRunner(context, taskInfo) {
        return (args) => {
            const instance = this._createTaskInstance(taskInfo);

            const taskObserver = new adone.task.TaskObserver(instance, taskInfo.meta.name);
            taskObserver.state = adone.task.STATE.RUNNING;
            try {
                taskObserver.result = instance.run(...args);
            } catch (err) {
                taskObserver.result = Promise.reject(err);
            }

            if (is.promise(taskObserver.result)) {
                taskObserver.result.then(() => {
                    taskObserver.state = (taskObserver.state === adone.task.STATE.CANCELLING) ? adone.task.STATE.CANCELLED : adone.task.STATE.COMPLETED;
                }).catch((err) => {
                    taskObserver.state = adone.task.STATE.FAILED;
                    taskObserver.error = err;
                });
            } else {
                taskObserver.state = adone.task.STATE.COMPLETED;
            }
            return taskObserver;
        };
    }

    _createTaskInstance(taskInfo) {
        const instance = new taskInfo.meta.Class();
        instance.manager = this;
        return instance;
    }

    _initTaskInfo({ name, concurrency = Infinity, description = "" } = {}) {
        return {
            meta: {
                name,
                concurrency,
                description
            },
            instances: new Set()
        };
    }

    _installTask(taskInfo) {
        this._tasks.set(taskInfo.meta.name, taskInfo);
    }

    _uninstallTask(taskInfo) {
        this._tasks.delete(taskInfo.meta.name);
    }

    _checkTask(task) {
        if (is.class(task)) {
            const taskInstance = new task();

            if (!is.task(taskInstance)) {
                throw new x.NotValid("The task class should be inherited from 'adone.task.Task' class");
            }
        } else if (!is.function(task)) {
            throw new x.NotValid("Task should be a class or a function");
        }
    }

    _getTaskInfo(name) {
        const taskInfo = this._tasks.get(name);
        if (is.undefined(taskInfo) || taskInfo.zombi === true) {
            throw new x.NotExists(`Task '${name}' not exists`);
        }

        return taskInfo;
    }
}
