const {
    is,
    error,
    promise,
    task: { STATE }
} = adone;

const { OBSERVER_SYMBOL } = adone.private(adone.task);

const TASK_INFO = Symbol();

export default class TaskObserver {
    constructor(task, taskInfo) {
        this.task = task;
        this.task[OBSERVER_SYMBOL] = this;
        this.taskInfo = taskInfo;
        this.state = STATE.IDLE;
        this.result = undefined;
        this.error = undefined;
    }

    get taskName() {
        return this.taskInfo.name;
    }

    set taskName(val) {
        throw new error.NotAllowedException("Property 'taskName' is immutable");
    }

    /**
     * Cancels task.
     */
    async cancel() {
        if (!this.cancelable) {
            throw new error.NotAllowedException(`Task '${this.taskInfo.name}' is not cancelable`);
        }
        if (this.state === STATE.RUNNING) {
            this.state = STATE.CANCELLING;
            const defer = promise.defer();
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
        if (this.suspendable) {
            switch (this.state) {
                case STATE.CANCELED:
                case STATE.FINISHED:
                    return is.number(ms) && is.function(callback) && callback();
            }
            const defer = promise.defer();
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
            const defer = promise.defer();
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
    get suspendable() {
        return this.taskInfo.suspendable;
    }

    /**
     * Returns true if the task is cancelable.
     */
    get cancelable() {
        return this.taskInfo.cancelable;
    }

    /**
     * Returns true if the task was running.
     */
    get running() {
        return this.state === STATE.RUNNING;
    }

    /**
     * Returns true if the task was canceled.
     */
    get cancelled() {
        return this.state === STATE.CANCELLED;
    }

    /**
     * Returns true if the task was completed.
     */
    get completed() {
        return this.state === STATE.COMPLETED;
    }

    /**
     * Returns true if the task was finished.
     */
    get failed() {
        return this.state === STATE.FAILED;
    }

    /**
     * Returns true if the task was finished.
     */
    get finished() {
        return this.state === STATE.CANCELLED || this.state === STATE.COMPLETED;
    }

    /**
     * Returns true if the task is suspended.
     */
    get suspended() {
        return this.state === STATE.SUSPENDED;
    }
}
