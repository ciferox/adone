const native = adone.nativeAddon("git.node");
const {
    promise: { promisifyAll },
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

Remote.create = promisifyAll(Remote.create);
Remote.createAnonymous = promisifyAll(Remote.createAnonymous);
Remote.createWithFetchspec = promisifyAll(Remote.createWithFetchspec);
Remote.prototype.defaultBranch = promisifyAll(Remote.prototype.defaultBranch);
Remote.delete = promisifyAll(Remote.delete);
Remote.prototype.disconnect = promisifyAll(Remote.prototype.disconnect);
Remote.prototype.dup = promisifyAll(Remote.prototype.dup);
Remote.prototype.getFetchRefspecs = promisifyAll(Remote.prototype.getFetchRefspecs);
Remote.prototype.getPushRefspecs = promisifyAll(Remote.prototype.getPushRefspecs);
Remote.list = promisifyAll(Remote.list);
Remote.lookup = promisifyAll(Remote.lookup);
Remote.prototype.referenceList = promisifyAll(Remote.prototype.referenceList);

const asyncConnect = promisifyAll(Remote.prototype.connect);
const asyncDownload = promisifyAll(Remote.prototype.download);
const asyncFetch = promisifyAll(Remote.prototype.fetch);
const asyncPush = promisifyAll(Remote.prototype.push);
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
