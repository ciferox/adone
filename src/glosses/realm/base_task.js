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
            await this.initialize(...args);
            this.result = await this.main(...args);
            await this.uninitialize(...args);
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
     * The method in which you can implement the initializing logic and is called before the main() method.
     */
    initialize() {
    }

    /**
     * The method in which you can implement the final logic and is called after the main() method.
     */
    uninitialize() {
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
