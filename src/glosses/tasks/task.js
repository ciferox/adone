const {
    error
} = adone;

const { MANAGER_SYMBOL, OBSERVER_SYMBOL } = adone.private(adone.task);

export default class Task {
    constructor() {
        this[MANAGER_SYMBOL] = null;
        this[OBSERVER_SYMBOL] = null;
    }

    get observer() {
        return this[OBSERVER_SYMBOL];
    }

    set observer(val) {
        throw new error.ImmutableException("Task's 'observer' is immutable");
    }

    get manager() {
        return this[MANAGER_SYMBOL];
    }

    set manager(val) {
        throw new error.ImmutableException("Task's 'manager' is immutable");
    }

    /**
     * Actual task implementation.
     * 
     * @return {any}
     */
    main() {
        throw new error.NotImplementedException("Method main() is not implemented");
    }

    /**
     * This method that the manager actually calls when performing the task.
     * 
     * If you need some custom steps before the actual task's code run, you should override this method.
     * 
     * @param  {...any} args 
     */
    _run(...args) {
        return this.main(...args);
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
}
