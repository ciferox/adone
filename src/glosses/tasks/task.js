const {
    is,
    error,
    task: { STATE }
} = adone;

const { MANAGER_SYMBOL, TASKNAME_SYMBOL, OBSERVER_SYMBOL } = adone.private(adone.task);

export class Task {
    constructor() {
        this[MANAGER_SYMBOL] = null;
        this[OBSERVER_SYMBOL] = null;
    }

    get name() {
        return this[TASKNAME_SYMBOL];
    }

    set name(val) {
        throw new error.NotAllowed("Task's 'name' is immutable");
    }

    get observer() {
        return this[OBSERVER_SYMBOL];
    }

    set observer(val) {
        throw new error.NotAllowed("Task's 'observer' is immutable");
    }

    get manager() {
        return this[MANAGER_SYMBOL];
    }

    set manager(val) {
        throw new error.NotAllowed("Task's 'manager' is immutable");
    }

    /**
     * Method that provides task implementation. Should not run directly.
     * 
     * @return {any}
     */
    run() {
        throw new error.NotImplemented("Method run() is not implemented");
    }

    /**
     * Suspends task. Should be implemented in derived class.
     */
    suspend() {
    }

    /**
     * Resumes task. Should be implemented in derived class.
     */
    resume() {
    }

    /**
     * Cancels task. Should be implemented in derived class.
     */
    cancel() {
    }

    /**
     * Returns true if the task is suspendable.
     */
    isSuspendable() {
        return false;
    }

    /**
     * Returns true if the task is cancelable.
     */
    isCancelable() {
        return false;
    }

    log(...args) {
        this.manager.notify(this, "log", ...args);
    }

    logFatal(...args) {
        this.manager.notify(this, "logFatal", ...args);
    }

    logError(...args) {
        this.manager.notify(this, "logError", ...args);
    }

    logWarn(...args) {
        this.manager.notify(this, "logWarn", ...args);
    }

    logInfo(...args) {
        this.manager.notify(this, "logInfo", ...args);
    }

    logDebug(...args) {
        this.manager.notify(this, "logDebug", ...args);
    }

    logTrace(...args) {
        this.manager.notify(this, "logTrace", ...args);
    }
}
adone.tag.add(Task, "TASK");

export class TaskObserver {
    constructor(task, name) {
        this.task = task;
        this.task[OBSERVER_SYMBOL] = this;
        this.name = name;
        this.state = STATE.IDLE;
        this.result = undefined;
        this.error = undefined;
    }

    /**
     * Cancels task.
     */
    async cancel() {
        if (!this.task.isCancelable()) {
            throw new error.NotAllowed(`Task '${this.name}' is not cancelable`);
        }
        if (this.state === STATE.RUNNING) {
            this.state = STATE.CANCELLING;
            const defer = adone.promise.defer();
            await this.task.cancel(defer);
            await defer.promise;
        }
    }

    /**
     * Pauses task.
     * 
     * @param {number} ms If provided, the task will be resumed after the specified timeout.
     * @param {function} callback Is used only in conjunction with the 'ms' parameter, otherwise will be ignored.
     */
    async suspend(ms, callback) {
        if (this.task.isSuspendable()) {
            switch (this.state) {
                case STATE.CANCELED:
                case STATE.FINISHED:
                    return is.number(ms) && is.function(callback) && callback();
            }
            const defer = adone.promise.defer();
            await this.task.suspend(defer);
            await defer.promise;
            this.state = STATE.SUSPENDED;
            if (is.number(ms)) {
                setTimeout(() => {
                    if (is.function(callback)) {
                        callback();
                    }
                    this.resume();
                }, ms);
            }
        }
    }

    /**
     * Resumes task.
     */
    async resume() {
        if (this.state === STATE.SUSPENDED) {
            const defer = adone.promise.defer();
            await this.task.resume(defer);
            await defer.promise;
            this.state = STATE.RUNNING;
        }
    }

    async finally(fn) {
        if (is.promise(this.result)) {
            this.result = this.result.then(async (result) => {
                await fn();
                return result;
            }).catch(async (err) => {
                await fn();
                throw err;
            });
        } else {
            await fn();
        }
    }

    /**
     * Returns true if the task is suspendable.
     */
    isSuspendable() {
        return this.task.isSuspendable();
    }

    /**
     * Returns true if the task is cancelable.
     */
    isCancelable() {
        return this.task.isCancelable();
    }

    /**
     * Returns true if the task was running.
     */
    isRunning() {
        return this.state === STATE.RUNNING;
    }

    /**
     * Returns true if the task was canceled.
     */
    isCancelled() {
        return this.state === STATE.CANCELLED;
    }

    /**
     * Returns true if the task was completed.
     */
    isCompleted() {
        return this.state === STATE.COMPLETED;
    }

    /**
     * Returns true if the task was finished.
     */
    isFailed() {
        return this.state === STATE.FAILED;
    }

    /**
     * Returns true if the task was finished.
     */
    isFinished() {
        return this.state === STATE.CANCELLED || this.state === STATE.COMPLETED;
    }

    /**
     * Returns true if the task is suspended.
     */
    isSuspended() {
        return this.state === STATE.SUSPENDED;
    }
}
adone.tag.add(TaskObserver, "TASK_OBSERVER");
