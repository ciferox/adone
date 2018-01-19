import Deferred from "./deferred";
import * as errors from "./errors";

const { is } = adone;

const fbind = (fn, ctx) => (...args) => fn.apply(ctx, args);

/**
 * Wraps a users request for a resource
 * Basically a promise mashed in with a timeout
 * @private
 */
export default class ResourceRequest extends Deferred {
    /**
     * [constructor description]
     * @param  {Number} ttl     timeout
     */
    constructor(ttl, Promise) {
        super(Promise);
        this._creationTimestamp = Date.now();
        this._timeout = null;

        if (!is.undefined(ttl)) {
            this.setTimeout(ttl);
        }
    }

    setTimeout(delay) {
        if (this._state !== ResourceRequest.PENDING) {
            return;
        }
        const ttl = parseInt(delay, 10);

        if (isNaN(ttl) || ttl <= 0) {
            throw new Error("delay must be a positive int");
        }

        const age = Date.now() - this._creationTimestamp;

        if (this._timeout) {
            this.removeTimeout();
        }

        this._timeout = setTimeout(
            fbind(this._fireTimeout, this),
            Math.max(ttl - age, 0)
        );
    }

    removeTimeout() {
        if (this._timeout) {
            clearTimeout(this._timeout);
        }
        this._timeout = null;
    }

    _fireTimeout() {
        this.reject(new errors.TimeoutError("ResourceRequest timed out"));
    }

    reject(reason) {
        this.removeTimeout();
        super.reject(reason);
    }

    resolve(value) {
        this.removeTimeout();
        super.resolve(value);
    }
}
