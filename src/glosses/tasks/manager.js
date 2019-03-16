const {
    is,
    error
} = adone;

const { MANAGER_SYMBOL } = adone.private(adone.task);
const TASKS = Symbol();
const TAGS = Symbol();
const NOTIFICATIONS = Symbol();
const ANY_NOTIFICATION = Symbol();

const DUMMY_THROTTLE = (tsk) => tsk();

/**
 * Basic implementation of task manager that owns and manages tasks.
 * 
 * 
 * 
 * To implement more advanced manager you should inherit this class.
 */
export default class TaskManager extends adone.event.AsyncEmitter {
    constructor() {
        super();
        this[TASKS] = new Map();
        this[TAGS] = new Map();
        this[NOTIFICATIONS] = new Map();
        this[NOTIFICATIONS].set(ANY_NOTIFICATION, []);
    }

    /**
     * Adds task to manager.
     * 
     * @param {string} name name of task
     * @param {class|function} task task class inherited from {adone.task.Task} or function
     * @param {object} options 
     */
    addTask(name, task, options) {
        if (this[TASKS].has(name)) {
            throw new error.ExistsException(`Task '${name}' already exists`);
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
     * Returns tasks info by tag.
     * 
     * @param {*} name 
     */
    getTasksByTag(tag) {
        const tasks = this[TAGS].get(tag);
        if (is.undefined(tasks)) {
            return [];
        }
        return tasks;
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
        return this[TASKS].has(name);
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
     * Deletes all tasks.
     */
    async deleteAllTasks() {
        const names = this.getTaskNames();
        for (const name of names) {
            // eslint-disable-next-line no-await-in-loop
            await this.deleteTask(name);
        }
    }

    /**
     * Deletes all tasks with tag
     * @param {*} tag 
     */
    async deleteTasksByTag(tag) {
        const names = this.getTaskNames(tag);
        for (const name of names) {
            // eslint-disable-next-line no-await-in-loop
            await this.deleteTask(name);
        }
    }

    /**
     * Returns list of names all of tasks.
     */
    getTaskNames(tag) {
        let result = [...this[TASKS].entries()].filter((entry) => !entry[1].zombi);
        if (is.string(tag)) {
            result = result.filter(([, info]) => info.tag === tag);
        }

        return result.map((entry) => entry[0]);
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
        } else if (is.object(selector)) {
            if (is.string(selector.name)) {
                name = selector.name;
            }

            if (is.string(selector.task)) {
                filter = (task) => task.observer.taskName === selector.task;
            } else if (is.array(selector.tasks)) {
                filter = (task) => selector.task.includes(task.observer.taskName);
            }
        }

        if (is.string(name)) {
            let observers = this[NOTIFICATIONS].get(name);
            if (is.undefined(observers)) {
                observers = [{
                    filter,
                    observer
                }];
                this[NOTIFICATIONS].set(name, observers);
            } else {
                if (observers.findIndex((info) => info.observer === observer) >= 0) {
                    throw new error.ExistsException("Shuch observer already exists");
                }

                observers.push({
                    filter,
                    observer
                });
            }
        } else {
            const anyNotif = this[NOTIFICATIONS].get(ANY_NOTIFICATION);
            if (anyNotif.findIndex((info) => info.observer === observer) >= 0) {
                throw new error.ExistsException("Shuch observer already exists");
            }
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
        const observers = this[NOTIFICATIONS].get(name);
        if (is.array(observers)) {
            for (const info of observers) {
                if (info.filter(sender, name)) {
                    info.observer(sender, name, ...args);
                }
            }
        }

        const any = this[NOTIFICATIONS].get(ANY_NOTIFICATION);
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
        return this._runNormal(name, ...args);
    }

    /**
     * Runs task in secure vm.
     * 
     * @param {*} name 
     * @param  {...any} args 
     */
    runInVm() {
        // TODO
    }

    /**
     * Runs task in worker thread.
     * 
     * @param {*} name 
     * @param  {...any} args 
     */
    runInThread() {
        // TODO
    }

    /**
     * Runs task in new process.
     * 
     * @param {*} name 
     * @param  {...any} args 
     */
    runInProcess() {
        // TODO
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
        const observer = await this._runNormal(name, ...args);
        this.deleteTask(name);

        return observer;
    }

    async _runNormal(name, ...args) {
        const taskInfo = this._getTaskInfo(name);
        let taskObserver;

        if (taskInfo.singleton) {
            if (is.undefined(taskInfo.runner)) {
                taskInfo.runner = await this._createTaskRunner(taskInfo);
            }
            taskObserver = await taskInfo.runner(args);
        } else {
            const runTask = await this._createTaskRunner(taskInfo);
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

    async _createTaskRunner(taskInfo) {
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

        instance[MANAGER_SYMBOL] = this;
        return instance;
    }

    _initTaskInfo({ name, concurrency = Infinity, interval, singleton = false, description = "", tag } = {}) {
        const taskInfo = {
            name,
            concurrency,
            interval,
            singleton,
            description,
            tag
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
        this[TASKS].set(taskInfo.name, taskInfo);
        const tag = taskInfo.tag;
        if (is.string(tag)) {
            const tasks = this[TAGS].get(tag);
            if (is.undefined(tasks)) {
                this[TAGS].set(tag, [taskInfo]);
            } else {
                tasks.push(taskInfo);
            }
        }
    }

    _uninstallTask(taskInfo) {
        this[TASKS].delete(taskInfo.name);
        const tag = taskInfo.tag;
        if (is.string(tag)) {
            const tasks = this[TAGS].get(tag);
            if (!is.undefined(tasks)) {
                const index = tasks.findIndex((ti) => taskInfo.name === ti.name);
                if (index >= 0) {
                    tasks.splice(index, 1);
                }
            }
        }
    }

    _checkTask(task) {
        if (is.class(task)) {
            const taskInstance = new task();

            if (!is.task(taskInstance)) {
                throw new error.NotValidException("The task class should be inherited from 'adone.task.Task' class");
            }
        } else if (!is.function(task)) {
            throw new error.NotValidException("Task should be a class or a function");
        }
    }

    _getTaskInfo(name) {
        const taskInfo = this[TASKS].get(name);
        if (is.undefined(taskInfo) || taskInfo.zombi === true) {
            throw new error.NotExistsException(`Task '${name}' not exists`);
        }

        return taskInfo;
    }
}
