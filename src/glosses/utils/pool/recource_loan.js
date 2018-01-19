import Deferred from "./deferred";

/**
 * Plan is to maybe add tracking via Error objects
 * and other fun stuff!
 */

export default class ResourceLoan extends Deferred {
    /**
     *
     * @param  {PooledResource} pooledResource the PooledResource this loan belongs to
     * @return {[type]}                [description]
     */
    constructor(pooledResource, Promise) {
        super(Promise);
        this._creationTimestamp = Date.now();
        this.pooledResource = pooledResource;
    }

    reject() {
        /**
         * Loans can only be resolved at the moment
         */
    }
}
