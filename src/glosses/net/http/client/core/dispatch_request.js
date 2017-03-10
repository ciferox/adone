

const imports = adone.lazify({
    transformData: "./transform_data",
    isCancel: "../cancel/is_cancel",
    defaults: "../defaults"
}, null, require);

/**
 * Throws a `Cancel` if cancellation has been requested.
 */
function throwIfCancellationRequested(config) {
    if (config.cancelToken) {
        config.cancelToken.throwIfRequested();
    }
}

/**
 * Dispatch a request to the server using the configured adapter.
 *
 * @param {object} config The config that is to be used for the request
 * @returns {Promise} The Promise to be fulfilled
 */
export default function dispatchRequest(config) {
    throwIfCancellationRequested(config);

    // Ensure headers exist
    config.headers = config.headers || {};

    // Transform request data
    config.data = imports.transformData(
        config.data,
        config.headers,
        config.transformRequest
    );

    // Flatten headers
    config.headers = adone.vendor.lodash.merge(
        {},
        config.headers.common || {},
        config.headers[config.method] || {},
        config.headers || {}
    );

    for (const method of ["delete", "get", "head", "post", "put", "patch", "common"]) {
        delete config.headers[method];
    }

    const adapter = config.adapter || imports.defaults.adapter;

    return adapter(config)
        .then((response) => {
            throwIfCancellationRequested(config);
            // Transform response data
            response.data = imports.transformData(response.data, response.headers, config.transformResponse);
            return response;
        }, (reason) => {
            if (!imports.isCancel(reason)) {
                throwIfCancellationRequested(config);

                // Transform response data
                if (reason && reason.response) {
                    reason.response.data = imports.transformData(reason.response.data, reason.response.headers, config.transformResponse);
                }
            }
            return Promise.reject(reason);
        });
}
