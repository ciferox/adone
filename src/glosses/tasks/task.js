const {
    is,
    task: { state }
} = adone;

export class Task {
    constructor() {
        this.data = this._ = {};
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
     * Suspends task. Should be implemented in derived class and should be synchronous.
     */
    suspend() {
    }

    /**
     * Resumes task. Should be implemented in derived class and should be synchronous.
     */
    resume() {
    }

    /**
     * Cancels task. Should be implemented in derived class and should be synchronous.
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
adone.tag.define("TASK", "task");
adone.tag.set(Task, adone.tag.TASK);

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
    cancel() {
        if (this.task.isCancelable() && this.state === state.RUNNING) {
            this.task.cancel();
            this.state = state.CANCELLING;
        }
    }

    /**
     * Pauses task.
     * 
     * @param {number} ms If provided, the task will be resumed after the specified timeout.
     * @param {function} callback Is used only in conjunction with the 'ms' parameter, otherwise will be ignored.
     */
    suspend(ms, callback) {
        if (this.task.isSuspendable()) {
            if (this.state in [state.CANCELED, state.FINISHED]) {
                return is.number(ms) && is.function(callback) && callback();
            }
            this.task.suspend();
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
    resume() {
        if (this.state === state.SUSPENDED) {
            this.task.resume();
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
