const {
    is,
    error
} = adone;

const { MANAGER_SYMBOL, TASKNAME_SYMBOL } = adone.private(adone.task);
const TASKS_SYMBOL = Symbol();
const NOTIFICATIONS_SYMBOL = Symbol();
const ANY_NOTIFICATION = Symbol();

const DUMMY_THROTTLE = (tsk) => tsk();

/**
 * Basic implementation of task manager that owns and manages tasks.
 * 
 * To implement more advanced manager you should inherit this class.
 */
export default class TaskManager extends adone.event.AsyncEmitter {
    constructor() {
        super();
        this[TASKS_SYMBOL] = new Map();
        this[NOTIFICATIONS_SYMBOL] = new Map();
        this[NOTIFICATIONS_SYMBOL].set(ANY_NOTIFICATION, []);
    }

    /**
     * Adds task to manager.
     * 
     * @param {string} name name of task
     * @param {class|function} task task class inherited from {adone.task.Task} or function
     * @param {object} options 
     */
    addTask(name, task, options) {
        if (this[TASKS_SYMBOL].has(name)) {
            throw new error.Exists(`Task '${name}' already exists`);
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
        const taskInfo = this._initTaskInfo({
            ...options,
            name
        });

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

        taskInfo.Class = TaskClass;
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
        return taskInfo.Class;
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
        return this[TASKS_SYMBOL].has(name);
    }

    /**
     * Deletes task with specified name.
     * 
     * @param {string} name 
     */
    deleteTask(name) {
        const taskInfo = this._getTaskInfo(name);
        if (!is.undefined(taskInfo.runners) && taskInfo.runners.size > 0) {
            taskInfo.zombi = true;
        } else {
            return this._uninstallTask(taskInfo);
        }
    }

    /**
     * Returns list of task names.
     */
    getTaskNames() {
        return [...this[TASKS_SYMBOL].entries()].filter((entry) => !entry[1].zombi).map((entry) => entry[0]);
    }

    /**
     * Register notification observer.
     */
    onNotification(selector, observer) {
        let name;
        let filter = adone.truly;

        if (is.string(selector)) {
            name = selector;
        } else if (is.function(selector)) {
            filter = selector;
        } else if (is.plainObject(selector)) {
            if (is.string(selector.name)) {
                name = selector.name;
            }

            if (is.string(selector.tasks)) {
                filter = (task) => task.name === selector.tasks;
            } else if (is.array(selector.tasks)) {
                filter = (task) => selector.tasks.includes(task.name);
            }
        }

        if (is.string(name)) {
            let observers = this[NOTIFICATIONS_SYMBOL].get(name);
            if (is.undefined(observers)) {
                observers = [{
                    filter,
                    observer
                }];
                this[NOTIFICATIONS_SYMBOL].set(name, observers);
            } else {
                const exists = observers.findIndex((info) => info.observer === observer) >= 0;
                if (exists) {
                    throw new error.Exists("Observer already exists");
                }

                observers.push({
                    filter,
                    observer
                });
            }
        } else {
            const anyNotif = this[NOTIFICATIONS_SYMBOL].get(ANY_NOTIFICATION);
            anyNotif.push({
                filter,
                observer
            });
        }
    }

    /**
     * Emit notification from task
     * 
     * @param {*} sender - notification sender
     * @param {string} name - notification name
     * @param {array} args - notification arguments
     */
    notify(sender, name, ...args) {
        const observers = this[NOTIFICATIONS_SYMBOL].get(name);
        if (is.array(observers)) {
            for (const info of observers) {
                if (info.filter(sender, name)) {
                    info.observer(sender, name, ...args);
                }
            }
        }

        const any = this[NOTIFICATIONS_SYMBOL].get(ANY_NOTIFICATION);
        for (const info of any) {
            if (info.filter(sender, name)) {
                info.observer(sender, name, ...args);
            }
        }
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
        let taskObserver;

        if (taskInfo.singleton) {
            if (is.undefined(taskInfo.runner)) {
                taskInfo.runner = await this._createTaskRunner(context, taskInfo);
            }
            taskObserver = await taskInfo.runner(args);
        } else {
            const runTask = await this._createTaskRunner(context, taskInfo);
            if (is.undefined(taskInfo.runners)) {
                taskInfo.runners = new Set();
            }
            taskInfo.runners.add(runTask);
            taskObserver = await runTask(args);

            const releaseRunner = () => {
                taskInfo.runners.delete(runTask);
                if (taskInfo.zombi === true && taskInfo.runners.size === 0) {
                    this._uninstallTask(taskInfo);
                }
            };

            if (is.promise(taskObserver.result)) {
                adone.promise.finally(taskObserver.result, releaseRunner).catch(adone.noop);
            } else {
                releaseRunner();
            }
        }

        return taskObserver;
    }

    async _createTaskRunner(context, taskInfo) {
        return async (args) => {
            const instance = await this._createTaskInstance(taskInfo);

            const taskObserver = new adone.task.TaskObserver(instance, taskInfo.name);
            taskObserver.state = adone.task.STATE.RUNNING;
            try {
                taskObserver.result = taskInfo.throttle(() => instance.run(...args));
            } catch (err) {
                if (is.function(taskObserver.task.undo)) {
                    await taskObserver.task.undo(err);
                }
                taskObserver.result = Promise.reject(err);
            }

            if (is.promise(taskObserver.result)) {
                // Wrap promise if task has undo method.
                if (is.function(taskObserver.task.undo)) {
                    taskObserver.result = taskObserver.result.then(adone.identity, async (err) => {
                        await taskObserver.task.undo(err);
                        throw err;
                    });
                }

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
        let instance;
        if (taskInfo.singleton) {
            if (is.undefined(taskInfo.instance)) {
                instance = taskInfo.instance = new taskInfo.Class();
            } else {
                return taskInfo.instance;
            }
        } else {
            instance = new taskInfo.Class();
        }

        instance[TASKNAME_SYMBOL] = taskInfo.name;
        instance[MANAGER_SYMBOL] = this;
        return instance;
    }

    _initTaskInfo({ name, concurrency = Infinity, interval, singleton = false, description = "" } = {}) {
        const taskInfo = {
            name,
            concurrency,
            interval,
            singleton,
            description
        };

        if (concurrency !== Infinity && concurrency > 0) {
            taskInfo.throttle = adone.util.throttle.create({
                concurrency,
                interval
            });
        } else {
            taskInfo.throttle = DUMMY_THROTTLE;
        }

        return taskInfo;
    }

    _installTask(taskInfo) {
        this[TASKS_SYMBOL].set(taskInfo.name, taskInfo);
    }

    _uninstallTask(taskInfo) {
        this[TASKS_SYMBOL].delete(taskInfo.name);
    }

    _checkTask(task) {
        if (is.class(task)) {
            const taskInstance = new task();

            if (!is.task(taskInstance)) {
                throw new error.NotValid("The task class should be inherited from 'adone.task.Task' class");
            }
        } else if (!is.function(task)) {
            throw new error.NotValid("Task should be a class or a function");
        }
    }

    _getTaskInfo(name) {
        const taskInfo = this[TASKS_SYMBOL].get(name);
        if (is.undefined(taskInfo) || taskInfo.zombi === true) {
            throw new error.NotExists(`Task '${name}' not exists`);
        }

        return taskInfo;
    }
}
adone.tag.add(TaskManager, "TASK_MANAGER");
