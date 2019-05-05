import Requestable from "./requestable";

/**
 * RateLimit allows users to query their rate-limit status
 */
export default class RateLimit extends Requestable {
    /**
     * Query the current rate limit
     * @see https://developer.github.com/v3/rate_limit/
     * @param {Requestable.callback} [cb] - will receive the rate-limit data
     * @return {Promise} - the promise for the http request
     */
    getRateLimit(cb) {
        return this._request("GET", "/rate_limit", null, cb);
    }
}
