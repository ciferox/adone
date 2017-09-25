const {
    task,
    x
} = adone;

export default class BaseTask extends task.Task {
    constructor() {
        super();
        this.initResult = undefined;
        this.result = undefined;
    }

    async run(...args) {
        try {
            await this.initialize(...args);
            this.result = await this.main(...args);
            await this.uninitialize(...args);
        } catch (err) {
            await this.exception(err);
        }
        return this.result;
    }

    /**
     * The method in which you can implement the initializing logic and is called before the main() method.
     */
    initialize() {
    }

    /**
     * The method in which the common logic should be implemented.
     */
    main() {
        throw new x.NotImplemented("Method main() is not implemented");
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
    exception(err) {
        adone.error(err);
    }
}
