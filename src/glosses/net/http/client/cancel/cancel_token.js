

const imports = adone.lazify({
    Cancel: "./cancel"
}, null, require);

/**
 * A `CancelToken` is an object that can be used to request cancellation of an operation.
 *
 * @class
 * @param {Function} executor The executor function.
 */
export default class CancelToken {
    constructor(executor) {
        if (!adone.is.function(executor)) {
            throw new adone.x.InvalidArgument("executor must be a function.");
        }
        let resolvePromise;
        this.promise = new Promise((resolve) => resolvePromise = resolve);
        const token = this;
        executor((message) => {
            if (token.reason) {
                // has been requested
                return;
            }
            token.reason = new imports.Cancel(message);
            resolvePromise(token.reason);
        });
    }

    /**
     * Throws a `Cancel` if cancellation has been requested.
     */
    throwIfRequested() {
        if (this.reason) {
            throw this.reason;
        }
    
    }

    /**
     * Returns an object that contains a new `CancelToken` and a function that, when called,
     * cancels the `CancelToken`.
     */
    static source() {
        let cancel;
        const token = new CancelToken((c) => cancel = c);
        return { token, cancel };
    }
}