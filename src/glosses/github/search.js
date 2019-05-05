import Requestable from "./requestable";

/**
 * Wrap the Search API
 */
export default class Search extends Requestable {
    /**
     * Create a Search
     * @param {Object} defaults - defaults for the search
     * @param {Requestable.auth} [auth] - information required to authenticate to Github
     * @param {string} [apiBase=https://api.github.com] - the base Github API URL
     */
    constructor(defaults, auth, apiBase) {
        super(auth, apiBase);
        this.__defaults = this._getOptionsWithDefaults(defaults);
    }

    /**
     * Available search options
     * @see https://developer.github.com/v3/search/#parameters
     * @typedef {Object} Search.Params
     * @param {string} q - the query to make
     * @param {string} sort - the sort field, one of `stars`, `forks`, or `updated`.
     *                      Default is [best match](https://developer.github.com/v3/search/#ranking-search-results)
     * @param {string} order - the ordering, either `asc` or `desc`
     */
    /**
     * Perform a search on the GitHub API
     * @private
     * @param {string} path - the scope of the search
     * @param {Search.Params} [withOptions] - additional parameters for the search
     * @param {Requestable.callback} [cb] - will receive the results of the search
     * @return {Promise} - the promise for the http request
     */
    _search(path, withOptions = {}, cb = undefined) {
        const requestOptions = {};
        Object.keys(this.__defaults).forEach((prop) => {
            requestOptions[prop] = this.__defaults[prop];
        });
        Object.keys(withOptions).forEach((prop) => {
            requestOptions[prop] = withOptions[prop];
        });

        return this._requestAllPages(`/search/${path}`, requestOptions, cb);
    }

    /**
     * Search for repositories
     * @see https://developer.github.com/v3/search/#search-repositories
     * @param {Search.Params} [options] - additional parameters for the search
     * @param {Requestable.callback} [cb] - will receive the results of the search
     * @return {Promise} - the promise for the http request
     */
    forRepositories(options, cb) {
        return this._search("repositories", options, cb);
    }

    /**
     * Search for code
     * @see https://developer.github.com/v3/search/#search-code
     * @param {Search.Params} [options] - additional parameters for the search
     * @param {Requestable.callback} [cb] - will receive the results of the search
     * @return {Promise} - the promise for the http request
     */
    forCode(options, cb) {
        return this._search("code", options, cb);
    }

    /**
     * Search for issues
     * @see https://developer.github.com/v3/search/#search-issues
     * @param {Search.Params} [options] - additional parameters for the search
     * @param {Requestable.callback} [cb] - will receive the results of the search
     * @return {Promise} - the promise for the http request
     */
    forIssues(options, cb) {
        return this._search("issues", options, cb);
    }

    /**
     * Search for users
     * @see https://developer.github.com/v3/search/#search-users
     * @param {Search.Params} [options] - additional parameters for the search
     * @param {Requestable.callback} [cb] - will receive the results of the search
     * @return {Promise} - the promise for the http request
     */
    forUsers(options, cb) {
        return this._search("users", options, cb);
    }
}
