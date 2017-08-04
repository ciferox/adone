const native = adone.bind("git.node");
const {
    promise,
    vcs: { git: { ProxyOptions, PushOptions, RemoteCallbacks, Utils: { normalizeFetchOptions, normalizeOptions, lookupWrapper, shallowClone } } }
} = adone;

const Remote = native.Remote;

Remote.AUTOTAG_OPTION = {
    DOWNLOAD_TAGS_UNSPECIFIED: 0,
    DOWNLOAD_TAGS_AUTO: 1,
    DOWNLOAD_TAGS_NONE: 2,
    DOWNLOAD_TAGS_ALL: 3
};
Remote.COMPLETION_TYPE = {
    COMPLETION_DOWNLOAD: 0,
    COMPLETION_INDEXING: 1,
    COMPLETION_ERROR: 2
};

Remote.create = promise.promisifyAll(Remote.create);
Remote.createAnonymous = promise.promisifyAll(Remote.createAnonymous);
Remote.createWithFetchspec = promise.promisifyAll(Remote.createWithFetchspec);
Remote.prototype.defaultBranch = promise.promisifyAll(Remote.prototype.defaultBranch);
Remote.delete = promise.promisifyAll(Remote.delete);
Remote.prototype.disconnect = promise.promisifyAll(Remote.prototype.disconnect);
Remote.prototype.dup = promise.promisifyAll(Remote.prototype.dup);
Remote.prototype.getFetchRefspecs = promise.promisifyAll(Remote.prototype.getFetchRefspecs);
Remote.prototype.getPushRefspecs = promise.promisifyAll(Remote.prototype.getPushRefspecs);
Remote.list = promise.promisifyAll(Remote.list);
Remote.lookup = promise.promisifyAll(Remote.lookup);
Remote.prototype.referenceList = promise.promisifyAll(Remote.prototype.referenceList);

const asyncConnect = promise.promisifyAll(Remote.prototype.connect);
const asyncDownload = promise.promisifyAll(Remote.prototype.download);
const asyncFetch = promise.promisifyAll(Remote.prototype.fetch);
const asyncPush = promise.promisifyAll(Remote.prototype.push);
const asyncUpload = Remote.prototype.upload;


/**
 * Retrieves the remote by name
 * @async
 * @param {Repository} repo The repo that the remote lives in
 * @param {String|Remote} name The remote to lookup
 * @param {Function} callback
 * @return {Remote}
 */
Remote.lookup = lookupWrapper(Remote);

/**
 * Connects to a remote
 *
 * @async
 * @param {Enums.DIRECTION} direction The direction for the connection
 * @param {RemoteCallbacks} callbacks The callback functions for the connection
 * @param {ProxyOptions} proxyOpts Proxy settings
 * @param {Array<string>} customHeaders extra HTTP headers to use
 * @param {Function} callback
 * @return {Number} error code
 */
Remote.prototype.connect = function (direction, callbacks, proxyOpts, customHeaders) {
    callbacks = normalizeOptions(callbacks || {}, RemoteCallbacks);
    proxyOpts = normalizeOptions(proxyOpts || {}, ProxyOptions);
    customHeaders = customHeaders || [];

    return asyncConnect.call(this, direction, callbacks, proxyOpts, customHeaders);
};

/**
 * Connects to a remote
 *
 * @async
 * @param {Array} refSpecs The ref specs that should be pushed
 * @param {FetchOptions} opts The fetch options for download, contains callbacks
 * @param {Function} callback
 * @return {Number} error code
 */
Remote.prototype.download = function (refspecs, opts) {
    return asyncDownload.call(this, refspecs, normalizeFetchOptions(opts));
};

/**
 * Connects to a remote
 *
 * @async
 * @param {Array} refSpecs The ref specs that should be pushed
 * @param {FetchOptions} opts The fetch options for download, contains callbacks
 * @param {String} message The message to use for the update reflog messages
 * @param {Function} callback
 * @return {Number} error code
 */
Remote.prototype.fetch = function (refspecs, opts, reflogMessage) {
    return asyncFetch.call(this, refspecs, normalizeFetchOptions(opts), reflogMessage);
};

/**
 * Pushes to a remote
 *
 * @async
 * @param {Array} refSpecs The ref specs that should be pushed
 * @param {PushOptions} options Options for the checkout
 * @param {Function} callback
 * @return {Number} error code
 */
Remote.prototype.push = function (refSpecs, opts) {
    let callbacks;
    let proxyOpts;

    if (opts) {
        opts = shallowClone(opts);
        callbacks = opts.callbacks;
        proxyOpts = opts.proxyOpts;
        delete opts.callbacks;
        delete opts.proxyOpts;
    } else {
        opts = {};
    }

    opts = normalizeOptions(opts, PushOptions);

    if (callbacks) {
        opts.callbacks = normalizeOptions(callbacks, RemoteCallbacks);
    }

    if (proxyOpts) {
        opts.proxyOpts = normalizeOptions(proxyOpts, ProxyOptions);
    }

    return asyncPush.call(this, refSpecs, opts);
};

/**
 * Lists advertised references from a remote. You must connect to the remote
 * before using referenceList.
 *
 * @async
 * @return {Promise<Array<RemoteHead>>} a list of the remote heads the remote
 *                                      had available at the last established
 *                                      connection.
 *
 */
Remote.prototype.referenceList = Remote.prototype.referenceList;

/**
 * Connects to a remote
 *
 * @async
 * @param {Array} refSpecs The ref specs that should be pushed
 * @param {FetchOptions} opts The fetch options for download, contains callbacks
 * @param {String} message The message to use for the update reflog messages
 * @param {Function} callback
 * @return {Number} error code
 */
Remote.prototype.fetch = function (refspecs, opts, reflogMessage) {
    return asyncFetch.call(this, refspecs, normalizeFetchOptions(opts), reflogMessage);
};

/**
 * Pushes to a remote
 *
 * @async
 * @param {Array} refSpecs The ref specs that should be pushed
 * @param {PushOptions} options Options for the checkout
 * @param {Function} callback
 * @return {Number} error code
 */
Remote.prototype.upload = function (refSpecs, opts) {
    let callbacks;
    let proxyOpts;

    if (opts) {
        opts = shallowClone(opts);
        callbacks = opts.callbacks;
        proxyOpts = opts.proxyOpts;
        delete opts.callbacks;
        delete opts.proxyOpts;
    } else {
        opts = {};
    }

    opts = normalizeOptions(opts, PushOptions);

    if (callbacks) {
        opts.callbacks = normalizeOptions(callbacks, RemoteCallbacks);
    }

    if (proxyOpts) {
        opts.proxyOpts =
            normalizeOptions(proxyOpts, ProxyOptions);
    }

    return asyncUpload.call(this, refSpecs, opts);
};

export default Remote;
