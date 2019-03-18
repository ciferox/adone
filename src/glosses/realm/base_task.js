const {
    task,
    error
} = adone;

export default class BaseTask extends task.IsomorphicTask {
    constructor() {
        super();
        this.result = undefined;
    }

    async _run(...args) {
        this._validateArgs(args);
        try {
            this.result = await this.main(...args);
        } catch (err) {
            await this.error(err);
            return;
        }
        return this.result;
    }

    async runAnotherTask(name, ...args) {
        return this.manager.runAndWait(name, ...args);
    }
    
    /**
     * Calls in case of error.
     *
     * @param {Error} err
     */
    error(err) {
        // throw err;
        console.error(adone.pretty.error(err));
    }
}
