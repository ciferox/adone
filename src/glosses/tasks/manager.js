const {
    fs,
    is,
    error,
    util
} = adone;

const { MANAGER_SYMBOL } = adone.getPrivate(adone.task);
const ANY_NOTIFICATION = Symbol();

const DUMMY_THROTTLE = (tsk) => tsk();

const getOptionValue = (arg, meta, predicate, def) => predicate(arg)
    ? arg
    : predicate(meta)
        ? meta
        : def


/**
 * Basic implementation of task manager that owns and manages tasks.
 * 
 * 
 * 
 * To implement more advanced manager you should inherit this class.
 */
export default class TaskManager extends adone.event.AsyncEmitter {
    static DEFAULT_LOAD_POLICY = "throw";

    #tasks = new Map();

    #tags = new Map();

    #notifications = new Map();

    constructor() {
        super();
        this.#tasks = new Map();
        this.#tags = new Map();
        this.#notifications = new Map();
        this.#notifications.set(ANY_NOTIFICATION, []);
    }

    /**
     * Adds or replaces task with specified name.
     * 
     * @param {string} name task name
     * @param {class|function} task task class inherited from {adone.task.Task} or function
     * @param {object} options 
     */
    addTask({ name, task, loadPolicy = "throw", ...options } = {}) {
        if (is.class(task)) {
            const taskInstance = new task();

            if (!is.task(taskInstance)) {
                throw new error.NotValidException("The task class should be inherited from 'adone.task.Task' class");
            }
        } else if (!is.function(task)) {
            throw new error.NotValidException("Task should be a class or a function");
        }

        if (!is.string(name)) {
            const meta = adone.task.getTaskMeta(task);
            if (is.string(meta)) {
                name = meta;
            } else if (is.object(meta)) {
                name = meta.name;
            }

            if (!name && is.class(task)) {
                name = task.name;
            }

            if (!name) {
                throw new error.NotValidException(`Invalid name of task: ${name}`);
            }
        }

        const hasTask = this.#tasks.has(name);

        if (loadPolicy === "throw") {
            if (hasTask) {
                throw new error.ExistsException(`Task '${name}' already exists`);
            }
        } else if (loadPolicy === "ignore") {
            if (hasTask) {
                return false;
            }
        } else if (loadPolicy === "replace") {
            // Nothing to do...
            // But, in this case we need check previous task state and if task is busy we should wait for it completion.
        }

        const taskInfo = this.#initTaskInfo({
            ...options,
            name,
            task
        });

        let TaskClass;
        if (is.class(task)) {
            TaskClass = task;
        } else if (is.function(task)) {
            TaskClass = class extends adone.task.Task {
                main(...args) {
                    return task.apply(this, args);
                }
            };
        } else {
            throw new error.InvalidArgumentException(`Invalid type of task argument: ${adone.typeOf(task)}`);
        }

        taskInfo.Class = TaskClass;
        return this.#installTask(taskInfo);
    }

    /**
     * Loads tasks from specified location(s).
     * 
     * @param {string|array} path  list of locations from which tasks be loaded
     * @param {string} options.policy load policy:
     * - throw (default): throw an exception if a task with the same name is already loaded
     * - ignore: ignore tasks of the same name
     * - replace: replace loaded task by newtask with same name
     */
    async loadTasksFrom(path, { transpile = false, tag, ignore, ignoreExts = [".map"], ...taskOptions } = {}) {
        let paths;
        if (is.string(path)) {
            paths = util.arrify(path);
        } else if (is.array(path)) {
            paths = path;
        } else {
            throw new error.InvalidArgumentException("Invalid 'path' argument");
        }

        ignore = util.arrify(ignore);

        for (const p of paths) {
            if (!(await fs.pathExists(p))) {
                continue;
            }

            let files;
            if (await fs.isDirectory(p)) {
                files = await fs.readdir(p);
            } else {
                files = [p];
            }

            for (const f of files) {
                if (ignoreExts.includes(adone.std.path.extname(f)) || ignore.includes(f)) {
                    continue;
                }
                let fullPath;
                try {
                    fullPath = adone.module.resolve(adone.path.join(p, f));
                } catch (err) {
                    continue;
                }

                if (await fs.isDirectory(fullPath)) {
                    continue;
                }

                let modExports;

                try {
                    modExports = (transpile)
                        ? adone.require(fullPath)
                        : require(fullPath);
                } catch (err) {
                    console.log(adone.pretty.error(err));
                    // ignore non javascript files
                    continue;
                }
                if (modExports.default) {
                    modExports = modExports.default;
                }

                let tasks;
                if (is.class(modExports)) {
                    tasks = [modExports];
                } else if (is.plainObject(modExports)) {
                    tasks = [...Object.values(modExports)];
                } else {
                    continue;
                }

                for (const task of tasks) {
                    // console.log(fullPath);
                    await this.addTask({
                        ...taskOptions,
                        task,
                        tag,
                    });
                }
            }
        }
    }

    /**
     * Returns task info.
     * 
     * @param {object} name task name
     */
    getTask(name) {
        return this.#getTaskInfo(name);
    }

    /**
     * Returns task class.
     * 
     * @param {string} name task name
     */
    getTaskClass(name) {
        const taskInfo = this.#getTaskInfo(name);
        return taskInfo.Class;
    }

    /**
     * Returns tasks info by tag.
     * 
     * @param {*} name 
     */
    getTasksByTag(tag) {
        const tasks = this.#tags.get(tag);
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
        return this.#createTaskInstance(this.#getTaskInfo(name));
    }

    /**
     * Returns true if task with such name owned by the manager.
     * @param {string} name 
     */
    hasTask(name) {
        return this.#tasks.has(name);
    }

    /**
     * Deletes task with specified name.
     * 
     * @param {string} name 
     */
    deleteTask(name) {
        const taskInfo = this.#getTaskInfo(name);
        if (!is.undefined(taskInfo.runners) && taskInfo.runners.size > 0) {
            taskInfo.zombi = true;
        } else {
            return this.#uninstallTask(taskInfo);
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
        let result = [...this.#tasks.entries()].filter((entry) => !entry[1].zombi);
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
            let observers = this.#notifications.get(name);
            if (is.undefined(observers)) {
                observers = [{
                    filter,
                    observer
                }];
                this.#notifications.set(name, observers);
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
            const anyNotif = this.#notifications.get(ANY_NOTIFICATION);
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
        const observers = this.#notifications.get(name);
        if (is.array(observers)) {
            for (const info of observers) {
                if (info.filter(sender, name)) {
                    info.observer(sender, name, ...args);
                }
            }
        }

        const any = this.#notifications.get(ANY_NOTIFICATION);
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
        return this.#runNormal(name, ...args);
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
        await this.addTask({ name, task });
        const observer = await this.#runNormal(name, ...args);
        this.deleteTask(name);

        return observer;
    }

    async #runNormal(name, ...args) {
    const taskInfo = this.#getTaskInfo(name);
    let taskObserver;

    if (taskInfo.singleton) {
        if (is.undefined(taskInfo.runner)) {
            taskInfo.runner = await this.#createTaskRunner(taskInfo);
        }
        taskObserver = await taskInfo.runner(args);
    } else {
        const runTask = await this.#createTaskRunner(taskInfo);
        if (is.undefined(taskInfo.runners)) {
            taskInfo.runners = new Set();
        }
        taskInfo.runners.add(runTask);
        taskObserver = await runTask(args);

        const releaseRunner = () => {
            taskInfo.runners.delete(runTask);
            if (taskInfo.zombi === true && taskInfo.runners.size === 0) {
                this.#uninstallTask(taskInfo);
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

async #createTaskRunner(taskInfo) {
    return async (args) => {
        const instance = await this.#createTaskInstance(taskInfo);

        const taskObserver = new adone.task.TaskObserver(instance, taskInfo);
        taskObserver.state = adone.task.STATE.RUNNING;
        try {
            taskObserver.result = taskInfo.throttle(() => instance._run(...args));
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

#createTaskInstance(taskInfo) {
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

#initTaskInfo({ task, name, suspendable, cancelable, concurrency, interval, singleton, description, tag } = {}) {
    if (suspendable && singleton) {
        throw new error.NotAllowedException("Singleton task cannot be suspendable");
    }

    if (cancelable && singleton) {
        throw new error.NotAllowedException("Singleton task cannot be cancelable");
    }

    let meta = adone.task.getTaskMeta(task);
    if (is.string(meta) || is.undefined(meta)) {
        meta = {};
    }

    const taskInfo = {
        name,
        suspendable: getOptionValue(suspendable, meta.suspendable, is.boolean, false),
        cancelable: getOptionValue(cancelable, meta.cancelable, is.boolean, false),
        concurrency: getOptionValue(concurrency, meta.concurrency, is.number, Infinity),
        interval: getOptionValue(interval, meta.interval, is.number, undefined),
        singleton: getOptionValue(singleton, meta.singleton, is.boolean, false),
        description: getOptionValue(description, meta.description, is.string, ""),
        tag: getOptionValue(tag, meta.tag, is.string, undefined)
    };

    if (concurrency !== Infinity && concurrency > 0) {
        taskInfo.throttle = util.throttle.create({
            concurrency,
            interval
        });
    } else {
        taskInfo.throttle = DUMMY_THROTTLE;
    }

    return taskInfo;
}

#installTask(taskInfo) {
    this.#tasks.set(taskInfo.name, taskInfo);
    const tag = taskInfo.tag;
    if (is.string(tag)) {
        const tasks = this.#tags.get(tag);
        if (is.undefined(tasks)) {
            this.#tags.set(tag, [taskInfo]);
        } else {
            tasks.push(taskInfo);
        }
    }
}

#uninstallTask(taskInfo) {
    this.#tasks.delete(taskInfo.name);
    const tag = taskInfo.tag;
    if (is.string(tag)) {
        const tasks = this.#tags.get(tag);
        if (!is.undefined(tasks)) {
            const index = tasks.findIndex((ti) => taskInfo.name === ti.name);
            if (index >= 0) {
                tasks.splice(index, 1);
            }
        }
    }
}

#getTaskInfo(name) {
    const taskInfo = this.#tasks.get(name);
    if (is.undefined(taskInfo) || taskInfo.zombi === true) {
        throw new error.NotExistsException(`Task '${name}' not exists`);
    }

    return taskInfo;
}
}
