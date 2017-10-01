const { collection } = adone;

/**
 * Represents an asynchronous queue, each pop is a promise
 * that is resolved with an existing element or an element that will be pushed in the future
 */
export default class AsyncQueue extends collection.Queue {
    constructor() {
        super();
        this._awaiters = new collection.Queue();
    }

    /**
     * Pushes a new value or immediately resolves a promise
     */
    push(v) {
        if (!this._awaiters.empty) {
            this._awaiters.pop()(v);
            return;
        }
        return super.push(v);
    }

    /**
     * Returns a promise that will be resolved with an existing element or an element that will be pushed in the future
     *
     * @returns {Promise<any>}
     */
    pop() {
        return new Promise((resolve) => {
            if (!this.empty) {
                return resolve(super.pop());
            }
            this._awaiters.push(resolve);
        });
    }
}
