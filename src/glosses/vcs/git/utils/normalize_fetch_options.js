const { vcs: { git: { FetchOptions, RemoteCallbacks, ProxyOptions, Utils: { shallowClone, normalizeOptions } } } } = adone;

/**
 * Normalize an object to match a struct.
 *
 * @param {String, Object} oid - The oid string or instance.
 * @return {Object} An Oid instance.
 */
export default function normalizeFetchOptions(options) {
    if (options instanceof FetchOptions) {
        return options;
    }

    let callbacks;
    let proxyOpts;

    if (options) {
        options = shallowClone(options);
        callbacks = options.callbacks;
        proxyOpts = options.proxyOpts;
        delete options.callbacks;
        delete options.proxyOpts;
    } else {
        options = {};
    }

    options = normalizeOptions(options, FetchOptions);

    if (callbacks) {
        options.callbacks =
            normalizeOptions(callbacks, RemoteCallbacks);
    }

    if (proxyOpts) {
        options.proxyOpts =
            normalizeOptions(proxyOpts, ProxyOptions);
    }
    return options;
}
