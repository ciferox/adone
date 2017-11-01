const {
    is,
    x,
    task
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
        this._sharedData = null;
    }

    /**
     * Adds task to manager.
     * 
     * @param {string} name name of task
     * @param {class} TaskClass task class inherited from {adone.task.Task}
     * @param {object} options 
     */
    addTask(name, TaskClass, options) {
        if (this._tasks.has(name)) {
            throw new x.Exists(`Task '${name}' already exists`);
        }
        return this.setTask(name, TaskClass, options);
    }

    /**
     * Adds or replaces task with specified name.
     * 
     * @param {string} name task name
     * @param {class} TaskClass task class inherited from {adone.task.Task}
     * @param {object} options 
     */
    setTask(name, TaskClass, options) {
        this._checkTask(TaskClass);
        const taskInfo = this._initTaskInfo(Object.assign({
            name
        }, options));
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
     * Runs task in series.
     * 
     * @param {array} tasks array of task names
     */
    runInSeries(tasks, options, ...args) {
        return this.runOnce(adone.task.flow.Series, tasks, options, ...args);
    }

    /**
     * Runs task in parallel.
     * 
     * @param {array} tasks array of task names
     */
    runInParallel(tasks, options, ...args) {
        return this.runOnce(adone.task.flow.Parallel, tasks, options, ...args);
    }

    /**
     * Runs tasks in series, but result of each will be passed to next one as arguments.
     * 
     * @param {array} tasks array of task names
     */
    runWaterfall(tasks, options, ...args) {
        return this.runOnce(adone.task.flow.Waterfall, tasks, options, ...args);
    }

    /**
     * Runs task once.
     * 
     * @param {class} TaskClass 
     * @param {*} args 
     */
    async runOnce(TaskClass, ...args) {
        const randomName = adone.text.random(32);
        await this.addTask(randomName, TaskClass);
        const observer = await this._run(null, randomName, ...args);
        this.deleteTask(randomName);

        return observer;
    }

    setSharedData(sharedData) {
        if (!is.plainObject(sharedData)) {
            throw new x.InvalidArgument("Shared data should be provided through an object");
        }

        this._sharedData = sharedData;
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

            if (!is.null(this._sharedData)) {
                for (const [name, val] of Object.entries(this._sharedData)) {
                    instance[name] = val;
                }
            }
            
            const taskObserver = new task.TaskObserver(instance);
            taskObserver.state = task.state.RUNNING;
            try {
                taskObserver.result = instance.run(...args);
            } catch (err) {
                taskObserver.result = Promise.reject(err);
            }

            if (is.promise(taskObserver.result)) {
                taskObserver.result.then(() => {
                    taskObserver.state = (taskObserver.state === task.state.CANCELLING) ? task.state.CANCELLED : task.state.COMPLETED;
                }).catch((err) => {
                    taskObserver.state = task.state.FAILED;
                    taskObserver.error = err;
                });
            } else {
                taskObserver.state = task.state.COMPLETED;
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

    _checkTask(TaskClass) {
        if (!is.class(TaskClass)) {
            throw new x.NotValid("Task should be a class");
        }

        const task = new TaskClass();

        if (!is.task(task)) {
            throw new x.NotValid("The task class should be inherited from 'adone.task.Task' class");
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
