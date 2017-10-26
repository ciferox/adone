const {
    is,
    task: { state }
} = adone;

export class Task {
    constructor() {
        this.data = this._ = null;
        this.manager = null;
    }

    /**
     * Method that provides task implementation. Should not run directly.
     * 
     * @return {any}
     */
    run() {
        throw new adone.x.NotImplemented("Method run() not implemented");
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
}
adone.tag.add(Task, "TASK");

export class TaskObserver {
    constructor(task) {
        this.task = task;
        this.state = state.IDLE;
        this.result = undefined;
        this.error = undefined;
    }

    /**
     * Cancels task.
     */
    async cancel() {
        if (this.task.isCancelable() && this.state === state.RUNNING) {
            this.state = state.CANCELLING;
            const defer = adone.promise.defer();            
            await this.task.cancel(defer);
            await defer;
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
            if (this.state in [state.CANCELED, state.FINISHED]) {
                return is.number(ms) && is.function(callback) && callback();
            }
            const defer = adone.promise.defer();
            await this.task.suspend(defer);
            await defer.promise;
            this.state = state.SUSPENDED;
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
        if (this.state === state.SUSPENDED) {
            const defer = adone.promise.defer();
            await this.task.resume(defer);
            await defer;
            this.state = state.RUNNING;
        }
    }

    /**
     * Returns true if the task was running.
     */
    isRunning() {
        return this.state === state.RUNNING;
    }

    /**
     * Returns true if the task was canceled.
     */
    isCancelled() {
        return this.state === state.CANCELLED;
    }

    /**
     * Returns true if the task was completed.
     */
    isCompleted() {
        return this.state === state.COMPLETED;
    }

    /**
     * Returns true if the task was finished.
     */
    isFinished() {
        return this.state === state.CANCELLED || this.state === state.COMPLETED;
    }

    /**
     * Returns true if the task is suspended.
     */
    isSuspended() {
        return this.state === state.SUSPENDED;
    }
}
